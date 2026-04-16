// Removed API_URL explicitly since window.nuurAPI handles it

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

  // Bind lesson form submit since DOMContentLoaded is the outer wrapper here too
  const lessonForm = document.getElementById('add-lesson-form');
  if (lessonForm) {
    lessonForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const courseId = document.getElementById('lesson-course-id').value;
        const formData = new FormData();
        formData.append('title', document.getElementById('lesson-title').value);
        formData.append('content', document.getElementById('lesson-content').value);
        const vidUrl = document.getElementById('lesson-video-url').value;
        if (vidUrl) formData.append('videoUrl', vidUrl);
        const duration = document.getElementById('lesson-duration').value;
        if (duration) formData.append('duration', duration);
        
        const fileInput = document.getElementById('lesson-media');
        if (fileInput.files[0]) {
          formData.append('mediaFile', fileInput.files[0]);
        }

        await window.nuurAPI.instructor.addLesson(courseId, formData);
        showToast('Lesson uploaded successfully!');
        closeLessonModal();
        if (typeof loadInstructorCourses === 'function') loadInstructorCourses();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
});

// --- SPA Navigation ---
function navigate(viewId) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(`view-${viewId}`).classList.add('active');
  
  if (viewId === 'courses') {
    loadCourseCatalog();
  }
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
    
    // AI widget
    document.getElementById('ai-chat-toggle-btn').classList.remove('hidden');
  } else {
    authActions.classList.remove('hidden');
    userActions.classList.add('hidden');
    navDash.classList.add('hidden');
    navCourses.classList.add('hidden');
    
    // hide AI widget
    document.getElementById('ai-chat-toggle-btn').classList.add('hidden');
    document.getElementById('ai-chat-widget').classList.add('hidden');
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
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailVal = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  
  if (!emailRegex.test(emailVal)) return showToast('Invalid email format', 'error');
  if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');
  if (password !== confirm) return showToast('Passwords do not match', 'error');

  submitBtn.disabled = true;
  submitBtn.innerText = 'Processing...';

  try {
    let responseData;
    
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

      responseData = await window.nuurAPI.auth.registerInstructor(formData);

    } else {
      responseData = await window.nuurAPI.auth.registerStudent({
        fullName: document.getElementById('reg-name').value,
        username: document.getElementById('reg-username').value,
        email: document.getElementById('reg-email').value,
        phone: document.getElementById('reg-phone').value,
        dob: document.getElementById('reg-dob').value,
        password: password,
      });
    }

    showToast('Registration successful! Accessing Grid...');
    
    if (currentRoleRegistration === 'student') {
      loginUser(responseData); 
    } else {
      showToast('Instructors must await Admin approval before accessing dashboard.', 'success');
      setTimeout(() => navigate('login'), 2000);
    }
    
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Sign Up';
  }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Authenticating...';

  try {
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;

    const data = await window.nuurAPI.auth.login(identifier, password);

    showToast('Login successful!');
    loginUser(data);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Sign In';
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
        <div class="card" id="instructor-modules-card">
          <h3>My Modules</h3>
          <p>Loading your courses...</p>
        </div>
        <div class="card">
          <h3>Initialize New Course</h3>
          <form id="create-course-form" style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
            <input type="text" id="course-title" placeholder="Course Title" required class="full-width" style="padding:0.5rem; background:#000; border:1px solid var(--neon-cyan); color:#fff;">
            <textarea id="course-desc" placeholder="Course Description" required class="full-width" style="padding:0.5rem; background:#000; border:1px solid var(--neon-cyan); color:#fff;"></textarea>
            <input type="text" id="course-tags" placeholder="Tags (comma separated)" class="full-width" style="padding:0.5rem; background:#000; border:1px solid var(--neon-cyan); color:#fff;">
            <button type="submit" class="btn-neon mt-2">Initialize Course</button>
          </form>
        </div>
      `;
      
      // Fetch and Display Courses
      loadInstructorCourses();

      // Course Creation Handler
      document.getElementById('create-course-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const title = document.getElementById('course-title').value;
          const description = document.getElementById('course-desc').value;
          const tags = document.getElementById('course-tags').value.split(',').map(t => t.trim());
          await window.nuurAPI.instructor.createCourse({ title, description, tags, isPublished: true });
          showToast('Course Created Successfully!');
          loadInstructorCourses();
        } catch(err) {
          showToast(err.message, 'error');
        }
      });
    }
  }
}

// --- Instructor Specific Logic ---
async function loadInstructorCourses() {
  const card = document.getElementById('instructor-modules-card');
  if (!card) return;
  card.innerHTML = `<h3>My Modules</h3><div class="spinner"></div>`;
  try {
    const courses = await window.nuurAPI.instructor.getMyCourses();
    const listHtml = courses.length ? courses.map(c => `
      <div style="border-top:1px solid rgba(0,243,255,0.2); padding-top:15px; margin-top:15px;">
        <h4 style="color:var(--neon-purple);">${c.title}</h4>
        <p style="font-size: 0.8rem; color: var(--text-muted);">${c.lessons.length} lessons</p>
        <button class="btn-purple" style="font-size:0.7rem; padding:0.4rem 0.8rem; margin-top:10px;" onclick="showAddLessonModal('${c._id}')">Add Lesson</button>
      </div>
    `).join('') : '<div class="empty-state">No modules initialized. Publish your first course today!</div>';
    card.innerHTML = `<h3>My Modules</h3>${listHtml}`;
  } catch(err) {
    card.innerHTML = `<h3>My Modules</h3><p style="color:#ff3366">Error loading courses: ${err.message}</p>`;
  }
}

function showAddLessonModal(courseId) {
  document.getElementById('lesson-course-id').value = courseId;
  document.getElementById('add-lesson-form').reset();
  document.getElementById('add-lesson-modal').classList.add('visible');
}

function closeLessonModal() {
  document.getElementById('add-lesson-modal').classList.remove('visible');
}

// Global scope registration due to inline onclick bindings
window.showAddLessonModal = showAddLessonModal;
window.closeLessonModal = closeLessonModal;

// --- Student & Course Logic ---
let currentViewingCourse = null;

async function loadCourseCatalog() {
  const grid = document.getElementById('courses-grid');
  grid.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';
  try {
    const courses = await window.nuurAPI.course.getAll();
    if (courses.length === 0) {
      grid.innerHTML = '<div class="empty-state"><h3>Nothing here yet</h3><p>The network administrators have not published any courses.</p></div>';
      return;
    }

    let html = '';
    courses.forEach(c => {
      html += `
        <div class="card">
          <h3 style="color:var(--neon-cyan)">${c.title}</h3>
          <p style="margin-bottom:1rem">${c.description}</p>
          <p style="font-size:0.8rem; color: #888;">Instructor: ${c.instructor ? c.instructor.fullName : 'Unknown'} | Lessons: ${c.lessons ? c.lessons.length : 0}</p>
          <button class="btn-neon mt-2" onclick='openCoursePlayer(${JSON.stringify(c).replace(/'/g, "&apos;")})'>Access Course</button>
        </div>
      `;
    });
    grid.innerHTML = html;
    
    // Update dashboard counter if student
    if (currentUser && currentUser.role === 'student') {
      const dbWelcome = document.getElementById('dashboard-content');
      if (dbWelcome && dbWelcome.innerHTML.includes('Enrolled Courses')) {
         const pTag = dbWelcome.querySelector('.card p');
         if (pTag) {
            pTag.innerText = `You are active in ${courses.length} modules.`;
         }
      }
    }
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="border-color:#ff3366; color:#ff3366;">Error: ${err.message}</div>`;
  }
}

