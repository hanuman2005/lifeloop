// src/screens/ChatScreen.js - React Native (converted from React Web)
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { chatAPI } from "../services/api";

// ─────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const groupMessagesByDate = (messages) => {
  const groups = [];
  const map = {};
  messages.forEach((message) => {
    const dateKey = new Date(message.timestamp).toDateString();
    if (!map[dateKey]) {
      map[dateKey] = { date: dateKey, messages: [] };
      groups.push(map[dateKey]);
    }
    map[dateKey].messages.push(message);
  });
  return groups;
};

const getOtherParticipant = (chat, userId) => {
  if (!chat?.participants) return null;
  return chat.participants.find((p) => p._id !== userId);
};

const getLastMessage = (chat) => {
  if (!chat?.lastMessage) return "No messages yet";
  const content = chat.lastMessage.content || "";
  return content.length > 40 ? `${content.substring(0, 40)}...` : content;
};

const deduplicateChats = (chats) => {
  const seen = new Set();
  return chats.filter((c) => {
    if (seen.has(c._id)) return false;
    seen.add(c._id);
    return true;
  });
};

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────

const Avatar = ({ user, size = 48, active = false }) => (
  <View
    style={[
      styles.avatar,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: active ? "#fff" : "#166534",
      },
    ]}
  >
    <Text
      style={[
        styles.avatarText,
        { fontSize: size * 0.35, color: active ? "#4ade80" : "#fff" },
      ]}
    >
      {user?.firstName?.[0]?.toUpperCase() || "?"}
      {user?.lastName?.[0]?.toUpperCase() || ""}
    </Text>
  </View>
);

const OnlineIndicator = () => <View style={styles.onlineIndicator} />;

const MessageBubble = ({ message, isOwn, otherUser, showAvatar }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.messageBubbleRow,
        isOwn ? styles.messageBubbleRowOwn : styles.messageBubbleRowOther,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Avatar placeholder for non-own messages */}
      {!isOwn && (
        showAvatar
          ? <Avatar user={otherUser} size={32} />
          : <View style={{ width: 32 }} />
      )}

      <View
        style={[
          styles.messageContent,
          isOwn ? styles.messageContentOwn : styles.messageContentOther,
        ]}
      >
        <View
          style={[
            styles.messageText,
            isOwn ? styles.messageTextOwn : styles.messageTextOther,
            message.pending && styles.messageTextPending,
            message.failed && styles.messageTextFailed,
          ]}
        >
          <Text
            style={[
              styles.messageTextContent,
              isOwn ? { color: "#0f172a" } : { color: "#f1f5f9" },
            ]}
          >
            {message.content}
          </Text>
          {message.pending && <Text style={styles.pendingIcon}> ⏳</Text>}
          {message.failed && <Text style={styles.failedLabel}> ❌ Failed</Text>}
        </View>
        <Text style={styles.messageTime}>{formatTime(message.timestamp)}</Text>
      </View>
    </Animated.View>
  );
};

