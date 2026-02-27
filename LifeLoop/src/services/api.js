// src/services/api.js
import axios from "axios";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL =
  Constants.expoConfig?.extra?.API_URL || "http://localhost:5000/api";

console.log("🧭 API Base URL:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ✅ Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Remove token from AsyncStorage
      await AsyncStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
      // Optionally, handle navigation to login if needed
    }
    if (!error.response) console.error("Network error:", error.message);
    return Promise.reject(error);
  },
);

// ---------------------- //
//   API ENDPOINT GROUPS  //
// ---------------------- //

export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  getMe: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data),
};

export const listingsAPI = {
  create: (data) =>
    api.post("/listings", data, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    }),
  getAll: (params) => api.get("/listings", { params }),
  getById: (id) => api.get(`/listings/${id}`),
  update: (id, data) =>
    api.put(`/listings/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    }),
  delete: (id) => api.delete(`/listings/${id}`),
  expressInterest: (id, data) => api.post(`/listings/${id}/interest`, data),
  assign: (id, data) => api.post(`/listings/${id}/assign`, data),
  complete: (id) => api.put(`/listings/${id}/complete`),
  getUserListings: (params) => api.get("/listings/user", { params }),
  getNearby: (lat, lng, radius) =>
    api.get("/listings/nearby", { params: { lat, lng, radius } }),
  search: (params) => api.get("/listings/search", { params }),
  getMatchSuggestions: (id) => api.get(`/listings/${id}/match-suggestions`),
  autoAssignTopMatch: (id) => api.post(`/listings/${id}/assign-top-match`),
  // Queue endpoints (interested users)
  getQueueStatus: (id) => api.get(`/listings/${id}/queue/status`),
  joinQueue: (id, data) => api.post(`/listings/${id}/queue/join`, data),
  leaveQueue: (id) => api.delete(`/listings/${id}/queue/leave`),
  cancelAssignment: (id, data) =>
    api.post(`/listings/${id}/queue/cancel`, data),
  // AI Auto-assignment endpoints (receiver accept/decline)
  acceptAssignment: (id) => api.put(`/listings/${id}/assignment/accept`),
  declineAssignment: (id) => api.put(`/listings/${id}/assignment/decline`),
};

export const chatAPI = {
  getUserChats: () => api.get("/chat"),
  getMessages: (chatId) => api.get(`/chat/${chatId}/messages`),
  sendMessage: (chatId, data) => api.post(`/chat/${chatId}/messages`, data),
  createOrGet: (data) => api.post("/chat/create-or-get", data),
  getChat: (chatId) => api.get(`/chat/${chatId}`),
};

// ✅ QR-related API (merged properly)
export const qrAPI = {
  generateQR: (listingId, recipientId) =>
    api.post("/qr/generate", { listingId, recipientId }),
  verifyQR: (qrCode, location = null) =>
    api.post("/qr/verify", { qrCode, location }),
  getTransaction: (transactionId) =>
    api.get(`/qr/transaction/${transactionId}`),
  getMyTransactions: (params = {}) =>
    api.get("/qr/my-transactions", { params }),
  downloadQR: (transactionId) =>
    api.get(`/qr/download/${transactionId}`, { responseType: "blob" }),
};

export const usersAPI = {
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put("/users/profile", data),
  rate: (id, data) => api.post(`/users/${id}/rate`, data),
  getRatings: (id, params) => api.get(`/users/${id}/ratings`, { params }),
  updateProfileImage: (data) =>
    api.put("/users/profile-image", data, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    }),
  search: (params) => api.get("/users/search", { params }),
};

// ✅ Impact API
export const impactAPI = {
  getPersonalImpact: () => api.get("/impact/personal"),
  getCommunityImpact: () => api.get("/impact/community"),
  getImpactHeatmap: (params) => api.get("/impact/heatmap", { params }),
  getImpactTimeline: (params) => api.get("/impact/timeline", { params }),
  generateShareCard: () => api.get("/impact/share-card"),
  getDigitalTwin: (params) => api.get("/impact/digital-twin", { params }),
};

export const uploadAPI = {
  uploadFile: (endpoint, data, onProgress) =>
    api.post(endpoint, data, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(percentCompleted);
        }
      },
    }),
  uploadMultiple: (files, onProgress) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    return api.post("/upload/multiple", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
      onUploadProgress: (e) =>
        onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    });
  },
  uploadImage: (file, onProgress) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post("/upload/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
      onUploadProgress: (e) =>
        onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    });
  },
  listing: (data) => listingsAPI.create(data),
  profileImage: (data) => usersAPI.updateProfileImage(data),
};

// ✅ Analytics API
export const analyticsAPI = {
  // Fetch analytics for the currently authenticated user
  getUserAnalytics: () => api.get("/analytics/user"),

  // Fetch global platform-wide analytics (requires admin privileges)
  getPlatform: () => api.get("/analytics/platform"),
};

export const ratingsAPI = {
  rateUser: (userId, data) => api.post(`/ratings/${userId}`, data),
  getUserReviews: (userId, params) => api.get(`/ratings/${userId}`, { params }),
  reportReview: (userId, reviewId, reason) =>
    api.post(`/ratings/${userId}/reviews/${reviewId}/report`, { reason }),
};

export const scheduleAPI = {
  proposeSchedule: (listingId, data) =>
    api.post(`/listings/${listingId}/schedule`, data),

  getSchedules: (params) => api.get("/schedules", { params }),

  getMySchedules: (params) => api.get("/schedules/my-schedules", { params }),

  getUpcomingSchedules: () => api.get("/schedules/upcoming"),

  getScheduleById: (id) => api.get(`/schedules/${id}`),

  confirmSchedule: (id, data) => api.put(`/schedules/${id}/confirm`, data),

  cancelSchedule: (id, data) => api.put(`/schedules/${id}/cancel`, data),

  completeSchedule: (id) => api.put(`/schedules/${id}/complete`),

  // Pickup tracking
  startPickup: (id) => api.put(`/schedules/${id}/start-pickup`),

  updateDriverLocation: (id, location) =>
    api.put(`/schedules/${id}/driver-location`, { location }),

  getPickupStatus: (id) => api.get(`/schedules/${id}/pickup-status`),

  // Recurring schedules
  createRecurring: (data) => api.post("/schedules/recurring", data),

  getRecurringSchedules: () => api.get("/schedules/recurring"),

  cancelRecurring: (id) => api.delete(`/schedules/recurring/${id}`),
};
// ✅ Waste Analysis API (for TensorFlow.js AI Waste Analyzer)
export const wasteAPI = {
  // Save analysis results to backend
  saveAnalysis: (data) => api.post("/waste-analysis", data),

  // Get user's analysis history with pagination
  getMyHistory: (params = {}) =>
    api.get("/waste-analysis/my-history", { params }),

  // Get single analysis by ID
  getById: (id) => api.get(`/waste-analysis/${id}`),

  // Save/bookmark an analysis
  toggleSave: (id) => api.put(`/waste-analysis/${id}/save`),

  // Delete an analysis
  delete: (id) => api.delete(`/waste-analysis/${id}`),

  // Create donation listing from analysis
  createListing: (id, data) =>
    api.post(`/waste-analysis/${id}/create-listing`, data),

  // Get personal impact statistics
  getMyImpact: () => api.get("/waste-analysis/stats/my-impact"),

  // Get community-wide statistics (public)
  getCommunityStats: () => api.get("/waste-analysis/stats/community"),

  // Get eco score leaderboard
  getLeaderboard: (params = {}) =>
    api.get("/waste-analysis/leaderboard", { params }),
};

export const routeAPI = {
  // Optimize routes
  optimizeRoutes: (data) => api.post("/routes/optimize", data),

  // Get assigned pickups for current user
  getMyAssignedPickups: () => api.get("/routes/my-assigned-pickups"),
};

export const aiAPI = {
  generateUpcyclingIdeas: (data) => api.post("/ai/upcycle", data),
  analyzeImage: (data) => api.post("/ai/analyze-image", data),
};

// ✅ Admin API (requires admin role)
export const adminAPI = {
  // Dashboard
  getDashboardStats: () => api.get("/admin/dashboard-stats"),

  // User Management
  getAllUsers: (params) => api.get("/admin/users", { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  suspendUser: (id, data) => api.put(`/admin/users/${id}/suspend`, data),
  unsuspendUser: (id) => api.put(`/admin/users/${id}/unsuspend`),
  warnUser: (id, data) => api.put(`/admin/users/${id}/warn`, data),
  updateUserRole: (id, data) => api.put(`/admin/users/${id}/role`, data),
  bulkUserAction: (data) => api.post("/admin/users/bulk-action", data),

  // Verifications
  getVerifications: (params) => api.get("/admin/verifications", { params }),
  approveVerification: (id, data) =>
    api.put(`/admin/verifications/${id}/approve`, data),
  rejectVerification: (id, data) =>
    api.put(`/admin/verifications/${id}/reject`, data),

  // Flagged Content
  getFlaggedContent: (params) => api.get("/admin/flagged-content", { params }),
  removeContent: (id, data) =>
    api.put(`/admin/flagged-content/${id}/remove`, data),
  restoreContent: (id, data) =>
    api.put(`/admin/flagged-content/${id}/restore`, data),

  // Reports
  getAllReports: (params) => api.get("/admin/reports", { params }),
  resolveReport: (id, data) => api.put(`/reports/${id}/resolve`, data),

  // Logs
  getLogs: (params) => api.get("/admin/logs", { params }),
};

export default api;
