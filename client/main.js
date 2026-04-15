const API_URL = 'http://localhost:5002/api';

// --- State ---
let currentUser = JSON.parse(localStorage.getItem('nuurUser') || 'null');
let currentRoleRegistration = 'student';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  updateNavUI();
  
  if (currentUser) {
    navigate('dashboard');
    populateDashboard();
  } else {
    navigate('home');
  }
});

// --- SPA Navigation ---
function navigate(viewId) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(`view-${viewId}`).classList.add('active');
}

function updateNavUI() {
  const authActions = document.getElementById('auth-actions');
  const userActions = document.getElementById('user-actions');
  const navDash = document.getElementById('nav-dashboard');
  const navCourses = document.getElementById('nav-courses');
  const userDisplay = document.getElementById('user-display');

  if (currentUser) {
    authActions.classList.add('hidden');
    userActions.classList.remove('hidden');
    navDash.classList.remove('hidden');
    navCourses.classList.remove('hidden');
    userDisplay.innerText = `[${currentUser.nuurId}] ${currentUser.username}`;
    
    // Admin specific nav
    if (currentUser.role === 'admin') navDash.innerText = 'Admin Panel';
  } else {
    authActions.classList.remove('hidden');
    userActions.classList.add('hidden');
    navDash.classList.add('hidden');
    navCourses.classList.add('hidden');
  }
}

function selectDashboard() {
  if (!currentUser) return navigate('login');
  if (currentUser.role === 'admin') navigate('admin');
  else navigate('dashboard');
}

// Ensure Dashboard nav triggers correct dashboard
document.getElementById('nav-dashboard').onclick = selectDashboard;

// --- Notification System ---
function showToast(message, type = 'success') {
  const container = document.getElementById('notification-area');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --- Auth System ---
function setRegistrationRole(role) {
  currentRoleRegistration = role;
  if (role === 'instructor') {
    document.getElementById('instructor-fields').classList.remove('hidden');
    document.getElementById('toggle-instructor').className = 'btn-neon';
    document.getElementById('toggle-student').className = 'btn-purple';
    document.getElementById('toggle-student').style.background = 'transparent';
    document.getElementById('toggle-instructor').style.background = 'var(--neon-cyan)';
    document.getElementById('toggle-instructor').style.color = '#000';
  } else {
    document.getElementById('instructor-fields').classList.add('hidden');
    document.getElementById('toggle-student').className = 'btn-neon';
    document.getElementById('toggle-instructor').className = 'btn-purple';
    document.getElementById('toggle-instructor').style.background = 'transparent';
    document.getElementById('toggle-student').style.background = 'var(--neon-cyan)';
    document.getElementById('toggle-student').style.color = '#000';
  }
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  if (password !== confirm) return showToast('Passwords do not match', 'error');

  const endpoint = currentRoleRegistration === 'instructor' ? '/auth/register-instructor' : '/auth/register-student';
  
  try {
    let response;
    
    if (currentRoleRegistration === 'instructor') {
      const formData = new FormData();
      formData.append('fullName', document.getElementById('reg-name').value);
      formData.append('username', document.getElementById('reg-username').value);
      formData.append('email', document.getElementById('reg-email').value);
      formData.append('phone', document.getElementById('reg-phone').value);
      formData.append('dob', document.getElementById('reg-dob').value);
      formData.append('password', password);
      formData.append('cvFile', document.getElementById('reg-cv').files[0]);
      formData.append('educationDoc', document.getElementById('reg-education').files[0]);

      response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: formData
      });
    } else {
      response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: document.getElementById('reg-name').value,
          username: document.getElementById('reg-username').value,
          email: document.getElementById('reg-email').value,
          phone: document.getElementById('reg-phone').value,
          dob: document.getElementById('reg-dob').value,
          password: password,
        })
      });
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Registration failed');

    showToast('Registration successful! Accessing Grid...');
    
    if (currentRoleRegistration === 'student') {
      loginUser(data); 
    } else {
      showToast('Instructors must await Admin approval before accessing dashboard.', 'success');
      setTimeout(() => navigate('login'), 2000);
    }
    
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Login failed');

    showToast('Login successful!');
    loginUser(data);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function loginUser(userData) {
  currentUser = userData;
  localStorage.setItem('nuurUser', JSON.stringify(userData));
  updateNavUI();
  selectDashboard();
  populateDashboard();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('nuurUser');
  updateNavUI();
  navigate('home');
  showToast('Logged out securely.');
}

// --- Dashboards Population ---
function populateDashboard() {
  const dashContent = document.getElementById('dashboard-content');
  const greeting = document.getElementById('dashboard-welcome');
  
  if (!currentUser) return;
  dashContent.innerHTML = '';
  
  greeting.innerText = `Welcome back, ${currentUser.fullName}. Connection Secure.`;

  if (currentUser.role === 'student') {
    dashContent.innerHTML = `
      <div class="card">
        <h3>Enrolled Courses</h3>
        <p>You are active in 0 modules.</p>
        <button class="btn-neon mt-2" onclick="navigate('courses')">View Catalog</button>
      </div>
      <div class="card">
        <h3>Certificates</h3>
        <p>0 Accreditations Earned.</p>
      </div>
    `;
  } else if (currentUser.role === 'instructor') {
    if (!currentUser.isApproved) {
      dashContent.innerHTML = `
        <div class="card" style="border-color: #ffcc00">
          <h3 style="color: #ffcc00">Pending Approval</h3>
          <p>Your instructor account is currently being reviewed by an Admin. Course creation is disabled.</p>
        </div>
      `;
    } else {
      dashContent.innerHTML = `
        <div class="card">
          <h3>My Modules</h3>
          <p>You have published 0 courses.</p>
          <button class="btn-neon mt-2">Initialize New Course</button>
        </div>
        <div class="card">
          <h3>Student Analytics</h3>
          <p>Data streams offline.</p>
        </div>
      `;
    }
  }
}

// --- Admin Controls ---
async function fetchAdminUsers() {
  if (!currentUser || currentUser.role !== 'admin') return;
  
  try {
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${currentUser.token}` }
    });
    const users = await res.json();
    
    let html = '';
    users.forEach(u => {
      html += `
      <div class="card">
        <h3>${u.fullName}</h3>
        <p>ID: ${u.nuurId || 'N/A'}</p>
        <p>Role: ${u.role}</p>
        <p>Email: ${u.email}</p>
      </div>`;
    });
    
    document.getElementById('admin-data-grid').innerHTML = html;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function fetchPendingInstructors() {
  if (!currentUser || currentUser.role !== 'admin') return;
  
  try {
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${currentUser.token}` }
    });
    let users = await res.json();
    users = users.filter(u => u.role === 'instructor' && !u.isApproved);
    
    if (users.length === 0) {
      document.getElementById('admin-data-grid').innerHTML = '<p>No pending approvals.</p>';
      return;
    }

    let html = '';
    users.forEach(u => {
      html += `
      <div class="card">
        <h3>${u.fullName}</h3>
        <p>Email: ${u.email}</p>
        <button class="btn-neon mt-2" onclick="approveInstructor('${u._id}')">Approve Access</button>
      </div>`;
    });
    
    document.getElementById('admin-data-grid').innerHTML = html;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function approveInstructor(id) {
  try {
    const res = await fetch(`${API_URL}/admin/instructors/${id}/approve`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${currentUser.token}` }
    });
    if (!res.ok) throw new Error('Approval failed');
    showToast('Instructor Access Granted.');
    fetchPendingInstructors();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
