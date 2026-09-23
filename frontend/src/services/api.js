// Base API configuration supporting both local development and deployed single-origin architectures
const BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5174'
    ? 'http://127.0.0.1:8001' 
    : '');

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function fetchWrapper(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(data?.message || response.statusText, response.status);
  }

  return data;
}

export const api = {
  get: (endpoint) => fetchWrapper(endpoint, { method: 'GET' }),
  post: (endpoint, body) => fetchWrapper(endpoint, { method: 'POST', body: JSON.stringify(body) }),
};
