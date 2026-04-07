// api.js

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : 'https://nuur-tech-api.onrender.com/api'; // Placeholder for Render/Railway backend URL

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'x-auth-token': token } : {})
  };
}

export const authAPI = {
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  register: async (name, email, password, role) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, email, password, role })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  me: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Not logged in');
    return res.json();
  }
};

export const aiAPI = {
  chat: async (message, topic) => {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, topic })
    });
    if (!res.ok) throw new Error('Chat failed');
    return res.json();
  },
  quiz: async (topic, difficulty) => {
    const res = await fetch(`${API_BASE}/ai/quiz`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ topic, difficulty })
    });
    if (!res.ok) throw new Error('Quiz generation failed');
    return res.json();
  },
  summarize: async (text) => {
    const res = await fetch(`${API_BASE}/ai/summarize`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('Summarization failed');
    return res.json();
  }
};

export const progressAPI = {
  get: async () => {
    const res = await fetch(`${API_BASE}/progress`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch progress');
    return res.json();
  },
  submitQuiz: async (resultData) => {
    const res = await fetch(`${API_BASE}/progress/quiz-result`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(resultData)
    });
    return res.json();
  },
  getAll: async () => {
    const res = await fetch(`${API_BASE}/progress/all`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch instructor dashboard');
    return res.json();
  }
};

export const adminAPI = {
  getUsers: async () => {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },
  approveUser: async (id, isApproved) => {
    const res = await fetch(`${API_BASE}/admin/users/${id}/approve`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ isApproved })
    });
    return res.json();
  }
};

export const instructorAPI = {
  createCourse: async (courseData) => {
    const res = await fetch(`${API_BASE}/instructor/courses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(courseData)
    });
    if (!res.ok) throw new Error('Failed to load courses');
    return res.json();
  }
};
