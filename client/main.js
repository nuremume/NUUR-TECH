// main.js
import { authAPI, aiAPI, progressAPI } from './api.js';

// --- Global State --- //
let currentUser = null;
const state = {
  chatHistoryId: null,
  isRecording: false
};

// --- DOM Elements --- //
const els = {
  authModal: document.getElementById('auth-modal'),
  appWrapper: document.getElementById('app-wrapper'),
  tabs: document.querySelectorAll('.tab'),
  loginForm: document.getElementById('login-form'),
  regForm: document.getElementById('register-form'),
  navLinks: document.querySelectorAll('.nav-links li'),
  views: document.querySelectorAll('.view'),
  userNameDisplay: document.getElementById('user-name-display'),
  userRoleDisplay: document.getElementById('user-role-display'),
  logoutBtn: document.getElementById('logout-btn'),
  
  // Chat
  chatMessages: document.getElementById('chat-messages'),
  chatInput: document.getElementById('chat-input'),
  sendBtn: document.getElementById('send-btn'),
  voiceBtn: document.getElementById('voice-btn'),
  chatTopic: document.getElementById('chat-topic'),
  
  // Quiz
  generateQuizBtn: document.getElementById('generate-quiz-btn'),
  quizTopicInput: document.getElementById('quiz-topic-input'),
  quizDifficulty: document.getElementById('quiz-difficulty'),
  quizActiveArea: document.getElementById('quiz-active-area'),
  
  // Summary
  summaryInput: document.getElementById('summary-input'),
  summarizeBtn: document.getElementById('summarize-btn'),
  summaryResult: document.getElementById('summary-result'),
  
  // Dashboard
  dashPoints: document.getElementById('dash-points'),
  dashStreak: document.getElementById('dash-streak'),
  dashLessons: document.getElementById('dash-lessons'),
  recentQuizzesList: document.getElementById('recent-quizzes-list'),
  badgesContainer: document.getElementById('badges-container'),
  
  // Toast
  toastContainer: document.getElementById('toast-container')
};

// --- Utilities --- //
function showToast(message, isError = false) {
  const t = document.createElement('div');
  t.style.padding = '1rem';
  t.style.background = isError ? '#ef4444' : '#10b981';
  t.style.color = 'white';
  t.style.borderRadius = '8px';
  t.style.marginBottom = '0.5rem';
  t.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  t.textContent = message;
  
  els.toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// --- View Navigation --- //
function switchView(viewName) {
  els.navLinks.forEach(l => l.classList.remove('active'));
  const activeLink = Array.from(els.navLinks).find(l => l.dataset.view === viewName);
  if (activeLink) activeLink.classList.add('active');
  
  els.views.forEach(v => {
    v.classList.remove('active');
    v.classList.add('hidden');
  });
  
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.remove('hidden');
    setTimeout(() => targetView.classList.add('active'), 10);
  }
  
  if (viewName === 'dashboard') loadDashboard();
}

els.navLinks.forEach(link => {
  link.addEventListener('click', () => {
    switchView(link.dataset.view);
  });
});

// --- Auth Handling --- //
document.getElementById('tab-login').addEventListener('click', () => {
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-register').classList.remove('active');
  document.getElementById('login-form').classList.add('active');
  document.getElementById('register-form').classList.remove('active');
});

document.getElementById('tab-register').addEventListener('click', () => {
  document.getElementById('tab-register').classList.add('active');
  document.getElementById('tab-login').classList.remove('active');
  document.getElementById('register-form').classList.add('active');
  document.getElementById('login-form').classList.remove('active');
});

async function checkSession() {
  try {
    const user = await authAPI.me();
    currentUser = user;
    finishAuth();
  } catch (err) {
    // If not logged in, show the Home page as Guest
    switchView('home');
    els.appWrapper.classList.remove('hidden');
    els.authModal.classList.add('hidden');
  }
}

