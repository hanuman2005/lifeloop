// src/context/NotificationContext.js - React Native
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const { socket } = useSocket();
  const { user } = useAuth();

  // Fetch unread count when user logs in
  useEffect(() => {
    if (user) fetchUnreadCount();
  }, [user]);

  // Real-time notifications via socket
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (notification) => {
      setRecentNotifications((prev) => [notification, ...prev].slice(0, 5));
      setUnreadCount((prev) => prev + 1);
      Toast.show({
        type: "info",
        text1: notification.title || "New notification",
        text2: notification.message || "",
        visibilityTime: 5000,
      });
    };

    const handleNewListingAlert = (data) => {
      Toast.show({
        type: "success",
        text1: "🎁 New Donation!",
        text2: `${data.donor?.name} donated ${data.listing?.title}`,
        visibilityTime: 8000,
      });
    };

    socket.on("newNotification", handleNewNotification);
    socket.on("newListingAlert", handleNewListingAlert);

    return () => {
      socket.off("newNotification", handleNewNotification);
      socket.off("newListingAlert", handleNewListingAlert);
    };
  }, [socket, user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get("/notifications/unread-count");
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/mark-all-read");
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        recentNotifications,
        fetchUnreadCount,
        markAllAsRead,
        setUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
