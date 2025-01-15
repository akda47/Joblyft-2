// Firebase Configuration
const firebaseConfig = {
    // Add your Firebase config here
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Page Navigation
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').substring(1);
        showPage(targetId);
    });
});

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// Elevator Animation
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const elevator = document.querySelector('.elevator');
        elevator.classList.add('open');
    }, 1000);
});

// Job Search Functionality
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');

searchButton.addEventListener('click', () => {
    const searchTerm = searchInput.value.toLowerCase();
    const location = document.getElementById('locationFilter').value;
    const jobType = document.getElementById('typeFilter').value;
    const industry = document.getElementById('industryFilter').value;
    
    searchJobs(searchTerm, location, jobType, industry);
});

async function searchJobs(searchTerm, location, jobType, industry) {
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
        showModal('Error searching jobs: ' + error.message);
    }
}

// Job Posting Functionality
const jobPostForm = document.getElementById('jobPostForm');

jobPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        companyName: e.target[0].value,
        jobTitle: e.target[1].value,
        description: e.target[2].value,
        qualifications: e.target[3].value,
        salary: e.target[4].value,
        contactEmail: e.target[5].value,
        status: 'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('jobs').add(formData);
        showModal('Job posting submitted successfully! It will be reviewed by our team.');
        jobPostForm.reset();
    } catch (error) {
        showModal('Error submitting job posting: ' + error.message);
    }
});

// Dashboard Functionality
function loadEmployerDashboard() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const status = tab.dataset.tab;
            loadJobs(status);
        });
    });
}

async function loadJobs(status) {
    try {
        const snapshot = await db.collection('jobs')
            .where('status', '==', status)
            .orderBy('timestamp', 'desc')
            .get();
            
        displayJobs(snapshot);
    } catch (error) {
        showModal('Error loading jobs: ' + error.message);
    }
}

// Modal Functionality
function showModal(message) {
    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modal-message');
    modalMessage.textContent = message;
    modal.style.display = 'block';
}

document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('modal').style.display = 'none';
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadEmployerDashboard();
});
