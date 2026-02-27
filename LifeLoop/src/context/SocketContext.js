// src/context/SocketContext.js - React Native
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import io from "socket.io-client";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";
import Constants from "expo-constants";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context)
    throw new Error("useSocket must be used within a SocketProvider");
  return context;
};

const MAX_NOTIFICATIONS = 50;
const SOCKET_URL =
  Constants.expoConfig?.extra?.SOCKET_API_URL || "http://localhost:5000";

export const SocketProvider = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const { user } = useAuth();

  const socketRef = useRef(null);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.connect();
      Toast.show({ type: "info", text1: "Attempting to reconnect..." });
    }
  }, []);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setIsConnected(false);
        setOnlineUsers([]);
        setNotifications([]);
      }
      return;
    }

    const initSocket = async () => {
      const token = await AsyncStorage.getItem("token");

      const newSocket = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
      });

      socketRef.current = newSocket;

      newSocket.on("connect", () => {
        setIsConnected(true);
        setReconnectAttempt(0);
      });

      newSocket.on("disconnect", (reason) => {
        setIsConnected(false);
        if (reason === "io server disconnect" || reason === "transport close") {
          Toast.show({
            type: "error",
            text1: "Connection lost. Reconnecting...",
          });
        }
      });

      newSocket.on("reconnect_attempt", (n) => setReconnectAttempt(n));

      newSocket.on("reconnect", () => {
        Toast.show({ type: "success", text1: "Connection restored!" });
      });

      newSocket.on("reconnect_failed", () => {
        Toast.show({
          type: "error",
          text1: "Unable to reconnect. Please restart the app.",
        });
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
      });

      newSocket.on("userOnline", (data) => {
        setOnlineUsers((prev) => {
          const filtered = prev.filter((u) => u.userId !== data.userId);
          return [...filtered, data];
        });
      });

      newSocket.on("userOffline", (data) => {
        setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      });

      newSocket.on("newNotification", (notification) => {
        setNotifications((prev) =>
          [notification, ...prev].slice(0, MAX_NOTIFICATIONS),
        );
        Toast.show({
          type: "info",
          text1: notification.title || "New notification",
          text2: notification.message,
        });
      });

      newSocket.on("error", (error) => {
        console.error("Socket error:", error);
      });
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [user]);

  const joinChat = (chatId) => socketRef.current?.emit("joinChat", chatId);
  const leaveChat = (chatId) => socketRef.current?.emit("leaveChat", chatId);

  const sendMessage = (data, callback) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("sendMessage", data, (response) => {
        if (response?.error)
          Toast.show({ type: "error", text1: "Failed to send message" });
        callback?.(response);
      });
    } else {
      Toast.show({ type: "error", text1: "Not connected to chat server" });
      callback?.({ error: "Not connected" });
    }
  };

  const markAsRead = (chatId) =>
    socketRef.current?.emit("markAsRead", { chatId });
  const emitTyping = (chatId, isTyping) =>
    socketRef.current?.emit("typing", { chatId, isTyping });
  const clearNotifications = () => setNotifications([]);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        reconnectAttempt,
        onlineUsers,
        notifications,
        joinChat,
        leaveChat,
        sendMessage,
        markAsRead,
        emitTyping,
        clearNotifications,
        reconnect,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
