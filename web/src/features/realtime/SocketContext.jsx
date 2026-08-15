// Socket.IO connection, shared across the app.
//
// One connection per session rather than one per screen: the backend joins the
// socket to a room named after the user id on connect, so notifications arrive
// wherever the user happens to be. Opening a second connection per component
// would duplicate every message.

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

import { SOCKET_URL, getToken } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // Signing out must drop the socket, otherwise the previous user's rooms
      // keep delivering messages to the next session on this machine.
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      // The server authenticates from handshake.auth.token, not a header.
      auth: { token: getToken() },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      socket: socketRef,
      connected,
      emit: (event, payload) => socketRef.current?.emit(event, payload),
    }),
    [connected],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within a SocketProvider");
  return context;
}

/**
 * Subscribe to a socket event for the lifetime of a component.
 *
 * The handler is held in a ref so that re-registering on every render is not
 * required; passing an inline function would otherwise detach and reattach the
 * listener constantly and drop messages arriving in between.
 */
export function useSocketEvent(event, handler) {
  const { socket, connected } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const current = socket.current;
    if (!current || !event) return undefined;

    const listener = (...args) => handlerRef.current?.(...args);
    current.on(event, listener);
    return () => current.off(event, listener);
  }, [socket, event, connected]);
}
