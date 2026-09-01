// src/lib/api.js — HTTP client for the LifeLoop backend.
//
// Endpoint groups mirror the existing React Native client so the same backend
// serves both without change. The only real difference is storage: localStorage
// here, AsyncStorage there.

import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://127.0.0.1:5000";

const TOKEN_KEY = "lifeloop_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // An expired or invalid token should not leave the app in a half-authenticated
    // state where every subsequent request fails silently.
    if (error.response?.status === 401) {
      clearToken();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login?expired=1");
      }
    }
    return Promise.reject(error);
  },
);

/** Pull a usable message out of an axios error without leaking internals. */
export const errorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallback;

export default api;

// ── Endpoint groups ─────────────────────────────────────────────────────────

export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  getMe: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data),
  forgotPassword: (body) => api.post("/auth/forgot-password", body),
  resetPassword: (token, body) => api.post(`/auth/reset-password/${token}`, body),
};

export const adminAPI = {
  dashboardStats: () => api.get("/admin/dashboard-stats"),
  users: (params) => api.get("/admin/users", { params }),
  suspendUser: (id, body) => api.put(`/admin/users/${id}/suspend`, body || {}),
  unsuspendUser: (id) => api.put(`/admin/users/${id}/unsuspend`),
  warnUser: (id, body) => api.put(`/admin/users/${id}/warn`, body || {}),
  reports: (params) => api.get("/admin/reports", { params }),
  flaggedContent: (params) => api.get("/admin/flagged-content", { params }),
  removeFlagged: (id, body) => api.put(`/admin/flagged-content/${id}/remove`, body || {}),
  restoreFlagged: (id) => api.put(`/admin/flagged-content/${id}/restore`),
};

export const listingsAPI = {
  create: (data) => api.post("/listings", data, { timeout: 60000 }),
  getAll: (params) => api.get("/listings", { params }),
  getById: (id) => api.get(`/listings/${id}`),
  update: (id, data) => api.put(`/listings/${id}`, data, { timeout: 60000 }),
  delete: (id) => api.delete(`/listings/${id}`),
  expressInterest: (id, data) => api.post(`/listings/${id}/interest`, data),
  assign: (id, data) => api.post(`/listings/${id}/assign`, data),
  complete: (id) => api.put(`/listings/${id}/complete`),
  getUserListings: (params) => api.get("/listings/user", { params }),
  getAssignedToMe: () => api.get("/listings/user/assigned-to-me"),
  getNearby: (lat, lng, radius) => api.get("/listings/nearby", { params: { lat, lng, radius } }),
  search: (params) => api.get("/listings/search", { params }),
  getQueueStatus: (id) => api.get(`/listings/${id}/queue/status`),
  joinQueue: (id, data) => api.post(`/listings/${id}/queue/join`, data),
  leaveQueue: (id) => api.delete(`/listings/${id}/queue/leave`),
  acceptAssignment: (id) => api.put(`/listings/${id}/assignment/accept`),
  declineAssignment: (id) => api.put(`/listings/${id}/assignment/decline`),
};

export const scanAPI = {
  // Single item. Returns { success, analysis } or { success:false, noItem:true }.
  analyzeImage: (imageBase64) =>
    api.post("/ai/analyze-image", { imageBase64, mediaType: "image/jpeg" }, { timeout: 60000 }),

  // A mixed pile: every item detected and classified separately, plus a
  // composition summary. Slower, because it is one detector pass and one
  // classifier pass per item.
  analyzeScene: (imageBase64) =>
    api.post("/ai/analyze-scene", { imageBase64, mediaType: "image/jpeg" }, { timeout: 120000 }),

  // Everyday objects: detects phones, laptops, books, bottles, chairs, etc.
  // using YOLOv8n-COCO. Returns object names, emojis, boxes, and waste categories.
  detectObjects: (imageBase64) =>
    api.post("/ai/detect-objects", { imageBase64, mediaType: "image/jpeg" }, { timeout: 60000 }),
};

export const ecoAPI = {
  getMyPoints: () => api.get("/eco/points"),
  award: (data) => api.post("/eco/award", data),
  getDiary: (params) => api.get("/eco/diary", { params }),
  getLeaderboard: (params) => api.get("/eco/leaderboard", { params }),
  getCityImpact: (params) => api.get("/eco/impact", { params }),
};

