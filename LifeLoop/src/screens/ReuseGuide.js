// src/screens/ReuseGuideScreen.js
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";
const YOUTUBE_KEY = process.env.EXPO_PUBLIC_YOUTUBE_KEY || "";

// ─── API call ────────────────────────────────────────────────────────────────
const fetchReuseIdeas = async (item, category, token) => {
  const prompt = `You are a sustainability expert helping people creatively reuse waste items.
Give exactly 4 PRACTICAL reuse ideas for: "${item}" (material: ${category}).
Reuse = find new purpose AS-IS with minimal effort.
RESPOND ONLY WITH A JSON ARRAY. No text before or after. No markdown fences.
[
  {
    "title": "Reuse idea name",
    "description": "2 sentences describing the reuse and its benefit",
    "difficulty": "Easy",
    "timeMin": 15,
    "materials": ["item needed if any"],
    "steps": ["Step 1", "Step 2", "Step 3"],
    "youtubeQuery": "how to reuse ${item} at home diy"
  }
]
All 4 ideas must be different and specific to ${category}.`;

  const endpoint = BACKEND_URL.endsWith("/api")
    ? `${BACKEND_URL}/ai/upcycle`
    : `${BACKEND_URL}/api/ai/upcycle`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ prompt, material: category, item }),
  });

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.error || `Server error: ${response.status}`);
    err.status = response.status;
    err.retryAfter = data.retryAfter || 60;
    throw err;
  }

  if (data.success && Array.isArray(data.ideas) && data.ideas.length > 0) {
    return data.ideas;
  }
  throw new Error("No ideas returned from server");
};

// ─── YouTube ─────────────────────────────────────────────────────────────────
const searchYouTube = async (query) => {
  if (!YOUTUBE_KEY) return [];
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=3&key=${YOUTUBE_KEY}`;
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

// ─── DiffBadge ───────────────────────────────────────────────────────────────
const DiffBadge = ({ level }) => {
  const map = {
    Easy: { bg: "rgba(74,222,128,0.15)", color: "#4ade80" },
    Medium: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
    Hard: { bg: "rgba(248,113,113,0.15)", color: "#f87171" },
  };
  const c = map[level] || map.Medium;
  return (
    <View style={[s.diffBadge, { backgroundColor: c.bg }]}>
      <Text style={[s.diffText, { color: c.color }]}>{level}</Text>
    </View>
  );
};

// ─── YouTube Card ─────────────────────────────────────────────────────────────
const YouTubeCard = ({ video }) => (
  <TouchableOpacity
    style={s.ytCard}
    onPress={() => Linking.openURL(video.url)}
    activeOpacity={0.85}
  >
    <Image source={{ uri: video.thumbnail }} style={s.ytThumb} />
    <View style={s.ytPlayBtn}>
      <Text style={{ color: "#fff", fontSize: 14 }}>▶</Text>
    </View>
    <View style={s.ytInfo}>
      <Text style={s.ytTitle} numberOfLines={2}>
        {video.title}
      </Text>
      <Text style={s.ytChannel}>{video.channel}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Idea Card ───────────────────────────────────────────────────────────────
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
      searchYouTube(idea.youtubeQuery || `how to reuse ${idea.title} diy`).then(
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
        s.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{idea.title}</Text>
            <View style={s.cardMeta}>
              <DiffBadge level={idea.difficulty} />
              <Text style={s.cardTime}>⏱ {idea.timeMin} min</Text>
            </View>
          </View>
          <Text style={s.expandIcon}>{expanded ? "▲" : "▼"}</Text>
        </View>
        <Text style={s.cardDesc}>{idea.description}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={s.expanded}>
          {idea.materials?.length > 0 && (
            <>
              <Text style={s.secLabel}>🔧 Materials needed</Text>
              <View style={s.chipsRow}>
                {idea.materials.map((m, i) => (
                  <View key={i} style={s.chip}>
                    <Text style={s.chipText}>{m}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={s.secLabel}>📋 Steps</Text>
          {idea.steps?.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepNum}>
                <Text style={s.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}

          <Text style={s.secLabel}>🎬 Watch Tutorials</Text>
          {!YOUTUBE_KEY && (
            <TouchableOpacity
              style={s.ytSearchBtn}
              onPress={() =>
                Linking.openURL(
                  `https://www.youtube.com/results?search_query=${encodeURIComponent(idea.youtubeQuery || idea.title + " diy reuse")}`,
                )
              }
            >
              <Text style={s.ytSearchBtnText}>🔍 Search on YouTube</Text>
            </TouchableOpacity>
          )}
          {YOUTUBE_KEY && loadingVids && (
            <ActivityIndicator color="#60a5fa" style={{ marginVertical: 10 }} />
          )}
          {YOUTUBE_KEY &&
            !loadingVids &&
            videos.map((v) => <YouTubeCard key={v.id} video={v} />)}
          {YOUTUBE_KEY && !loadingVids && videos.length === 0 && (
            <TouchableOpacity
              style={s.ytSearchBtn}
              onPress={() =>
                Linking.openURL(
                  `https://www.youtube.com/results?search_query=${encodeURIComponent(idea.youtubeQuery || idea.title + " diy reuse")}`,
                )
              }
            >
              <Text style={s.ytSearchBtnText}>🔍 Search on YouTube</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );
};

