// src/auth.js
import { API_URL } from "./config";

/**
 * Save JWT token to localStorage.
 * @param {string} token - JWT string.
 */
export function saveToken(token) {
  localStorage.setItem("jwt", token);
}

/**
 * Retrieve JWT token from localStorage.
 * @returns {string|null} JWT string or null if not set.
 */
export function getToken() {
  return localStorage.getItem("jwt");
}

/**
 * Remove JWT token from localStorage (logout).
 */
export function removeToken() {
  localStorage.removeItem("jwt");
}

/**
 * Check if the user is logged in (has a JWT token).
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!getToken();
}

/**
 * Login user with username and password.
 * Returns the full API response object { success, message, token, errors }.
 * Saves the JWT token automatically.
 * @param {string} username
 * @param {string} password
 * @throws {object} Throws API response object if login fails.
 */
export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.errors && typeof data.errors === 'object') {
      const firstField = Object.values(data.errors).find(errs => Array.isArray(errs) && errs.length > 0);
      return { success: false, message: firstField ? firstField[0] : (data.title || "Validation failed.") };
    }
    return { success: false, message: data.message || data.title || `Login failed with status ${res.status}` };
  }

  if (!data.success) return data;
  saveToken(data.token);
  return data;
}

/**
 * Register a new user.
 * Returns the full API response object { success, message, errors }.
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @throws {object} Throws API response object if registration fails.
 */
export async function register(username, email, password) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password })
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.errors && typeof data.errors === 'object') {
      const firstField = Object.values(data.errors).find(errs => Array.isArray(errs) && errs.length > 0);
      return { success: false, message: firstField ? firstField[0] : (data.title || "Validation failed.") };
    }
    return { success: false, message: data.message || data.title || `Registration failed with status ${res.status}` };
  }

  return data;
}

/**
 * Fetch wrapper for authenticated requests with JSON support.
 * Automatically includes JWT in Authorization header if present.
 * Handles session expiration (401) by removing token and redirecting to login.
 * @param {string} endpoint - API endpoint (e.g., "/api/tasks")
 * @param {object} [options] - fetch options { method, body, headers, etc. }
 * @returns {Promise<object>} Parsed JSON response from the server.
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

  const response = await fetch(`${API_URL}${endpoint}`, finalOptions);

  // Handle session expiration
  if (response.status === 401) {
    removeToken();
    window.location.href = "/";
    return { success: false, message: "Session expired. Please login again." };
  }
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      throw new Error(`Request failed with ${response.status}`);
    }

    // Check for standard custom error format { success: false, message: ... }
    if (errorData.message) {
      throw new Error(errorData.message);
    }

    // Check for ASP.NET Core validation errors format { errors: { FieldName: ["Error"] } }
    if (errorData.errors && typeof errorData.errors === 'object') {
      const firstField = Object.values(errorData.errors).find(errs => Array.isArray(errs) && errs.length > 0);
      if (firstField && firstField.length > 0) {
        throw new Error(firstField[0]);
      }
    }

    // Fallback if structure is unknown
    throw new Error(errorData.title || `Request failed with ${response.status}`);
  }

  return response.json();
}

/**
 * Parse JWT token to get payload
 * @param {string} token 
 * @returns {object|null}
 */
export function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

/**
 * Get current user info from token
 * @returns {object|null} { id, name, ... }
 */
export function getCurrentUser() {
  const token = getToken();
  if (!token) return null;

  const payload = parseJwt(token);
  if (!payload) return null;

  return payload;
}
