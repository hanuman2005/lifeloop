// src/components/FloatingChatbot/index.js - React Native
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChatBot } from "../context/ChatBotContext";

// ─────────────────────────────────────────
// FALLBACK RESPONSES (unchanged logic)
// ─────────────────────────────────────────

const getFallbackResponse = (userMessage) => {
  const msg = userMessage.toLowerCase();

  if (msg.includes("ai") || msg.includes("analyze") || msg.includes("analysis"))
    return "🤖 Our AI Analysis feature is amazing!\n\n1. Upload a photo of your unwanted item\n2. AI detects what it is (phone, chair, clothes, etc.)\n3. Get 3 smart suggestions:\n   ✅ REUSE - Repair guides & tips\n   ♻️ RECYCLE - Nearby centers\n   🎁 DONATE - High demand items\n\n4. Choose your option and create a listing!\n\nThis helps you make the most sustainable choice! 🌍";

  if (msg.includes("what") && (msg.includes("donate") || msg.includes("list")))
    return "You can donate almost anything! 📦\n\nPopular categories:\n📱 Electronics\n🪑 Furniture\n👕 Clothing\n📚 Books & Media\n🍎 Food\n🧸 Toys & Baby Items\n🏠 Household Items\n🌱 Plants & Garden\n🎨 Hobby & Sports\n🔧 Tools\n\nIf it's in good condition, someone probably needs it!";

  if (
    msg.includes("donate") ||
    msg.includes("create listing") ||
    msg.includes("how to")
  )
    return "To donate an item:\n\n1. 🤖 Use AI Analysis (optional but recommended!)\n2. 📝 Click 'Create Listing'\n   - Choose category\n   - Add title & description\n   - Upload photos\n   - Set pickup location\n3. 📍 Your listing goes live!\n4. 🔔 Get notified when someone's interested\n5. 💬 Chat to coordinate pickup\n6. 📱 Exchange using QR verification\n\nIt's that simple!";

  if (
    msg.includes("find") ||
    msg.includes("nearby") ||
    msg.includes("search") ||
    msg.includes("browse")
  )
    return "To find items near you:\n\n1. 🗺️ Use the interactive map view\n   - See all nearby donations\n   - Filter by category\n   - Set distance radius\n\n2. 📋 Browse listings page\n   - Sort by distance, date, category\n\n3. 🔔 Enable notifications for new items nearby";

  if (
    msg.includes("qr") ||
    msg.includes("verify") ||
    msg.includes("verification") ||
    msg.includes("scan")
  )
    return "🔒 QR Code Verification keeps exchanges safe!\n\n1. After scheduling pickup, both users get QR codes\n2. At pickup:\n   - Recipient scans donor's QR code\n   - Confirms item matches listing\n3. Exchange completes automatically\n4. Listing marked as completed\n\nNo personal info shared until verified. 📱✅";

  if (
    msg.includes("schedule") ||
    msg.includes("pickup") ||
    msg.includes("time") ||
    msg.includes("when")
  )
    return "📅 Pickup Scheduling:\n\n1. After interest, open the chat\n2. Click 'Propose Pickup Time'\n3. Select date & time\n4. Recipient accepts or suggests alternative\n5. Both get confirmation with QR codes\n6. Automatic reminders sent!";

  if (
    msg.includes("rating") ||
    msg.includes("review") ||
    msg.includes("reputation")
  )
    return "⭐ Rating System builds trust!\n\nAfter exchange:\n1. Both users rate each other (1-5 stars)\n2. Optional written review\n3. Ratings appear on profiles\n\nBenefits:\n- Better AI matches\n- More listing responses\n- Community recognition";

  if (
    msg.includes("chat") ||
    msg.includes("message") ||
    msg.includes("contact")
  )
    return "💬 Real-time Chat:\n\n1. Click 'I Want This' on any listing\n2. Chat opens automatically\n3. Features:\n   - Instant messaging\n   - Typing indicators\n   - Message history saved\n4. Stay anonymous until pickup is scheduled!";

  if (msg.includes("safe") || msg.includes("safety") || msg.includes("secure"))
    return "🔒 Your Safety Matters!\n\n✅ No personal info until scheduled\n✅ QR code verification\n✅ Rating system filters bad actors\n✅ Report/block functionality\n✅ Public meeting spots recommended\n\nTips:\n- Meet in public places\n- Check user ratings first\n- Use QR verification always";

  if (msg.includes("help") || msg.includes("support") || msg.includes("how"))
    return "I can help you with:\n\n🤖 AI item analysis\n📝 Creating donations\n🔍 Finding items nearby\n💬 Chat & messaging\n📅 Pickup scheduling\n📱 QR verification\n⭐ Rating system\n🔒 Safety tips\n\nWhat would you like to know?";

  return "I'm here to help! You can ask me about:\n\n🤖 How AI analysis works\n📦 What you can donate\n🔍 Finding items near you\n📱 QR code verification\n💬 Chat & coordination\n⭐ Rating system\n🔒 Safety features\n\nWhat would you like to know?";
};

// ─────────────────────────────────────────
// TYPING DOTS
// ─────────────────────────────────────────

const TypingDots = () => {
  const anims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const makeAnim = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(700),
        ]),
      );
    const a0 = makeAnim(anims[0], 0);
    const a1 = makeAnim(anims[1], 160);
    const a2 = makeAnim(anims[2], 320);
    a0.start();
    a1.start();
    a2.start();
    return () => {
      a0.stop();
      a1.stop();
      a2.stop();
    };
  }, []);

  return (
    <View style={styles.typingBubble}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[styles.typingDot, { transform: [{ translateY: anim }] }]}
        />
      ))}
    </View>
  );
};

// ─────────────────────────────────────────
// QUICK REPLIES
// ─────────────────────────────────────────