// ─── Retry Countdown ─────────────────────────────────────────────────────────
const RetryCountdown = ({ seconds, onRetry }) => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onRetry();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  return (
    <View style={s.retryBox}>
      <Text style={s.retryIcon}>⏳</Text>
      <Text style={s.retryTitle}>AI rate limit reached</Text>
      <Text style={s.retrySub}>Auto-retrying in {remaining}s...</Text>
      <View style={s.retryBarBg}>
        <View
          style={[
            s.retryBarFill,
            { width: `${((seconds - remaining) / seconds) * 100}%` },
          ]}
        />
      </View>
      <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
        <Text style={s.retryBtnText}>Retry Now</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const ReuseGuideScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { item = "item", category = "General", imageUri } = route.params || {};

  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null); // seconds countdown
  const [expandedIdx, setExpandedIdx] = useState(0);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    setLoading(true);
    setError(null);
    setRetryAfter(null);
    try {
      const token = await AsyncStorage.getItem("token");
      const data = await fetchReuseIdeas(item, category, token);
      console.log("🎯 Reuse ideas received:", JSON.stringify(data, null, 2));
      console.log("📊 First idea has youtubeQuery?", data[0]?.youtubeQuery);
      setIdeas(data);
    } catch (err) {
      console.error("Reuse ideas error:", err.message);
      if (err.status === 429) {
        setRetryAfter(err.retryAfter || 60);
      } else {
        setError(err.message || "Failed to generate ideas. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <Animated.View style={[s.header, { opacity: headerAnim }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>🔄 Reuse Ideas</Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {item} · {category}
          </Text>
        </View>
        <TouchableOpacity
          style={s.refreshBtn}
          onPress={loadIdeas}
          activeOpacity={0.8}
        >
          <Text style={s.refreshBtnText}>↺</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={s.heroImg}
            resizeMode="cover"
          />
        )}

        <View style={s.badge}>
          <Text style={s.badgeText}>✦ Ideas generated by AI</Text>
        </View>

        {/* Loading */}
        {loading && (
          <View style={s.centerBox}>
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={s.loadingText}>
              AI is generating ideas for {item}...
            </Text>
          </View>
        )}

        {/* Rate limit countdown */}
        {!loading && retryAfter !== null && (
          <RetryCountdown seconds={retryAfter} onRetry={loadIdeas} />
        )}

        {/* Generic error */}
        {!loading && error && retryAfter === null && (
          <View style={s.errorBox}>
            <Text style={s.errorIcon}>❌</Text>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={loadIdeas}>
              <Text style={s.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Ideas */}
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
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
  refreshBtnText: { color: "#60a5fa", fontSize: 20, fontWeight: "700" },
  scroll: { padding: 16 },
  heroImg: { width: "100%", height: 180, borderRadius: 16, marginBottom: 14 },
  badge: {
    alignSelf: "center",
    backgroundColor: "rgba(96,165,250,0.1)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.3)",
    marginBottom: 20,
  },
  badgeText: { color: "#60a5fa", fontSize: 12, fontWeight: "600" },
  centerBox: { alignItems: "center", paddingVertical: 60, gap: 16 },
  loadingText: { color: "#94a3b8", fontSize: 14, textAlign: "center" },

  // Retry countdown
  retryBox: {
    backgroundColor: "#131c2e",
    borderRadius: 18,
    padding: 24,
    marginBottom: 16,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.4)",
  },
  retryIcon: { fontSize: 36 },
  retryTitle: { color: "#f59e0b", fontSize: 16, fontWeight: "800" },
  retrySub: { color: "#94a3b8", fontSize: 13 },
  retryBarBg: {
    width: "100%",
    height: 6,
    backgroundColor: "#1e2d45",
    borderRadius: 3,
    overflow: "hidden",
  },
  retryBarFill: { height: 6, backgroundColor: "#f59e0b", borderRadius: 3 },
  retryBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryBtnText: { color: "#0a0f1e", fontWeight: "800", fontSize: 14 },

  // Error
  errorBox: {
    backgroundColor: "rgba(248,113,113,0.1)",
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
  },
  errorIcon: { fontSize: 28 },
  errorText: {
    color: "#f87171",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  // Idea card
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
  expandIcon: { color: "#64748b", fontSize: 14, marginTop: 2 },
  cardDesc: { color: "#94a3b8", fontSize: 13, lineHeight: 19 },
  expanded: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#1e2d45",
    paddingTop: 16,
  },
  secLabel: {
    color: "#60a5fa",
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
  stepNumText: { color: "#60a5fa", fontSize: 12, fontWeight: "700" },
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
    top: 48,
    left: "45%",
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

export default ReuseGuideScreen;