function openCoursePlayer(course) {
  currentViewingCourse = course;
  navigate('lesson-player');
  
  document.getElementById('player-course-title').innerText = course.title;
  document.getElementById('player-lesson-title').innerText = 'Select a module to begin';
  document.getElementById('player-video-container').innerHTML = '<span style="color: var(--text-muted)">Awaiting Selection</span>';
  document.getElementById('player-text-content').innerHTML = course.description;
  
  const listEl = document.getElementById('player-lesson-list');
  if (!course.lessons || course.lessons.length === 0) {
    listEl.innerHTML = '<li>No modules initialized yet.</li>';
    return;
  }
  
  listEl.innerHTML = course.lessons.map((lesson, idx) => `
    <li>
      <button class="btn-purple full-width" style="text-align:left;" onclick="loadLesson(${idx})">
        ${idx + 1}. ${lesson.title}
      </button>
    </li>
  `).join('');
}

function loadLesson(index) {
  if (!currentViewingCourse) return;
  const lesson = currentViewingCourse.lessons[index];
  document.getElementById('player-lesson-title').innerText = lesson.title;
  
  // Render Video or Media
  const vidContainer = document.getElementById('player-video-container');
  if (lesson.videoUrl && (lesson.videoUrl.includes('youtube') || lesson.videoUrl.includes('youtu.be'))) {
      const ytId = lesson.videoUrl.split('v=')[1] || lesson.videoUrl.split('/').pop();
      vidContainer.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${ytId}" frameborder="0" allowfullscreen></iframe>`;
  } else if (lesson.videoUrl) {
      if (lesson.videoUrl.endsWith('.pdf')) {
          vidContainer.innerHTML = `<iframe width="100%" height="100%" src="${lesson.videoUrl}"></iframe>`;
      } else {
          vidContainer.innerHTML = `<video width="100%" height="100%" controls><source src="${lesson.videoUrl}" type="video/mp4">Your browser does not support video.</video>`;
      }
  } else {
      vidContainer.innerHTML = '<span style="color: var(--text-muted)">No media attached to this module.</span>';
  }
  
  document.getElementById('player-text-content').innerHTML = lesson.content || 'No text content available.';
}

