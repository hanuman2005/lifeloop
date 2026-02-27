// src/screens/UpcycleScreen.js - React Native
// Gemini generates upcycle ideas + YouTube shows tutorials
// Navigation params: { item, category, imageUri }

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Image,
  Linking,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SW } = Dimensions.get("window");
const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";
const YOUTUBE_KEY = process.env.EXPO_PUBLIC_YOUTUBE_KEY || "";

// ─────────────────────────────────────────────────────────
// FIXED: use native fetch → /api/ai/upcycle
// Original used aiAPI.analyzeImage() which returns axios object
// Calling .json() on axios object = "response.json is not a function"
// ─────────────────────────────────────────────────────────
const generateUpcycleIdeas = async (item, category, token) => {
  const prompt = `You are a creative upcycling expert. Give me 4 CREATIVE upcycling transformation ideas for: "${item}" (category: ${category}).

Upcycling means transforming the item into something NEW and MORE VALUABLE, not just reusing it as-is.

Respond ONLY with a JSON array, no markdown:
[
  {
    "title": "Transformation title",
    "description": "2 sentence description of what it becomes",
    "difficulty": "Easy|Medium|Hard",
    "timeMin": 45,
    "toolsNeeded": ["tool1", "tool2"],
    "materials": ["additional material1"],
    "steps": ["Step 1", "Step 2", "Step 3", "Step 4"],
    "valueAdded": "What new value does this create?",
    "youtubeQuery": "upcycle ${item} into something new diy"
  }
]`;

  const response = await fetch(
    BACKEND_URL.includes("/api")
      ? `${BACKEND_URL}/ai/upcycle`
      : `${BACKEND_URL}/api/ai/upcycle`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ prompt, material: category, item }),
    },
  );

  if (!response.ok) throw new Error(`Server error: ${response.status}`);

  const data = await response.json();

  if (Array.isArray(data.ideas) && data.ideas.length > 0) return data.ideas;
  throw new Error("No ideas returned from server");
};

// ─────────────────────────────────────────────────────────
// YOUTUBE search
// ─────────────────────────────────────────────────────────
const searchYouTube = async (query) => {
  if (!YOUTUBE_KEY) return [];
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=2&key=${YOUTUBE_KEY}`;
    const r = await fetch(url);
    const d = await r.json();
    return (d.items || []).map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));
  } catch {
    return [];
  }
};

// ─────────────────────────────────────────────────────────
// DIFFICULTY BADGE
// ─────────────────────────────────────────────────────────
const DiffBadge = ({ level }) => {
  const map = {
    Easy: { bg: "rgba(74,222,128,0.15)", color: "#4ade80" },
    Medium: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
    Hard: { bg: "rgba(248,113,113,0.15)", color: "#f87171" },
  };
  const c = map[level] || map.Medium;
  return (
    <View style={[st.diffBadge, { backgroundColor: c.bg }]}>
      <Text style={[st.diffText, { color: c.color }]}>{level}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────
// YOUTUBE CARD
// ─────────────────────────────────────────────────────────
const YouTubeCard = ({ video }) => (
  <TouchableOpacity
    style={st.ytCard}
    onPress={() => Linking.openURL(video.url)}
    activeOpacity={0.85}
  >
    <Image source={{ uri: video.thumbnail }} style={st.ytThumb} />
    <View style={st.ytPlayBtn}>
      <Text style={{ color: "#fff", fontSize: 14 }}>▶</Text>
    </View>
    <View style={st.ytInfo}>
      <Text style={st.ytTitle} numberOfLines={2}>
        {video.title}
      </Text>
      <Text style={st.ytChannel}>{video.channel}</Text>
    </View>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────
// IDEA CARD
// ─────────────────────────────────────────────────────────
const IdeaCard = ({ idea, index, expanded, onToggle }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [videos, setVideos] = useState([]);
  const [loadingVids, setLoadingVids] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (expanded && videos.length === 0 && YOUTUBE_KEY) {
      setLoadingVids(true);
      searchYouTube(idea.youtubeQuery || `upcycle ${idea.title} diy`).then(
        (v) => {
          setVideos(v);
          setLoadingVids(false);
        },
      );
    }
  }, [expanded]);

  return (
    <Animated.View
      style={[
        st.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
        <View style={st.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={st.cardTitle}>{idea.title}</Text>
            <View style={st.cardMeta}>
              <DiffBadge level={idea.difficulty} />
              <Text style={st.cardTime}>⏱ {idea.timeMin} min</Text>
            </View>
          </View>
          <View style={st.transformBadge}>
            <Text style={st.transformText}>✨ Upcycle</Text>
          </View>
        </View>
        <Text style={st.cardDesc}>{idea.description}</Text>
        {idea.valueAdded && (
          <View style={st.valueRow}>
            <Text style={st.valueIcon}>💎</Text>
            <Text style={st.valueText}>{idea.valueAdded}</Text>
          </View>
        )}
        <Text style={st.expandHint}>
          {expanded ? "▲ Collapse" : "▼ See steps & tutorials"}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={st.expanded}>
          {idea.toolsNeeded?.length > 0 && (
            <>
              <Text style={st.sectionLabel}>🔧 Tools needed</Text>
              <View style={st.chipsRow}>
                {idea.toolsNeeded.map((t, i) => (
                  <View key={i} style={st.chip}>
                    <Text style={st.chipText}>{t}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          {idea.materials?.length > 0 && (
            <>
              <Text style={st.sectionLabel}>📦 Additional materials</Text>
              <View style={st.chipsRow}>
                {idea.materials.map((m, i) => (
                  <View key={i} style={[st.chip, st.chipAlt]}>
                    <Text style={[st.chipText, { color: "#f59e0b" }]}>{m}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          <Text style={st.sectionLabel}>📋 How to do it</Text>
          {idea.steps?.map((step, i) => (
            <View key={i} style={st.stepRow}>
              <View style={st.stepNum}>
                <Text style={st.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={st.stepText}>{step}</Text>
            </View>
          ))}
          <Text style={st.sectionLabel}>🎬 Tutorial Videos</Text>
          {!YOUTUBE_KEY && (
            <TouchableOpacity
              style={st.ytSearchBtn}
              onPress={() =>
                Linking.openURL(
                  `https://www.youtube.com/results?search_query=${encodeURIComponent(idea.youtubeQuery || idea.title + " upcycle diy")}`,
                )
              }
            >
              <Text style={st.ytSearchBtnText}>🔍 Search on YouTube</Text>
            </TouchableOpacity>
          )}
          {YOUTUBE_KEY && loadingVids && (
            <ActivityIndicator color="#f59e0b" style={{ marginVertical: 10 }} />
          )}
          {YOUTUBE_KEY &&
            !loadingVids &&
            videos.map((v) => <YouTubeCard key={v.id} video={v} />)}
        </View>
      )}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────
const UpcycleScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { item = "item", category = "General", imageUri } = route.params || {};

  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(0);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      const data = await generateUpcycleIdeas(item, category, token);
      setIdeas(data);
    } catch (err) {
      console.error("Upcycle ideas error:", err);
      setError("Failed to generate ideas from Gemini. Please try again.");
      // NO fallback - only show Gemini data
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={st.container}>
      <Animated.View style={[st.header, { opacity: headerAnim }]}>
        <TouchableOpacity
          style={st.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={st.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>✨ Upcycle Ideas</Text>
          <Text style={st.headerSub} numberOfLines={1}>
            {item} · {category}
          </Text>
        </View>
        <TouchableOpacity
          style={st.refreshBtn}
          onPress={loadIdeas}
          activeOpacity={0.8}
        >
          <Text style={st.refreshBtnText}>↺</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
      >
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={st.heroImg}
            resizeMode="cover"
          />
        )}

        <View style={st.geminiBadge}>
          <Text style={st.geminiBadgeText}>✦ Upcycle ideas by Gemini AI</Text>
        </View>

        {loading && (
          <View style={st.loadingBox}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={st.loadingText}>
              Gemini is crafting upcycle ideas...
            </Text>
          </View>
        )}

        {!loading && error && (
          <View style={st.errorBox}>
            <Text style={st.errorText}>{error}</Text>
            <TouchableOpacity style={st.retryBtn} onPress={loadIdeas}>
              <Text style={st.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading &&
          ideas.map((idea, idx) => (
            <IdeaCard
              key={idx}
              idea={idea}
              index={idx}
              expanded={expandedIdx === idx}
              onToggle={() => setExpandedIdx(expandedIdx === idx ? -1 : idx)}
            />
          ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────
// STYLES — IDENTICAL TO ORIGINAL, ZERO CHANGES
// ─────────────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1e2d45",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { color: "#f1f5f9", fontSize: 18, fontWeight: "700" },
  headerTitle: { color: "#f1f5f9", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#64748b", fontSize: 12 },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1e2d45",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtnText: { color: "#f59e0b", fontSize: 20, fontWeight: "700" },
  scroll: { padding: 16 },
  heroImg: { width: "100%", height: 180, borderRadius: 16, marginBottom: 14 },
  geminiBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    marginBottom: 20,
  },
  geminiBadgeText: { color: "#f59e0b", fontSize: 12, fontWeight: "600" },
  loadingBox: { alignItems: "center", paddingVertical: 60, gap: 16 },
  loadingText: { color: "#94a3b8", fontSize: 14 },
  errorBox: {
    backgroundColor: "rgba(248,113,113,0.1)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
  },
  errorText: { color: "#f87171", fontSize: 13, textAlign: "center" },
  retryBtn: {
    backgroundColor: "#1e2d45",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryText: { color: "#f59e0b", fontWeight: "700" },
  card: {
    backgroundColor: "#131c2e",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    color: "#f1f5f9",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  diffBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  diffText: { fontSize: 11, fontWeight: "700" },
  cardTime: { color: "#64748b", fontSize: 12 },
  transformBadge: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  transformText: { color: "#f59e0b", fontSize: 11, fontWeight: "700" },
  cardDesc: { color: "#94a3b8", fontSize: 13, lineHeight: 19, marginBottom: 8 },
  valueRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#1e2d45",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  valueIcon: { fontSize: 16 },
  valueText: { flex: 1, color: "#94a3b8", fontSize: 12, lineHeight: 17 },
  expandHint: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  expanded: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#1e2d45",
    paddingTop: 16,
  },
  sectionLabel: {
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 8,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: "#1e2d45",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#334155",
  },
  chipAlt: { borderColor: "rgba(245,158,11,0.3)" },
  chipText: { color: "#94a3b8", fontSize: 12 },
  stepRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#1e2d45",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumText: { color: "#f59e0b", fontSize: 12, fontWeight: "700" },
  stepText: { flex: 1, color: "#94a3b8", fontSize: 13, lineHeight: 19 },
  ytSearchBtn: {
    backgroundColor: "#ff0000",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  ytSearchBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  ytCard: {
    backgroundColor: "#0a0f1e",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  ytThumb: { width: "100%", height: 140 },
  ytPlayBtn: {
    position: "absolute",
    top: 50,
    left: "50%",
    marginLeft: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  ytInfo: { padding: 10 },
  ytTitle: {
    color: "#f1f5f9",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  ytChannel: { color: "#64748b", fontSize: 11 },
});

export default UpcycleScreen;