els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const eInput = document.getElementById('login-email').value;
  const pInput = document.getElementById('login-password').value;
  
  try {
    const data = await authAPI.login(eInput, pInput);
    localStorage.setItem('token', data.token);
    currentUser = data.user;
    finishAuth();
  } catch (err) {
    showToast(err.message, true);
  }
});

els.regForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const n = document.getElementById('reg-name').value;
  const eInput = document.getElementById('reg-email').value;
  const p = document.getElementById('reg-password').value;
  const r = document.getElementById('reg-role').value;
  
  try {
    const data = await authAPI.register(n, eInput, p, r);
    localStorage.setItem('token', data.token);
    currentUser = data.user;
    finishAuth();
  } catch (err) {
    showToast(err.message, true);
  }
});

els.logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  currentUser = null;
  window.location.reload();
});

function finishAuth() {
  els.authModal.classList.remove('show');
  els.authModal.classList.add('hidden');
  els.appWrapper.classList.remove('hidden');
  
  els.userNameDisplay.textContent = currentUser.name;
  els.userRoleDisplay.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
  
  // Inject Dynamic Nav
  const navContainer = document.getElementById('dynamic-nav');
  if (currentUser.role === 'admin') {
    navContainer.innerHTML = `<li data-view="admin-dashboard"><i class="fa-solid fa-shield-halved"></i> <span>Admin Portal</span></li>`;
  } else if (currentUser.role === 'instructor') {
    navContainer.innerHTML = `<li data-view="instructor-dashboard"><i class="fa-solid fa-chalkboard-user"></i> <span>Instructor Dashboard</span></li>`;
  } else {
    navContainer.innerHTML = `<li data-view="student-dashboard"><i class="fa-solid fa-user-graduate"></i> <span>Student Dashboard</span></li>`;
  }
  
  // Re-bind dynamic nav links
  const dynamicLinks = navContainer.querySelectorAll('li');
  dynamicLinks.forEach(link => {
    link.addEventListener('click', () => {
      els.navLinks.forEach(l => l.classList.remove('active'));
      dynamicLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      els.views.forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden');
      });
      
      const targetView = document.getElementById(`view-${link.dataset.view}`);
      if (targetView) {
        targetView.classList.remove('hidden');
        setTimeout(() => targetView.classList.add('active'), 10);
      }
      
      loadDashboard();
    });
  });

  // Default view after login
  switchView('dashboard');

  // Init Live Room
  initLiveRoom(currentUser);
}

// Init
checkSession();

// --- Chat Integration --- //
import { adminAPI, instructorAPI } from './api.js';

function appendMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  const icon = role === 'user' ? 'fa-user' : 'fa-robot';
  div.innerHTML = `
    <div class="avatar"><i class="fa-solid ${icon}"></i></div>
    <div class="bubble">${content}</div>
  `;
  els.chatMessages.appendChild(div);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

async function handleChatSubmit() {
  const val = els.chatInput.value.trim();
  if (!val) return;
  
  appendMessage('user', val);
  els.chatInput.value = '';
  
  try {
    const topic = els.chatTopic.value;
    const res = await aiAPI.chat(val, topic);
    appendMessage('assistant', res.response);
  } catch (err) {
    showToast('Failed to get response', true);
  }
}

els.sendBtn.addEventListener('click', handleChatSubmit);
els.chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleChatSubmit();
  }
});

// --- Speech API --- //
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.onstart = () => { state.isRecording = true; els.voiceBtn.classList.add('recording'); };
  recognition.onresult = (e) => { els.chatInput.value += e.results[0][0].transcript; handleChatSubmit(); };
  recognition.onerror = () => stopRecording();
  recognition.onend = () => stopRecording();
} else {
  els.voiceBtn.style.display = 'none';
}

function stopRecording() { state.isRecording = false; els.voiceBtn.classList.remove('recording'); }
els.voiceBtn.addEventListener('click', () => {
  if (!recognition) return;
  state.isRecording ? recognition.stop() : recognition.start();
});


