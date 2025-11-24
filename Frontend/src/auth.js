// src/auth.js
import { API_URL } from "./config";

/**
 * Save JWT to localStorage
 * @param {string} token
 */
export function saveToken(token) {
  localStorage.setItem("jwt", token);
}

/**
 * Get JWT from localStorage
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem("jwt");
}

/**
 * Remove JWT from localStorage (logout)
 */
export function removeToken() {
  localStorage.removeItem("jwt");
}

/**
 * Check if user is logged in
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!getToken();
}

/**
 * Login user
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} API response JSON
 */
export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg);
  }

  const data = await res.json();
  saveToken(data.token);
  return data;
}

/**
 * Register user
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} API response JSON
 */
export async function register(username, password) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg);
  }

  return await res.json();
}

/**
 * Fetch wrapper with JWT authorization and JSON body support
 * @param {string} endpoint API endpoint (e.g., "/api/tasks")
 * @param {object} options fetch options { method, body, headers, etc. }
 * @returns {Promise<Response>}
 */
export async function fetchWithAuth(endpoint, options = {}) {
  const token = getToken();

  const defaultHeaders = {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : undefined
  };

  const finalOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  if (options.body && typeof options.body === "object") {
    finalOptions.body = JSON.stringify(options.body);
  }

  return fetch(`${API_URL}${endpoint}`, finalOptions);
}
