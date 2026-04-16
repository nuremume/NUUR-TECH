// api.js

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : 'https://nuur-tech-api.onrender.com/api'; // Placeholder for Render/Railway backend URL

function getHeaders() {
  const user = JSON.parse(localStorage.getItem('nuurUser') || 'null');
  const token = user ? user.token : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function fetchAPI(endpoint, options = {}) {
  const headers = getHeaders();
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  
  let data;
  try {
    data = await res.json();
  } catch (err) {
    if (!res.ok) throw new Error(res.statusText || 'Request failed');
    return null;
  }

  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

window.nuurAPI = {
  auth: {
    login: (identifier, password) => 
      fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
    
    registerStudent: (data) =>
      fetchAPI('/auth/register-student', { method: 'POST', body: JSON.stringify(data) }),
    
    registerInstructor: (formData) =>
      fetchAPI('/auth/register-instructor', { method: 'POST', body: formData })
  },
  admin: {
    getUsers: () => fetchAPI('/admin/users'),
    approveInstructor: (id) => fetchAPI(`/admin/instructors/${id}/approve`, { method: 'PUT' })
  },
  course: {
    getAll: () => fetchAPI('/courses')
  },
  instructor: {
    getMyCourses: () => fetchAPI('/instructor/courses/me'),
    createCourse: (data) => fetchAPI('/instructor/courses', { method: 'POST', body: JSON.stringify(data) }),
    addLesson: (courseId, formData) => fetchAPI(`/instructor/courses/${courseId}/lessons`, { method: 'POST', body: formData })
  },
  ai: {
    chat: (message, topic) => fetchAPI('/ai/chat', { method: 'POST', body: JSON.stringify({ message, topic }) })
  }
};