els.generateQuizBtn.addEventListener('click', async () => {
  const topic = els.quizTopicInput.value;
  const diff = els.quizDifficulty.value;
  if (!topic) return showToast('Please enter a topic', true);
  
  els.generateQuizBtn.textContent = 'Generating...';
  try {
    const qData = await aiAPI.quiz(topic, diff);
    els.quizActiveArea.innerHTML = `<div class="glass-panel" style="padding:1rem;"><h3>Quiz Ready!</h3><pre>${JSON.stringify(qData, null, 2)}</pre></div>`;
    els.quizActiveArea.classList.remove('hidden');
    els.generateQuizBtn.innerHTML = 'Generate Quiz <i class="fa-solid fa-wand-magic-sparkles"></i>';
  } catch (err) {
    showToast('Failed to generate quiz', true);
    els.generateQuizBtn.innerHTML = 'Generate Quiz <i class="fa-solid fa-wand-magic-sparkles"></i>';
  }
});

els.summarizeBtn.addEventListener('click', async () => {
  const text = els.summaryInput.value;
  if (!text) return;
  els.summarizeBtn.textContent = 'Summarizing...';
  try {
    const res = await aiAPI.summarize(text);
    els.summaryResult.innerHTML = `<div style="white-space:pre-wrap;">${res.summary}</div>`;
    els.summaryResult.classList.remove('empty');
  } catch(e) {
    showToast('Failed to summarize', true);
  }
  els.summarizeBtn.innerHTML = 'Summarize Content <i class="fa-solid fa-bolt"></i>';
});