export const binsAPI = {
  // Returns 201 when accepted, 202 when a screening rule rejected it. A 202 is a
  // real answer, not an error, so callers must check `accepted` rather than status.
  report: (payload) => api.post("/bins/report", payload),
  getNearby: (params) => api.get("/bins/nearby", { params }),
  getWards: (params) => api.get("/bins/wards", { params }),
  getActionable: (params) => api.get("/bins/actionable", { params }),
  getMyReports: () => api.get("/bins/my-reports"),
  // Builds a collection route over the bins reported as needing emptying, and
  // returns the saving against an ordered circuit over every reporting ward.
  planRoute: (body) => api.post("/bins/route", body),
  resolve: (id) => api.patch(`/bins/${id}/resolve`),
};

export const collectorAPI = {
  generateTasks: (body) => api.post("/collector/tasks/generate", body || {}),
  getNearbyTasks: (params) => api.get("/collector/tasks/nearby", { params }),
  getMyTasks: () => api.get("/collector/tasks/mine"),
  accept: (id) => api.post(`/collector/tasks/${id}/accept`),
  complete: (id, body) => api.post(`/collector/tasks/${id}/complete`, body),
  // Called by the citizen who raised the work, never the collector.
  verify: (id) => api.post(`/collector/tasks/${id}/verify`),
  getLedger: (params) => api.get("/collector/ledger", { params }),
};

export const routesAPI = {
  optimize: (body) => api.post("/routes/optimize", body),
};

export const chatAPI = {
  getUserChats: () => api.get("/chat"),
  getMessages: (chatId) => api.get(`/chat/${chatId}/messages`),
  sendMessage: (chatId, data) => api.post(`/chat/${chatId}/messages`, data),
  createOrGet: (data) => api.post("/chat/create-or-get", data),
};

export const notificationsAPI = {
  list: (params) => api.get("/notifications", { params }),
  unreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/mark-all-read"),
  remove: (id) => api.delete(`/notifications/${id}`),
};

export const qrAPI = {
  generate: (listingId, recipientId) => api.post("/qr/generate", { listingId, recipientId }),
  verify: (qrCode, location = null) => api.post("/qr/verify", { qrCode, location }),
  getTransaction: (id) => api.get(`/qr/transaction/${id}`),
  myTransactions: (params) => api.get("/qr/my-transactions", { params }),
};

export const schedulesAPI = {
  propose: (listingId, data) => api.post(`/listings/${listingId}/schedule`, data),
  mine: (params) => api.get("/schedules/my-schedules", { params }),
  upcoming: () => api.get("/schedules/upcoming"),
  getById: (id) => api.get(`/schedules/${id}`),
  confirm: (id, data) => api.put(`/schedules/${id}/confirm`, data || {}),
  cancel: (id, data) => api.put(`/schedules/${id}/cancel`, data || {}),
  complete: (id) => api.put(`/schedules/${id}/complete`),
};

export const ratingsAPI = {
  rate: (userId, data) => api.post(`/ratings/${userId}`, data),
  reviews: (userId, params) => api.get(`/ratings/${userId}`, { params }),
};

export const impactAPI = {
  getPersonalImpact: () => api.get("/impact/personal"),
  getCommunityImpact: () => api.get("/impact/community"),
  getImpactHeatmap: (params) => api.get("/impact/heatmap", { params }),
  getImpactTimeline: (params) => api.get("/impact/timeline", { params }),
};

export const mapAPI = {
  getNearbyCenters: (params) => api.get("/map/nearby", { params }),
  getPrices: () => api.get("/map/prices"),
};

export const wasteAnalysisAPI = {
  save: (data) => api.post("/waste-analysis", data),
  myHistory: (params) => api.get("/waste-analysis/my-history", { params }),
  getById: (id) => api.get(`/waste-analysis/${id}`),
  remove: (id) => api.delete(`/waste-analysis/${id}`),
  myImpact: () => api.get("/waste-analysis/stats/my-impact"),
};

export const configAPI = {
  getAll: () => api.get("/config/all"),
  getWasteCategories: () => api.get("/config/waste-categories"),
};

export const usersAPI = {
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put("/users/profile", data),
};