const QUICK_REPLIES = [
  "How does AI analysis work?",
  "What can I donate?",
  "How does QR verification work?",
  "Find items near me",
];

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

const FloatingChatbot = () => {
  const { isChatBotOpen: isOpen, toggleChatBot, closeChatBot } = useChatBot();
  const [messages, setMessages] = useState([
    {
      text: "Hi! I'm your LifeLoop assistant. I can help you donate or find items like electronics, furniture, clothing, food, and more! 🎁",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const scrollRef = useRef(null);
  const fabPulse = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  // FAB pulse animation
  useEffect(() => {
    if (!isOpen) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fabPulse, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(fabPulse, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      fabPulse.setValue(1);
    }
  }, [isOpen]);

  // Slide-in animation when opening
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOpen ? 0 : 300,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isTyping]);

  const handleSend = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;

    const userMessage = { text, sender: "user", timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("http://localhost:5000/api/chatbot/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.slice(-6),
        }),
      });
      if (!response.ok) throw new Error("API unavailable");
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          text: data.reply || getFallbackResponse(text),
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          text: getFallbackResponse(text),
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const showQuickReplies = messages.length <= 2;

  return (
    <>
      {/* ── Modal Chat Window ─────────── */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => closeChatBot()}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.chatWindow,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Header */}
            <View style={styles.chatHeader}>
              <View style={styles.botAvatar}>
                <Text style={styles.botAvatarText}>🤖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatHeaderTitle}>LifeLoop Assistant</Text>
                <Text style={styles.chatHeaderSub}>AI-powered help 24/7</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => closeChatBot()}
                activeOpacity={0.8}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
              <ScrollView
                ref={scrollRef}
                style={styles.messagesArea}
                contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((msg, i) => (
                  <View
                    key={i}
                    style={[
                      styles.messageRow,
                      msg.sender === "user"
                        ? styles.messageRowUser
                        : styles.messageRowBot,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        msg.sender === "user"
                          ? styles.messageBubbleUser
                          : styles.messageBubbleBot,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageBubbleText,
                          msg.sender === "user"
                            ? styles.messageBubbleTextUser
                            : styles.messageBubbleTextBot,
                        ]}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  </View>
                ))}

                {isTyping && (
                  <View style={styles.messageRowBot}>
                    <TypingDots />
                  </View>
                )}
              </ScrollView>

              {/* Quick Replies */}
              {showQuickReplies && (
                <View style={styles.quickRepliesContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
                  >
                    {QUICK_REPLIES.map((reply, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.quickReplyBtn}
                        onPress={() => handleSend(reply)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickReplyBtnText}>{reply}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Input */}
              <View style={styles.inputArea}>
                <TextInput
                  style={styles.textInput}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask me anything..."
                  placeholderTextColor="#64748b"
                  onSubmitEditing={() => handleSend()}
                  returnKeyType="send"
                  multiline={false}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    !input.trim() && styles.sendBtnDisabled,
                  ]}
                  onPress={() => handleSend()}
                  disabled={!input.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sendBtnText}>📤</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Floating Action Button ────── */}
      <Animated.View
        style={[styles.fabContainer, { transform: [{ scale: fabPulse }] }]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => toggleChatBot()}
          activeOpacity={0.9}
        >
          <Text style={styles.fabText}>{isOpen ? "✕" : "💬"}</Text>
        </TouchableOpacity>
        {!isOpen && <View style={styles.fabNotificationDot} />}
      </Animated.View>
    </>
  );
};

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 90, // above FAB
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 99998,
  },
  chatWindow: {
    backgroundColor: "#131c2e",
    borderRadius: 24,
    height: 520,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },

  // Header
  chatHeader: {
    backgroundColor: "#166534",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  botAvatarText: { fontSize: 20 },
  chatHeaderTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  chatHeaderSub: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 1 },
  closeBtn: { padding: 6 },
  closeBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },

  // Messages
  messagesArea: { flex: 1, backgroundColor: "#0a0f1e" },
  messageRow: { marginBottom: 12 },
  messageRowUser: { alignItems: "flex-end" },
  messageRowBot: { alignItems: "flex-start" },
  messageBubble: {
    maxWidth: "78%",
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleUser: {
    backgroundColor: "#4ade80",
    borderBottomRightRadius: 4,
  },
  messageBubbleBot: {
    backgroundColor: "#1e2d45",
    borderBottomLeftRadius: 4,
  },
  messageBubbleText: { fontSize: 13, lineHeight: 19 },
  messageBubbleTextUser: { color: "#0a0f1e" },
  messageBubbleTextBot: { color: "#f1f5f9" },

  // Typing dots
  typingBubble: {
    backgroundColor: "#1e2d45",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#64748b",
  },

  // Quick replies
  quickRepliesContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1e2d45",
    backgroundColor: "#131c2e",
  },
  quickReplyBtn: {
    backgroundColor: "#1e2d45",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickReplyBtnText: { color: "#94a3b8", fontSize: 12, fontWeight: "500" },

  // Input
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
    backgroundColor: "#131c2e",
    borderTopWidth: 1,
    borderTopColor: "#1e2d45",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#1e2d45",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#f1f5f9",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4ade80",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#1e2d45", opacity: 0.5 },
  sendBtnText: { fontSize: 18 },

  // FAB
  fabContainer: {
    position: "absolute",
    bottom: 85,
    right: 20,
    zIndex: 99999,
    elevation: 20,
    pointerEvents: "box-none",
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#4ade80",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 20,
  },
  fabText: { fontSize: 26 },
  fabNotificationDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    borderWidth: 2,
    borderColor: "#0a0f1e",
  },
});

export default FloatingChatbot;
