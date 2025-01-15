const firebaseConfig = {
    // Add your Firebase config here
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Authentication State Observer
auth.onAuthStateChanged((user) => {
    const dashboardLink = document.getElementById('dashboardLink');
    const loginBtn = document.getElementById('loginBtn');
    
    if (user) {
        // User is signed in
        dashboardLink.style.display = 'inline-block';
        loginBtn.textContent = 'Logout';
        loginBtn.onclick = () => auth.signOut();
    } else {
        // User is signed out
        dashboardLink.style.display = 'none';
        loginBtn.textContent = 'Login';
        loginBtn.onclick = showLoginModal;
    }
});

// Elevator Animation
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const leftDoor = document.querySelector('.door.left');
        const rightDoor = document.querySelector('.door.right');
        
        // Open elevator doors
        if (leftDoor && rightDoor) {
            leftDoor.style.transform = 'translateX(-100%)';
            rightDoor.style.transform = 'translateX(100%)';
        }
    }, 1000);
});

// Job Search Functionality
function searchJobs(query) {
    const jobsRef = db.collection('jobs');
    
    return jobsRef
        .where('status', '==', 'approved')
        .where('keywords', 'array-contains-any', query.toLowerCase().split(' '))
        .get()
        .then((snapshot) => {
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        });
}

// Job Posting Functionality
async function submitJobPosting(jobData) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Must be logged in to post jobs');

        const jobRef = await db.collection('jobs').add({
            ...jobData,
            employerId: user.uid,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return jobRef.id;
    } catch (error) {
        console.error('Error submitting job posting:', error);
        throw error;
    }
}

// Login Modal
function showLoginModal() {
    // Implement login modal UI
    console.log('Show login modal');
}

// Student Application Submission
async function submitApplication(jobId, applicationData) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Must be logged in to apply');

        const applicationRef = await db.collection('applications').add({
            jobId,
            studentId: user.uid,
            status: 'pending',
            ...applicationData,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return applicationRef.id;
    } catch (error) {
        console.error('Error submitting application:', error);
        throw error;
    }
}
// admin-dashboard.js
class AdminDashboard {
    constructor() {
        this.db = firebase.firestore();
        this.currentFilters = {
            status: 'pending',
            dateRange: '7days'
        };
        this.jobsPerPage = 10;
        this.lastVisible = null;
    }

    async initializeDashboard() {
        this.setupEventListeners();
        await this.loadPendingJobs();
        this.initializeStatistics();
    }

