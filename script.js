// Firebase Configuration
const firebaseConfig = {
    // Add your Firebase config here
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Enhanced Page Navigation
function navigateToMain() {
    document.getElementById('elevatorContainer').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    showPage('jobSearch'); // Default to job search page
}

function showPage(pageId) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    loadingSpinner.style.display = 'block';
    
    document.querySelectorAll('.section').forEach(page => {
        page.style.display = 'none';
    });
    
    document.getElementById(pageId).style.display = 'block';
    loadingSpinner.style.display = 'none';
}

// Elevator Animation
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const elevator = document.querySelector('.elevator');
        elevator.classList.add('open');
    }, 1000);
});

// Enhanced Job Search Functionality
const jobSearchBar = document.getElementById('jobSearchBar');
let searchTimeout;

jobSearchBar.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const searchTerm = e.target.value.toLowerCase();
        const location = document.getElementById('locationFilter').value;
        const jobType = document.getElementById('typeFilter').value;
        const industry = document.getElementById('industryFilter').value;
        
        searchJobs(searchTerm, location, jobType, industry);
    }, 300); // Debounce search
});

async function searchJobs(searchTerm, location, jobType, industry) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    loadingSpinner.style.display = 'block';
    
    try {
        const jobsRef = db.collection('jobs');
        let query = jobsRef.where('status', '==', 'approved');
        
        // Add filters
        if (location) query = query.where('location', '==', location);
        if (jobType) query = query.where('type', '==', jobType);
        if (industry) query = query.where('industry', '==', industry);
        
        const snapshot = await query.get();
        displayJobs(snapshot);
    } catch (error) {
        showModal('Error', 'An error occurred while searching jobs. Please try again.');
        console.error('Search error:', error);
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Enhanced Job Posting Functionality
const jobPostForm = document.getElementById('jobPostForm');

function validateForm(formData) {
    const errors = [];
    
    if (!formData.companyName.trim()) errors.push('Company name is required');
    if (!formData.jobTitle.trim()) errors.push('Job title is required');
    if (!formData.description.trim()) errors.push('Job description is required');
    if (!formData.contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.push('Valid email address is required');
    }
    
    return errors;
}

jobPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Check if user is logged in and is an employer
    const user = auth.currentUser;
    if (!user) {
        showModal('Error', 'Please log in to post a job');
        return;
    }

    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'employer') {
        showModal('Error', 'Only employers can post jobs');
        return;
    }

    const loadingSpinner = document.getElementById('loadingSpinner');
    const formData = {
        companyName: document.getElementById('companyName').value,
        jobTitle: document.getElementById('jobTitle').value,
        description: document.getElementById('jobDescription').value,
        qualifications: document.getElementById('qualifications').value,
        salary: document.getElementById('salary').value,
        contactEmail: document.getElementById('contactEmail').value,
        employerId: user.uid,
        status: 'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const errors = validateForm(formData);
    if (errors.length > 0) {
        showModal('Form Validation', errors.join('\n'));
        return;
    }
    
    loadingSpinner.style.display = 'block';
    
    try {
        await db.collection('jobs').add(formData);
        showModal('Success', 'Job posting submitted successfully! It will be reviewed by our team.');
        jobPostForm.reset();
    } catch (error) {
        showModal('Error', 'Failed to submit job posting. Please try again.');
        console.error('Submission error:', error);
    } finally {
        loadingSpinner.style.display = 'none';
    }
});

// Enhanced Modal Functionality
function showModal(title, message) {
    const modal = document.getElementById('confirmationModal');
    const modalTitle = modal.querySelector('#modalTitle');
    const modalMessage = modal.querySelector('#modalMessage');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.style.display = 'block';
}

document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('confirmationModal').style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('confirmationModal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Enhanced Dashboard Functionality
function loadEmployerDashboard() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            loadingSpinner.style.display = 'block';
            const status = tab.dataset.tab;
            loadJobs(status);
        });
    });
}

