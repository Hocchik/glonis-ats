const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message || 'Error del servidor');
    err.code = data.code;
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function get(path) {
  return request(path, { method: 'GET' });
}

function post(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body) });
}

function put(path, body) {
  return request(path, { method: 'PUT', body: JSON.stringify(body) });
}

function patch(path, body) {
  return request(path, { method: 'PATCH', body: JSON.stringify(body) });
}

async function postForm(path, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: formData });
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message || 'Error del servidor');
    err.code = data.code;
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function del(path) {
  return request(path, { method: 'DELETE' });
}

export const api = { get, post, put, patch, del, postForm };