const ChatListItem = ({ chat, active, currentUserId, onPress }) => {
  const otherUser = getOtherParticipant(chat, currentUserId);
  if (!otherUser) return null;

  return (
    <TouchableOpacity
      style={[styles.chatItem, active && styles.chatItemActive]}
      onPress={() => onPress(chat)}
      activeOpacity={0.8}
    >
      <View style={{ position: "relative" }}>
        <Avatar user={otherUser} size={48} active={active} />
        {active && <OnlineIndicator />}
      </View>
      <View style={styles.chatItemInfo}>
        <Text style={[styles.chatItemName, active && styles.chatItemNameActive]} numberOfLines={1}>
          {otherUser.firstName} {otherUser.lastName}
        </Text>
        <Text style={[styles.chatItemLastMsg, active && styles.chatItemLastMsgActive]} numberOfLines={1}>
          {getLastMessage(chat)}
        </Text>
      </View>
      <View style={styles.chatItemMeta}>
        {chat.lastMessage && (
          <Text style={styles.chatItemTime}>
            {formatTime(chat.lastMessage.timestamp)}
          </Text>
        )}
        {chat.unreadCount > 0 && (
          <View style={[styles.unreadBadge, active && styles.unreadBadgeActive]}>
            <Text style={[styles.unreadBadgeText, active && styles.unreadBadgeTextActive]}>
              {chat.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────

const ChatScreen = () => {
  const navigation  = useNavigation();
  const route       = useRoute();
  const { user }    = useAuth();
  const { socket, isConnected } = useSocket();

  // route.params?.chatId pre-selects a chat
  const initialChatId = route.params?.chatId;

  const [allChats,     setAllChats]     = useState([]);
  const [currentChat,  setCurrentChat]  = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [newMessage,   setNewMessage]   = useState("");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [loading,      setLoading]      = useState(false);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [isTyping,     setIsTyping]     = useState(false);
  const [showSidebar,  setShowSidebar]  = useState(!initialChatId);

  const flatListRef = useRef(null);
  const typingTimer = useRef(null);

  // ── Load chats on mount ───────────────
  useEffect(() => {
    fetchChats();
  }, []);

  // ── Auto-select chat from route params ─
  useEffect(() => {
    if (initialChatId && allChats.length > 0) {
      const chat = allChats.find((c) => c._id === initialChatId);
      if (chat) {
        setCurrentChat(chat);
        loadMessages(initialChatId);
        setShowSidebar(false);
      }
    }
  }, [initialChatId, allChats]);

  // ── Socket: join room + listen ────────
  useEffect(() => {
    if (!currentChat || !socket || !isConnected) return;
    socket.emit("joinChat", currentChat._id);

    const handleNewMessage = (message) => {
      const chatId = message.chat?._id ?? message.chat;
      if (chatId !== currentChat._id) return;

      setMessages((prev) => {
        const exists = prev.some((m) => {
          if (m._id && message._id && m._id === message._id) return true;
          if (m.tempId || m.pending) return false;
          const sameSender =
            m.sender === message.sender ||
            m.sender?._id === (message.sender?._id ?? message.sender);
          const sameContent = m.content === message.content;
          const timeDiff = Math.abs(
            new Date(m.timestamp) - new Date(message.timestamp)
          );
          return sameSender && sameContent && timeDiff < 1000;
        });
        if (exists) return prev;
        return [...prev, message];
      });
    };

    const handleTyping = (data) => {
      if (data.chatId === currentChat._id && data.userId !== user._id) {
        setIsTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setIsTyping(false), 3000);
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("userTyping", handleTyping);

    return () => {
      socket.emit("leaveChat", currentChat._id);
      socket.off("newMessage", handleNewMessage);
      socket.off("userTyping", handleTyping);
      clearTimeout(typingTimer.current);
    };
  }, [currentChat, socket, isConnected, user]);

  // ── Auto scroll to bottom ─────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // ── API calls ─────────────────────────
  const fetchChats = async () => {
    setChatsLoading(true);
    try {
      const res = await chatAPI.getUserChats();
      const fetched = res.data?.chats ?? res.data?.data ?? [];
      setAllChats(deduplicateChats(fetched));
    } catch (e) {
      console.error("fetchChats error:", e);
    } finally {
      setChatsLoading(false);
    }
  };

  const loadMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    setLoading(true);
    try {
      const res = await chatAPI.getMessages(chatId);
      setMessages(res.data?.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChatSelect = (chat) => {
    if (chat._id === currentChat?._id) return;
    setCurrentChat(chat);
    setMessages([]);
    loadMessages(chat._id);
    setShowSidebar(false);
  };

  const handleTypingEmit = () => {
    if (socket && currentChat) {
      socket.emit("typing", { chatId: currentChat._id, userId: user._id });
    }
  };

  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !currentChat) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimistic = {
      tempId,
      content: text,
      sender: user._id,
      chat: currentChat._id,
      timestamp: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setNewMessage("");

    try {
      const res = await chatAPI.sendMessage(currentChat._id, { content: text });
      const server = res.data?.message ?? res.data;
      setMessages((prev) =>
        prev.map((m) => (m.tempId === tempId ? { ...server } : m))
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.tempId === tempId ? { ...m, failed: true, pending: false } : m
        )
      );
    }
  };

  // ── Filtered chats ────────────────────
  const filteredChats = deduplicateChats(allChats).filter((chat) => {
    if (!searchQuery) return true;
    const other = getOtherParticipant(chat, user._id);
    if (!other) return false;
    return `${other.firstName} ${other.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const otherUser = currentChat
    ? getOtherParticipant(currentChat, user._id)
    : null;

  const groupedMessages = groupMessagesByDate(messages);

  // ── SIDEBAR ───────────────────────────
  const renderSidebar = () => (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>💬 Messages</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {chatsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#4ade80" />
        </View>
      ) : filteredChats.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>
            {searchQuery ? "🔍" : "💬"}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery ? "No conversations found" : "No conversations yet"}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {filteredChats.map((chat) => (
            <ChatListItem
              key={chat._id}
              chat={chat}
              active={currentChat?._id === chat._id}
              currentUserId={user._id}
              onPress={handleChatSelect}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );

  // ── MAIN CHAT ─────────────────────────
  const renderMessages = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4ade80" />
        </View>
      );
    }
    if (messages.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>Start the conversation!</Text>
        </View>
      );
    }

    return (
      <ScrollView
        ref={flatListRef}
        style={styles.messagesArea}
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {groupedMessages.map(({ date, messages: dayMsgs }) => (
          <View key={date}>
            {/* Date divider */}
            <View style={styles.dateDivider}>
              <View style={styles.dateDividerLine} />
              <Text style={styles.dateDividerText}>
                {formatDate(new Date(date))}
              </Text>
              <View style={styles.dateDividerLine} />
            </View>

            {dayMsgs.map((message, index) => {
              const isOwn =
                message.sender === user._id ||
                message.sender?._id === user._id;
              const showAvatar =
                index === 0 ||
                dayMsgs[index - 1]?.sender !== message.sender;

              return (
                <MessageBubble
                  key={message._id ?? message.tempId ?? index}
                  message={message}
                  isOwn={isOwn}
                  otherUser={otherUser}
                  showAvatar={showAvatar}
                />
              );
            })}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderMainChat = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setShowSidebar(true)}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>

        {otherUser && <Avatar user={otherUser} size={40} />}

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherUser
              ? `${otherUser.firstName} ${otherUser.lastName}`
              : "Chat"}
          </Text>
          {isTyping ? (
            <Text style={styles.typingIndicator}>typing...</Text>
          ) : (
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? "#4ade80" : "#94a3b8" },
                ]}
              />
              <Text style={styles.statusText}>
                {isConnected ? "Online" : "Offline"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Messages */}
      {renderMessages()}

      {/* Input */}
      <View style={styles.inputArea}>
        <View style={styles.inputWrapper}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={(text) => {
              setNewMessage(text);
              handleTypingEmit();
            }}
            placeholder="Type your message..."
            placeholderTextColor="#64748b"
            multiline
            maxHeight={100}
            editable={isConnected}
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>😊</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!newMessage.trim() || !isConnected) && styles.sendBtnDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || !isConnected}
          activeOpacity={0.85}
        >
          <Text style={styles.sendBtnText}>
            {isConnected ? "📤" : "⚠️"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ── NO CHAT SELECTED ──────────────────
  const renderNoChatSelected = () => (
    <View style={[styles.centered, { flex: 1 }]}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>Select a conversation</Text>
      <Text style={styles.emptyText}>Choose from the list to start chatting</Text>
    </View>
  );

  // ── ROOT RENDER ───────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {showSidebar ? (
        renderSidebar()
      ) : currentChat ? (
        renderMainChat()
      ) : (
        renderNoChatSelected()
      )}
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#0a0f1e" },
  centered:   { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },

  // Sidebar
  sidebar:       { flex: 1, backgroundColor: "#131c2e" },
  sidebarHeader: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
    backgroundColor: "#166534",
  },
  sidebarTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 12 },
  searchInput: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#f1f5f9",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  // Chat list items
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 3,
  },
  chatItemActive:         { backgroundColor: "#166534" },
  chatItemInfo:           { flex: 1, minWidth: 0 },
  chatItemName:           { fontWeight: "700", fontSize: 15, color: "#f1f5f9", marginBottom: 3 },
  chatItemNameActive:     { color: "#fff" },
  chatItemLastMsg:        { fontSize: 13, color: "#64748b" },
  chatItemLastMsgActive:  { color: "rgba(255,255,255,0.8)" },
  chatItemMeta:           { alignItems: "flex-end", gap: 6 },
  chatItemTime:           { fontSize: 11, color: "#64748b" },

  // Avatar
  avatar:     { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText: { fontWeight: "700" },

  // Online indicator
  onlineIndicator: {
    position: "absolute",
    bottom: 1, right: 1,
    width: 12, height: 12,
    backgroundColor: "#4ade80",
    borderWidth: 2,
    borderColor: "#131c2e",
    borderRadius: 6,
  },

  // Unread badge
  unreadBadge: {
    backgroundColor: "#4ade80",
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: "center",
  },
  unreadBadgeActive:     { backgroundColor: "#fff" },
  unreadBadgeText:       { color: "#0a0f1e", fontWeight: "700", fontSize: 11 },
  unreadBadgeTextActive: { color: "#166534" },

  // Chat header
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#131c2e",
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
  },
  backBtn:     { marginRight: 10, padding: 4 },
  backBtnText: { color: "#4ade80", fontSize: 22, fontWeight: "700" },
  headerName:  { fontSize: 16, fontWeight: "700", color: "#f1f5f9" },
  statusRow:   { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  statusText:  { fontSize: 12, color: "#94a3b8" },
  typingIndicator: { fontSize: 12, color: "#4ade80", fontStyle: "italic", marginTop: 2 },

  // Messages area
  messagesArea: { flex: 1, backgroundColor: "#0a0f1e", paddingHorizontal: 12 },

  // Date divider
  dateDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },
  dateDividerLine: { flex: 1, height: 1, backgroundColor: "#1e2d45" },
  dateDividerText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    backgroundColor: "#0a0f1e",
  },

  // Message bubbles
  messageBubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 6,
    gap: 8,
    paddingHorizontal: 4,
  },
  messageBubbleRowOwn:   { flexDirection: "row-reverse" },
  messageBubbleRowOther: { flexDirection: "row" },
  messageContent: {
    maxWidth: "70%",
    gap: 3,
  },
  messageContentOwn:   { alignItems: "flex-end" },
  messageContentOther: { alignItems: "flex-start" },
  messageText: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  messageTextOwn: {
    backgroundColor: "#4ade80",
    borderBottomRightRadius: 4,
  },
  messageTextOther: {
    backgroundColor: "#1e2d45",
    borderBottomLeftRadius: 4,
  },
  messageTextPending: { opacity: 0.6 },
  messageTextFailed:  { borderWidth: 1.5, borderColor: "#ef4444", opacity: 0.7 },
  messageTextContent: { fontSize: 14, lineHeight: 20 },
  pendingIcon:        { fontSize: 12 },
  failedLabel:        { fontSize: 11, color: "#ef4444" },
  messageTime: { fontSize: 11, color: "#64748b", marginTop: 2, paddingHorizontal: 2 },

  // Input area
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
    backgroundColor: "#131c2e",
    borderTopWidth: 1,
    borderTopColor: "#1e2d45",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e2d45",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  messageInput: {
    flex: 1,
    color: "#f1f5f9",
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: Platform.OS === "ios" ? 4 : 0,
  },
  iconBtn:     { padding: 4 },
  iconBtnText: { fontSize: 18, opacity: 0.7 },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#4ade80",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText:     { fontSize: 20 },

  // Empty states
  emptyIcon:  { fontSize: 56, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#f1f5f9", marginBottom: 6 },
  emptyText:  { fontSize: 14, color: "#94a3b8", textAlign: "center" },
});

export default ChatScreen;