    setupEventListeners() {
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.loadPendingJobs(true);
        });

        document.getElementById('loadMore').addEventListener('click', () => {
            this.loadPendingJobs(false);
        });
    }

    async loadPendingJobs(resetPagination = true) {
        if (resetPagination) {
            this.lastVisible = null;
        }

        let query = this.db.collection('jobs')
            .where('status', '==', this.currentFilters.status)
            .orderBy('createdAt', 'desc')
            .limit(this.jobsPerPage);

        if (this.lastVisible) {
            query = query.startAfter(this.lastVisible);
        }

        const snapshot = await query.get();
        
        if (snapshot.empty && resetPagination) {
            document.getElementById('jobsList').innerHTML = '<p>No jobs found</p>';
            return;
        }

        this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
        const jobsHtml = snapshot.docs.map(doc => this.createJobCard(doc)).join('');

        if (resetPagination) {
            document.getElementById('jobsList').innerHTML = jobsHtml;
        } else {
            document.getElementById('jobsList').insertAdjacentHTML('beforeend', jobsHtml);
        }

        document.getElementById('loadMore').style.display = 
            snapshot.docs.length < this.jobsPerPage ? 'none' : 'block';
    }

    createJobCard(doc) {
        const job = doc.data();
        return `
            <div class="job-card" data-id="${doc.id}">
                <div class="job-header">
                    <h3>${job.title}</h3>
                    <span class="company">${job.company}</span>
                </div>
                <div class="job-details">
                    <p>${job.description.substring(0, 150)}...</p>
                    <div class="metadata">
                        <span>Posted: ${this.formatDate(job.createdAt)}</span>
                        <span>Location: ${job.location}</span>
                    </div>
                </div>
                <div class="action-buttons">
                    <button onclick="adminDashboard.reviewJob('${doc.id}', true)">
                        Approve
                    </button>
                    <button onclick="adminDashboard.reviewJob('${doc.id}', false)" class="reject">
                        Reject
                    </button>
                    <button onclick="adminDashboard.viewDetails('${doc.id}')" class="details">
                        View Details
                    </button>
                </div>
            </div>
        `;
    }

    async reviewJob(jobId, isApproved) {
        try {
            await this.db.collection('jobs').doc(jobId).update({
                status: isApproved ? 'approved' : 'rejected',
                reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
                reviewedBy: firebase.auth().currentUser.uid
            });

            // Send notification to employer
            await this.notifyEmployer(jobId, isApproved);
            
            // Remove the card with animation
            const card = document.querySelector(`[data-id="${jobId}"]`);
            card.classList.add('fade-out');
            setTimeout(() => card.remove(), 500);
            
            this.updateStatistics();
        } catch (error) {
            console.error('Error reviewing job:', error);
            alert('Error reviewing job posting. Please try again.');
        }
    }

    async notifyEmployer(jobId, isApproved) {
        const jobDoc = await this.db.collection('jobs').doc(jobId).get();
        const job = jobDoc.data();
        
        await this.db.collection('notifications').add({
            userId: job.employerId,
            jobId: jobId,
            type: 'job_review',
            message: `Your job posting "${job.title}" has been ${isApproved ? 'approved' : 'rejected'}.`,
            status: 'unread',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    async viewDetails(jobId) {
        const jobDoc = await this.db.collection('jobs').doc(jobId).get();
        const job = jobDoc.data();
        
        const applicationsSnapshot = await this.db.collection('applications')
            .where('jobId', '==', jobId)
            .get();

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>${job.title}</h2>
                <div class="job-full-details">
                    <p><strong>Company:</strong> ${job.company}</p>
                    <p><strong>Location:</strong> ${job.location}</p>
                    <p><strong>Salary Range:</strong> ${job.salaryRange}</p>
                    <p><strong>Description:</strong></p>
                    <p>${job.description}</p>
                    <p><strong>Requirements:</strong></p>
                    <ul>
                        ${job.requirements.map(req => `<li>${req}</li>`).join('')}
                    </ul>
                </div>
                <div class="applications-section">
                    <h3>Applications (${applicationsSnapshot.size})</h3>
                    ${this.renderApplicationsList(applicationsSnapshot.docs)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelector('.close').onclick = () => modal.remove();
    }

    renderApplicationsList(applications) {
        if (applications.length === 0) return '<p>No applications yet</p>';
        
        return applications.map(app => {
            const data = app.data();
            return `
                <div class="application-item">
                    <p><strong>Applicant:</strong> ${data.studentName}</p>
                    <p><strong>Status:</strong> ${data.status}</p>
                    <p><strong>Applied:</strong> ${this.formatDate(data.submittedAt)}</p>
                    <button onclick="adminDashboard.viewApplication('${app.id}')">
                        View Application
                    </button>
                </div>
            `;
        }).join('');
    }

    async initializeStatistics() {
        const stats = await this.calculateStatistics();
        this.updateStatisticsDisplay(stats);
    }

    async calculateStatistics() {
        const snapshot = await this.db.collection('jobs').get();
        const stats = {
            total: 0,
            approved: 0,
            rejected: 0,
            pending: 0
        };

        snapshot.forEach(doc => {
            stats.total++;
            stats[doc.data().status]++;
        });

        return stats;
    }

    updateStatisticsDisplay(stats) {
        const statsContainer = document.getElementById('dashboardStats');
        statsContainer.innerHTML = `
            <div class="stat-card">
                <h4>Total Jobs</h4>
                <p>${stats.total}</p>
            </div>
            <div class="stat-card">
                <h4>Pending Review</h4>
                <p>${stats.pending}</p>
            </div>
            <div class="stat-card">
                <h4>Approved</h4>
                <p>${stats.approved}</p>
            </div>
            <div class="stat-card">
                <h4>Rejected</h4>
                <p>${stats.rejected}</p>
            </div>
        `;
    }

    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
}

// Initialize the dashboard
const adminDashboard = new AdminDashboard();
document.addEventListener('DOMContentLoaded', () => adminDashboard.initializeDashboard());