async function loadJobs(status) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    try {
        const snapshot = await db.collection('jobs')
            .where('status', '==', status)
            .orderBy('timestamp', 'desc')
            .limit(20) // Pagination
            .get();
            
        displayJobs(snapshot);
    } catch (error) {
        showModal('Error', 'Failed to load jobs. Please try again.');
        console.error('Loading error:', error);
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Add real-time job updates
function setupJobListeners() {
    const jobListings = document.getElementById('jobListings');
    
    // Listen for real-time updates to jobs
    db.collection('jobs')
        .where('status', '==', 'approved')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    // Add new job card with animation
                    const jobCard = createJobCard(change.doc);
                    jobCard.classList.add('fade-in');
                    jobListings.prepend(jobCard);
                } else if (change.type === 'modified') {
                    // Update existing job card
                    const jobCard = document.querySelector(`[data-job-id="${change.doc.id}"]`);
                    if (jobCard) {
                        const newJobCard = createJobCard(change.doc);
                        jobCard.replaceWith(newJobCard);
                    }
                } else if (change.type === 'removed') {
                    // Remove job card with animation
                    const jobCard = document.querySelector(`[data-job-id="${change.doc.id}"]`);
                    if (jobCard) {
                        jobCard.classList.add('fade-out');
                        setTimeout(() => jobCard.remove(), 300);
                    }
                }
            });
        });
}

// Enhanced job card creation
function createJobCard(doc) {
    const job = doc.data();
    const jobCard = document.createElement('div');
    jobCard.className = 'job-card';
    jobCard.dataset.jobId = doc.id;
    
    jobCard.innerHTML = `
        <div class="job-card-header">
            <h3 class="job-title">${job.jobTitle}</h3>
            <span class="job-company">${job.companyName}</span>
        </div>
        <div class="job-details">
            ${job.salary ? `
                <div class="job-detail-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>${job.salary}</span>
                </div>
            ` : ''}
            ${job.location ? `
                <div class="job-detail-item">
                    <i class="fas fa-location-dot"></i>
                    <span>${job.location}</span>
                </div>
            ` : ''}
            ${job.type ? `
                <div class="job-detail-item">
                    <i class="fas fa-briefcase"></i>
                    <span>${job.type}</span>
                </div>
            ` : ''}
        </div>
        <div class="job-description">${job.description}</div>
        <div class="job-actions">
            ${auth.currentUser ? `
                <button class="apply-btn" onclick="applyForJob('${doc.id}')">
                    Apply Now
                </button>
            ` : `
                <button class="login-btn" onclick="handleAuth()">
                    Login to Apply
                </button>
            `}
            <button class="share-btn" onclick="shareJob('${doc.id}')">
                <i class="fas fa-share"></i> Share
            </button>
        </div>
    `;
    
    return jobCard;
}

// Add job sharing functionality
async function shareJob(jobId) {
    try {
        const jobDoc = await db.collection('jobs').doc(jobId).get();
        const job = jobDoc.data();
        
        if (navigator.share) {
            await navigator.share({
                title: `${job.jobTitle} at ${job.companyName}`,
                text: `Check out this job opportunity: ${job.jobTitle} at ${job.companyName}`,
                url: `${window.location.origin}/job/${jobId}`
            });
        } else {
            // Fallback for browsers that don't support Web Share API
            const shareUrl = `${window.location.origin}/job/${jobId}`;
            showModal('Share Job', `
                <div class="share-options">
                    <input type="text" value="${shareUrl}" readonly onclick="this.select()">
                    <button onclick="navigator.clipboard.writeText('${shareUrl}')">
                        Copy Link
                    </button>
                </div>
            `);
        }
    } catch (error) {
        console.error('Error sharing job:', error);
    }
}

// Add these styles to your CSS file
const newStyles = `
    /* Job Card Animations */
    .fade-in {
        animation: fadeIn 0.3s ease-in;
    }

    .fade-out {
        animation: fadeOut 0.3s ease-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }

    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(20px); }
    }

    /* Share Options */
    .share-options {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
    }

    .share-options input {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
    }

    .share-btn {
        padding: 0.5rem 1rem;
        background-color: var(--secondary-color);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    .share-btn:hover {
        background-color: var(--primary-color);
    }

    /* Enhanced Job Card Styling */
    .job-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .job-company {
        color: var(--primary-color);
        font-weight: 600;
    }

    .job-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
    }

    .login-btn {
        padding: 0.75rem 1.5rem;
        background-color: var(--secondary-color);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s;
    }

    .login-btn:hover {
        background-color: var(--primary-color);
        transform: translateY(-2px);
    }
`;

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupJobListeners();
    
    // Add the new styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = newStyles;
    document.head.appendChild(styleSheet);
    
    // Show elevator animation
    setTimeout(() => {
        const elevator = document.querySelector('.elevator');
        elevator.classList.add('open');
    }, 1000);
});