// Dashboard Loader (Role based)
async function loadDashboard() {
  try {
    if (currentUser.role === 'admin') {
      const users = await adminAPI.getUsers();
      const tbody = document.getElementById('admin-users-body');
      tbody.innerHTML = users.map(u => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
          <td style="padding:0.8rem;">${u.name}<br><small style="color:var(--text-muted)">${u.email}</small></td>
          <td style="padding:0.8rem;">${u.role}</td>
          <td style="padding:0.8rem;"><span style="color:${u.isApproved ? 'var(--primary)' : 'var(--secondary)'}">${u.isApproved ? 'Approved' : 'Pending'}</span></td>
          <td style="padding:0.8rem;">
             ${!u.isApproved && u.role === 'instructor' ? `<button onclick="window.approveUser('${u._id}')" style="background:var(--grad-1);border:none;padding:5px 10px;border-radius:4px;color:white;cursor:pointer;">Approve</button>` : 'N/A'}
          </td>
        </tr>
      `).join('');
    } 
    else if (currentUser.role === 'instructor') {
      const { students, allProgress } = await progressAPI.getAll();
      const tbody = document.getElementById('instructor-table-body');
      
      tbody.innerHTML = students.map(s => {
        const prog = allProgress.find(p => p.userId && p.userId._id === s._id) || { weakAreas: [] };
        return `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
            <td style="padding:0.8rem;">${s.name}</td>
            <td style="padding:0.8rem; color:var(--primary); font-weight:bold;">${s.points || 0}</td>
            <td style="padding:0.8rem;">${(prog.weakAreas && prog.weakAreas.length) ? prog.weakAreas.join(', ') : 'N/A'}</td>
          </tr>
        `;
      }).join('');
    } 
    else {
      // Student
      const { progress, recentQuizzes } = await progressAPI.get();
      els.dashPoints.textContent = currentUser.points || 0;
      els.dashStreak.textContent = progress.studyStreakDays || 0;
      els.dashLessons.textContent = progress.completedLessons.length || 0;
      
      if (recentQuizzes && recentQuizzes.length) {
        els.recentQuizzesList.innerHTML = recentQuizzes.map(q => `<li><strong>${q.topic}</strong> - ${q.score}/${q.totalQuestions}</li>`).join('');
      } else {
        els.recentQuizzesList.innerHTML = '<li class="empty-list">No quizzes taken yet.</li>';
      }
      
      if (currentUser.badges && currentUser.badges.length) {
        els.badgesContainer.innerHTML = currentUser.badges.map(b => `<span class="badge" style="background:var(--grad-1);padding:0.5rem;border-radius:8px;color:white;display:inline-block;margin:0.25rem;"><i class="fa-solid fa-medal"></i> ${b}</span>`).join('');
      } else {
        els.badgesContainer.innerHTML = 'No badges yet.';
      }
    }
  } catch(e) {
    console.error(e);
    showToast('Failed to load dashboard data', true);
  }
}

// Global hook for inline HTML onclick buttons
window.approveUser = async function(id) {
  try {
    await adminAPI.approveUser(id, true);
    showToast('Instructor approved!');
    loadDashboard();
  } catch(e) {
    showToast('Error approving user', true);
  }
};

document.getElementById('create-course-btn')?.addEventListener('click', async () => {
    const title = document.getElementById('course-title').value;
    const desc = document.getElementById('course-description').value;
    if(!title || !desc) return showToast('Please fill out course info', true);
    try {
        await instructorAPI.createCourse({ title, description: desc });
        showToast('Course Created Successfully!');
        document.getElementById('course-title').value = '';
        document.getElementById('course-description').value = '';
    } catch(e) {
        showToast('Failed to create course', true);
    }
});

// --- Course Viewer Logic --- //
function setupCourseListeners() {
  const courseItems = document.querySelectorAll('[data-course-id]');
  courseItems.forEach(item => {
    item.addEventListener('click', () => {
      const courseId = item.dataset.courseId;
      const courseTitle = item.querySelector('.value').textContent;
      openCourse(courseId, courseTitle);
    });
  });
}

function openCourse(id, title) {
  const titleEl = document.getElementById('viewing-course-title');
  if (titleEl) titleEl.textContent = title;
  const lessonList = document.getElementById('lesson-list');
  if (lessonList) {
    lessonList.innerHTML = `
      <li class="lesson-item active" onclick="loadLesson('Introduction to ${title}')"><i class="fa-solid fa-play"></i> <span>1. Introduction</span></li>
      <li class="lesson-item" onclick="loadLesson('Core Concepts')"><i class="fa-solid fa-book"></i> <span>2. Core Concepts</span></li>
      <li class="lesson-item" onclick="loadLesson('Practical Exercise')"><i class="fa-solid fa-code"></i> <span>3. Practical Exercise</span></li>
      <li class="lesson-item" onclick="loadLesson('Summary')"><i class="fa-solid fa-check"></i> <span>4. Summary</span></li>
    `;
  }
  switchView('course-viewer');
}

window.loadLesson = function(title) {
  const lessonTitleEl = document.getElementById('current-lesson-title');
  if (lessonTitleEl) lessonTitleEl.textContent = title;
  const lessonBodyEl = document.getElementById('lesson-body');
  if (lessonBodyEl) {
    lessonBodyEl.innerHTML = `
      <div class="glass-panel" style="padding:2rem;">
        <p>This is the content for <strong>${title}</strong>. In this lesson, we will explore the key pillars of modern technology and how AI accelerates our understanding.</p>
        <div style="background:rgba(0,0,0,0.3); height:300px; border-radius:12px; margin-top:2rem; display:flex; align-items:center; justify-content:center;">
          <i class="fa-solid fa-play-circle" style="font-size:4rem; opacity:0.5;"></i>
          <span style="margin-left:1rem;">Video Lesson Placeholder</span>
        </div>
      </div>
    `;
  }
  
  // Highlight active lesson
  document.querySelectorAll('.lesson-item').forEach(li => {
    li.classList.remove('active');
    if (li.textContent.includes(title)) li.classList.add('active');
  });
};

document.getElementById('start-learning-btn')?.addEventListener('click', () => {
  if (!currentUser) {
    els.authModal.classList.add('show');
    els.authModal.classList.remove('hidden');
  } else {
    switchView('courses');
  }
});

// Initial setup
setupCourseListeners();
