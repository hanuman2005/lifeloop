// src/context/AuthContext.js - FIXED for response mismatch

import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL =
    Constants.expoConfig?.extra?.API_URL || "http://localhost:5000/api";

  // Configure axios defaults
  useEffect(() => {
    const token = AsyncStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      console.log("🔑 Token found in AsyncStorage, setting auth header");
    }
  }, []);

  // Load user on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        try {
          console.log("🔄 Initializing auth with token");
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          const response = await axios.get(`${API_URL}/auth/me`);
          console.log("📥 Init auth response:", response.data);

          // ✅ Handle both response formats
          const userData = response.data.user || response.data.data;

          if (userData) {
            console.log("✅ User loaded from token:", userData);
            setUser(userData);
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
          // Clear invalid token
          AsyncStorage.removeItem("token");
          delete axios.defaults.headers.common["Authorization"];
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [API_URL]);

  // Register function
  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);

      console.log("📝 Registering user:", userData.email);

      const response = await axios.post(`${API_URL}/auth/register`, userData);
      console.log("📥 Register response:", response.data);

      if (response.data.success) {
        // ✅ Handle both response formats
        const token = response.data.token;
        const user = response.data.user || response.data.data;

        if (!token || !user) {
          throw new Error("Invalid response format");
        }

        // Save token
        await AsyncStorage.setItem("token", token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        console.log("✅ Registration successful:", user);
        setUser(user);

        return { success: true, user };
      }
    } catch (error) {
      console.error("❌ Registration error:", error);
      const errorMessage =
        error.response?.data?.message || "Registration failed";
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
        details: error.response?.data?.errors,
      };
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      console.log("🔐 AuthContext: Attempting login for", email);

      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      console.log("📥 AuthContext: Login response:", response.data);

      if (response.data.success) {
        // ✅ FIXED: Handle both response formats (data or user)
        const token = response.data.token;
        const userData = response.data.user || response.data.data;

        if (!token) {
          console.error("❌ No token in response");
          throw new Error("No token received");
        }

        if (!userData) {
          console.error("❌ No user data in response");
          throw new Error("No user data received");
        }

        // Save token to AsyncStorage
        console.log("💾 Saving token to AsyncStorage");
        await AsyncStorage.setItem("token", token);

        // Set axios default header
        console.log("🔧 Setting axios auth header");
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        // Set user state
        console.log("✅ AuthContext: Setting user:", userData);
        setUser(userData);

        // Verify state was set
        console.log("✅ AuthContext: Final user state:", userData);

        console.log("✅ AuthContext: Login successful");
        return { success: true, user: userData };
      } else {
        console.error("❌ AuthContext: Response not successful");
        return { success: false, error: "Login failed" };
      }
    } catch (error) {
      console.error("❌ AuthContext: Login error:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Login failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    console.log("👋 Logging out");
    await AsyncStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    setError(null);
  };

  // Update profile
  const updateProfile = async (profileData) => {
    try {
      setError(null);

      console.log("🔄 Updating profile:", profileData);

      const response = await axios.put(`${API_URL}/auth/profile`, profileData);

      if (response.data.success) {
        // ✅ Handle both response formats
        const updatedUser = response.data.user || response.data.data;
        console.log("✅ Profile updated:", updatedUser);
        setUser(updatedUser);
        return { success: true, user: updatedUser };
      }
    } catch (error) {
      console.error("❌ Profile update error:", error);
      const errorMessage =
        error.response?.data?.message || "Profile update failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      console.log("🔄 Refreshing user data");
      const response = await axios.get(`${API_URL}/auth/me`);

      // ✅ Handle both response formats
      const userData = response.data.user || response.data.data;

      if (userData) {
        console.log("✅ User data refreshed:", userData);
        setUser(userData);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    updateProfile,
    clearError,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