// Global binds
window.openCoursePlayer = openCoursePlayer;
window.loadLesson = loadLesson;

// --- AI Chat Logic ---
let isAIChatOpen = false;

function toggleAIChat() {
   const widget = document.getElementById('ai-chat-widget');
   const btn = document.getElementById('ai-chat-toggle-btn');
   if (isAIChatOpen) {
      widget.classList.add('hidden');
      btn.style.display = 'flex';
   } else {
      widget.classList.remove('hidden');
      btn.style.display = 'none';
   }
   isAIChatOpen = !isAIChatOpen;
}

function handleAIChatKeyPress(e) {
  if (e.key === 'Enter') sendAIChat();
}

async function sendAIChat() {
  const input = document.getElementById('ai-chat-input');
  const message = input.value.trim();
  if(!message) return;
  
  const historyBox = document.getElementById('ai-chat-history');
  
  historyBox.innerHTML += `<div style="align-self:flex-end; background:var(--neon-purple); color:#fff; padding:8px; border-radius:8px; max-width:80%;">User: ${message}</div>`;
  input.value = '';
  historyBox.scrollTop = historyBox.scrollHeight;
  
  try {
     const topic = currentViewingCourse ? currentViewingCourse.title : 'General Tutoring';
     const resData = await window.nuurAPI.ai.chat(message, topic);
     
     const responseText = resData.response || "No response received.";
     const contextText = resData.ragContextUsed ? ' <small style="color:#0f0;">*(Context Applied)*</small>' : '';
     
     historyBox.innerHTML += `<div style="align-self:flex-start; background:#333; color:var(--neon-cyan); padding:8px; border-radius:8px; max-width:80%;">AI: ${responseText}${contextText}</div>`;
  } catch (err) {
     historyBox.innerHTML += `<div style="align-self:flex-start; background:#ff3366; color:#fff; padding:8px; border-radius:8px; max-width:80%;">System Error: ${err.message}</div>`;
  }
  historyBox.scrollTop = historyBox.scrollHeight;
}

window.toggleAIChat = toggleAIChat;
window.handleAIChatKeyPress = handleAIChatKeyPress;
window.sendAIChat = sendAIChat;
async function fetchAdminUsers() {
  if (!currentUser || currentUser.role !== 'admin') return;
  
  try {
    const users = await window.nuurAPI.admin.getUsers();
    
    let html = '<table class="admin-table"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>';
    users.forEach(u => {
      const statusStr = u.role === 'instructor' ? (u.isApproved ? '<span style="color:#0f0">Approved</span>' : '<span style="color:#ffcc00">Pending</span>') : '-';
      html += `
      <tr>
        <td style="font-family: var(--font-mono); font-size:0.8rem;">${u.nuurId || 'N/A'}</td>
        <td>${u.fullName}</td>
        <td>${u.email}</td>
        <td style="text-transform:capitalize; color:var(--neon-purple); font-weight:bold;">${u.role}</td>
        <td>${statusStr}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    
    document.getElementById('admin-data-grid').innerHTML = html;
    document.getElementById('admin-data-grid').className = ""; // Remove grid class so it spans full width
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function fetchPendingInstructors() {
  if (!currentUser || currentUser.role !== 'admin') return;
  
  try {
    const allUsers = await window.nuurAPI.admin.getUsers();
    const pendingUsers = allUsers.filter(u => u.role === 'instructor' && !u.isApproved);
    
    if (pendingUsers.length === 0) {
      document.getElementById('admin-data-grid').innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-muted); background:var(--bg-panel); border-radius:8px;">No pending instructor approvals.</div>';
      return;
    }

    let html = '<table class="admin-table"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Action</th></tr></thead><tbody>';
    pendingUsers.forEach(u => {
      html += `
      <tr>
        <td style="font-family: var(--font-mono); font-size:0.8rem;">${u.nuurId || 'N/A'}</td>
        <td>${u.fullName}</td>
        <td>${u.email}</td>
        <td>
          <button class="btn-neon" style="padding:0.4rem 1rem; font-size:0.8rem;" onclick="approveInstructor('${u._id}')">Approve Access</button>
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
    
    document.getElementById('admin-data-grid').innerHTML = html;
    document.getElementById('admin-data-grid').className = ""; // Remove grid class
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function approveInstructor(id) {
  try {
    await window.nuurAPI.admin.approveInstructor(id);
    showToast('Instructor Access Granted.', 'success');
    fetchPendingInstructors(); // Refresh the list
  } catch (err) {
    showToast(err.message, 'error');
  }
}
