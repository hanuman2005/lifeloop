// src/screens/WasteAnalyzer.js - React Native | MobileNet AI + Probability Analysis
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NearbyCentersSection from "../components/NearbyCenters";
import { uploadPrimaryImage } from "../utils/imageUpload";
import configAPI from "../services/configAPI";
import Constants from "expo-constants";

const { width: SW } = Dimensions.get("window");
const API_URL =
  Constants.expoConfig?.extra?.API_URL || "http://localhost:5000/api";
const BACKEND_URL = API_URL.replace(/\/api\/?$/, ""); // strip trailing /api

// ═══════════════════════════════════════════════════════════════════════════
// WASTE CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════
const WASTE_CATEGORIES = [
  {
    id: "Plastic",
    label: "Plastic",
    icon: "🧴",
    color: "#3b82f6",
    bg: "#eff6ff",
    border: "#93c5fd",
    examples: "Bottles, bags, containers",
    keywords: ["bottle", "bag", "container", "cup", "plastic", "wrap"],
  },
  {
    id: "Glass",
    label: "Glass",
    icon: "🍶",
    color: "#0891b2",
    bg: "#ecfeff",
    border: "#67e8f9",
    examples: "Bottles, jars, glasses",
    keywords: ["bottle", "jar", "glass", "vase"],
  },
  {
    id: "Metal",
    label: "Metal",
    icon: "🥫",
    color: "#6b7280",
    bg: "#f3f4f6",
    border: "#9ca3af",
    examples: "Cans, tins, foil",
    keywords: ["can", "tin", "metal", "foil", "screw", "nail"],
  },
  {
    id: "Paper",
    label: "Paper / Cardboard",
    icon: "📦",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fcd34d",
    examples: "Boxes, books, newspapers",
    keywords: ["box", "paper", "cardboard", "book", "notebook"],
  },
  {
    id: "Organic",
    label: "Organic / Food",
    icon: "🥦",
    color: "#16a34a",
    bg: "#dcfce7",
    border: "#86efac",
    examples: "Fruits, vegetables, scraps",
    keywords: ["fruit", "vegetable", "food", "leaf", "plant"],
  },
  {
    id: "Electronic",
    label: "E-Waste",
    icon: "📱",
    color: "#7c3aed",
    bg: "#ede9fe",
    border: "#c4b5fd",
    examples: "Phones, batteries, cables",
    keywords: ["phone", "battery", "cable", "charger", "device"],
  },
  {
    id: "Textile",
    label: "Clothing",
    icon: "👕",
    color: "#db2777",
    bg: "#fce7f3",
    border: "#f9a8d4",
    examples: "Clothes, shoes, fabric",
    keywords: ["cloth", "fabric", "shirt", "shoe", "towel"],
  },
  {
    id: "Wood",
    label: "Wood",
    icon: "🪵",
    color: "#92400e",
    bg: "#fef3c7",
    border: "#fde68a",
    examples: "Furniture, sticks, planks",
    keywords: ["wood", "stick", "furniture", "timber"],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY ADVICE DATABASE
// ═══════════════════════════════════════════════════════════════════════════
const CATEGORY_ADVICE = {
  Plastic: {
    recyclingGuidance:
      "Check recycling number. #1 (PET) and #2 (HDPE) accepted curbside. Rinse before recycling.",
    hazardIfThrown:
      "🚨 If thrown as trash: Breaks into microplastics that harm marine life and enter food chain. Takes 450+ years to decompose. Leaches toxic chemicals into soil and groundwater.",
    reuseIdeas: [
      "Use as a planter for herbs",
      "Store craft supplies",
      "Make a bird feeder",
      "Create cable organizer",
    ],
    donationPossible: false,
    impact: {
      carbonSaved: 0.5,
      wasteDiverted: 0.3,
      ecoScore: 15,
      carbonPenalty: 2.5,
    },
    education: {
      didYouKnow: "Plastic takes 450+ years to decompose in landfills",
      localImpact: "India produces 3.4M tonnes of plastic waste annually",
      studentAction: "Use reusable bottles and lunch boxes at school",
    },
    baseProbabilities: { recycle: 65, reuse: 55, upcycle: 40, donate: 10 },
  },
  Glass: {
    recyclingGuidance:
      "Glass is 100% recyclable endlessly. Rinse and remove lids. Separate by color.",
    hazardIfThrown:
      "🚨 If thrown as trash: Sharp fragments cause injuries to waste workers. Takes 1M+ years to decompose. Breaks into sharp pieces hazardous in landfills and oceans.",
    reuseIdeas: [
      "Use as a vase",
      "Store homemade jams",
      "Make a candle holder",
      "Create a terrarium",
    ],
    donationPossible: true,
    impact: {
      carbonSaved: 0.3,
      wasteDiverted: 0.5,
      ecoScore: 20,
      carbonPenalty: 1.8,
    },
    education: {
      didYouKnow: "Recycling glass saves 30% energy vs making new glass",
      localImpact:
        "Glass bottles can be recycled infinitely without quality loss",
      studentAction: "Collect glass jars for art projects or storage",
    },
    baseProbabilities: { recycle: 90, reuse: 70, upcycle: 60, donate: 30 },
  },
  Metal: {
    recyclingGuidance:
      "Metal is highly valuable. Rinse food cans. Both aluminum and steel are recyclable.",
    hazardIfThrown:
      "🚨 If thrown as trash: Rust releases toxic substances into groundwater. Takes 200+ years to decompose. Valuable resources wasted that could be reclaimed from scrap metal.",
    reuseIdeas: [
      "Use tins as pencil holders",
      "Make a small planter",
      "Store hardware items",
      "Create lanterns",
    ],
    donationPossible: false,
    impact: {
      carbonSaved: 1.5,
      wasteDiverted: 0.4,
      ecoScore: 30,
      carbonPenalty: 4.2,
    },
    education: {
      didYouKnow: "Recycling aluminum saves 95% of energy needed for new cans",
      localImpact: "India exports over 5M tonnes of scrap metal annually",
      studentAction: "Start a can collection drive in your school",
    },
    baseProbabilities: { recycle: 85, reuse: 50, upcycle: 45, donate: 5 },
  },
  Paper: {
    recyclingGuidance:
      "Keep paper dry and clean. Remove plastic windows. Flatten cardboard boxes.",
    hazardIfThrown:
      "🚨 If thrown as trash: Harmful inks contaminate soil and waterways. Contributes to deforestation pressure (1 ton of paper = 17 trees). Takes years to decompose and releases degrading chemicals.",
    reuseIdeas: [
      "Use for notes or sketching",
      "Make paper mache art",
      "Create gift wrap",
      "Build storage boxes",
    ],
    donationPossible: true,
    impact: {
      carbonSaved: 0.2,
      wasteDiverted: 0.4,
      ecoScore: 10,
      carbonPenalty: 1.2,
    },
    education: {
      didYouKnow: "Recycling 1 ton of paper saves 17 trees",
      localImpact: "Paper accounts for 25% of landfill waste in India",
      studentAction: "Use both sides of paper and recycle old notebooks",
    },
    baseProbabilities: { recycle: 75, reuse: 60, upcycle: 55, donate: 20 },
  },
  Organic: {
    recyclingGuidance:
      "Perfect for composting. Home compost or community bins turn waste into fertilizer.",
    hazardIfThrown:
      "🚨 If thrown as trash: Produces methane (25x worse than CO₂) in landfills. Releases foul odors attracting pests and disease vectors. Creates leachate contaminating soil and water. 67M tonnes wasted in India annually.",
    reuseIdeas: [
      "Compost for garden soil",
      "Use peels as deodorizer",
      "Make vegetable broth",
      "Feed to chickens",
    ],
    donationPossible: false,
    impact: {
      carbonSaved: 0.1,
      wasteDiverted: 0.2,
      ecoScore: 8,
      carbonPenalty: 3.5,
    },
    education: {
      didYouKnow: "Food waste produces methane, 25x worse than CO₂",
      localImpact: "India wastes 67M tonnes of food worth ₹92,000 crores/year",
      studentAction: "Start a school composting program",
    },
    baseProbabilities: { recycle: 20, reuse: 45, upcycle: 30, donate: 5 },
  },
  Electronic: {
    recyclingGuidance:
      "Never in general bins! Take to certified e-waste centers. Remove personal data first.",
    hazardIfThrown:
      "🚨 If thrown as trash: HIGHLY TOXIC - Contains lead, mercury, cadmium poisoning soil & water. Damages ecosystems for decades. Carcinogenic substances leach into groundwater harming communities. Only 10% of India's e-waste properly recycled.",
    reuseIdeas: [
      "Donate working devices",
      "Sell parts online",
      "Repurpose as media player",
      "Use as security camera",
    ],
    donationPossible: true,
    impact: {
      carbonSaved: 3.0,
      wasteDiverted: 0.8,
      ecoScore: 40,
      carbonPenalty: 12.5,
    },
    education: {
      didYouKnow: "E-waste contains gold, silver, and rare earth metals",
      localImpact: "India generates 3.2M tonnes of e-waste, only 10% recycled",
      studentAction: "Organize an e-waste collection drive",
    },
    baseProbabilities: { recycle: 50, reuse: 40, upcycle: 25, donate: 70 },
  },
  Textile: {
    recyclingGuidance:
      "Donate wearable clothes. Worn textiles go to recycling banks, not general bins.",
    hazardIfThrown:
      "🚨 If thrown as trash: Synthetic fabrics release microfibers contaminating oceans, harming marine life. Dyes pollute waterways. Decomposes slowly (5+ years). Fashion industry produces 10% of global CO₂ emissions.",
    reuseIdeas: [
      "Cut into cleaning rags",
      "Make tote bags",
      "Create stuffed toys",
      "Donate to shelters",
    ],
    donationPossible: true,
    impact: {
      carbonSaved: 2.0,
      wasteDiverted: 0.5,
      ecoScore: 25,
      carbonPenalty: 8.3,
    },
    education: {
      didYouKnow: "Fashion industry is 2nd largest polluter globally",
      localImpact: "India exports textile waste worth ₹6,000 crores",
      studentAction: "Swap clothes with friends instead of buying new",
    },
    baseProbabilities: { recycle: 40, reuse: 65, upcycle: 70, donate: 80 },
  },
  Wood: {
    recyclingGuidance:
      "Untreated wood can be composted. Treated wood needs special disposal. Donate furniture.",
    hazardIfThrown:
      "🚨 If thrown as trash: Treated wood releases toxic chemicals (pesticides, varnish) into soil. Takes 3-5 years to decompose. Burning produces harmful smoke. Valuable resource wasted when could be reused or upcycled.",
    reuseIdeas: [
      "Use as kindling",
      "Make garden stakes",
      "Build small shelves",
      "Create garden mulch",
    ],
    donationPossible: true,
    impact: {
      carbonSaved: 0.4,
      wasteDiverted: 0.6,
      ecoScore: 12,
      carbonPenalty: 2.1,
    },
    education: {
      didYouKnow: "Wood products store carbon even after trees are cut",
      localImpact: "Furniture waste makes up 5% of landfill volume in India",
      studentAction: "Upcycle old furniture into new projects",
    },
    baseProbabilities: { recycle: 35, reuse: 70, upcycle: 75, donate: 55 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const computeProbabilities = (baseProbabilities, aiData) => {
  const { urgency, isRecyclable, donationPossible, condition } = aiData;
  let { recycle, reuse, upcycle, donate } = { ...baseProbabilities };

  if (urgency === "high") {
    recycle = Math.min(recycle + 15, 98);
    reuse = Math.max(reuse - 10, 5);
    donate = Math.max(donate - 20, 5);
  } else if (urgency === "low") {
    reuse = Math.min(reuse + 15, 98);
    upcycle = Math.min(upcycle + 10, 98);
    donate = Math.min(donate + 10, 98);
  }
  if (isRecyclable === false) recycle = Math.max(recycle - 30, 5);
  if (donationPossible === true) donate = Math.min(donate + 20, 98);
  if (donationPossible === false) donate = Math.max(donate - 20, 5);
  if (condition === "poor" || condition === "broken") {
    donate = Math.max(donate - 25, 5);
    reuse = Math.max(reuse - 10, 5);
    recycle = Math.min(recycle + 10, 98);
  } else if (condition === "good" || condition === "excellent") {
    donate = Math.min(donate + 15, 98);
    reuse = Math.min(reuse + 10, 98);
  }
  return { recycle, reuse, upcycle, donate };
};

const getBestAction = (probs) => {
  const entries = Object.entries(probs).sort((a, b) => b[1] - a[1]);
  const labels = {
    recycle: { label: "Recycle", icon: "♻️", color: "#4ade80" },
    reuse: { label: "Reuse", icon: "🔄", color: "#60a5fa" },
    upcycle: { label: "Upcycle", icon: "✨", color: "#f59e0b" },
    donate: { label: "Donate", icon: "🎁", color: "#f472b6" },
  };
  return { ...labels[entries[0][0]], value: entries[0][1], key: entries[0][0] };
};

const MOTIVATION_QUOTES = [
  "🌟 Every small action counts towards a healthier planet!",
  "💚 You're making a real difference in waste reduction!",
  "🌍 Together we can create a sustainable future!",
  "✨ Your eco-conscious choice inspires others!",
  "🎯 Small steps lead to big environmental impact!",
];

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const StepIndicator = ({ currentStep }) => {
  const steps = [
    { num: 1, label: "Category" },
    { num: 2, label: "Upload" },
    { num: 3, label: "Results" },
  ];
  return (
    <View style={s.stepRow}>
      {steps.map((step, idx) => (
        <React.Fragment key={step.num}>
          <View style={s.stepItem}>
            <View
              style={[
                s.stepCircle,
                currentStep >= step.num && s.stepCircleActive,
                currentStep === step.num && s.stepCircleCurrent,
              ]}
            >
              <Text
                style={[
                  s.stepCircleText,
                  currentStep >= step.num && s.stepCircleTextActive,
                ]}
              >
                {currentStep > step.num ? "✓" : step.num}
              </Text>
            </View>
            <Text
              style={[
                s.stepLabel,
                currentStep >= step.num && s.stepLabelActive,
              ]}
            >
              {step.label}
            </Text>
          </View>
          {idx < 2 && (
            <View
              style={[s.stepLine, currentStep > step.num && s.stepLineActive]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const CategoryCard = ({ category, onSelect, delay = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          s.catCard,
          { borderColor: category.border, backgroundColor: category.bg },
        ]}
        onPress={onSelect}
        activeOpacity={0.8}
      >
        <Text style={s.catIcon}>{category.icon}</Text>
        <Text style={[s.catLabel, { color: category.color }]}>
          {category.label}
        </Text>
        <Text style={s.catExamples}>{category.examples}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ImageThumb = ({ uri, index, onRemove }) => (
  <View style={s.thumbWrap}>
    <Image source={{ uri }} style={s.thumbImg} />
    <View style={s.thumbNumber}>
      <Text style={s.thumbNumberText}>{index + 1}</Text>
    </View>
    <TouchableOpacity style={s.thumbRemove} onPress={onRemove}>
      <Text style={s.thumbRemoveText}>✕</Text>
    </TouchableOpacity>
  </View>
);

const ProbabilityBar = ({ label, icon, value, color, isBest, delay = 0 }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(widthAnim, {
        toValue: value,
        duration: 900,
        delay: delay + 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value]);
  const barWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });
  return (
    <Animated.View style={[s.probRow, { opacity: fadeAnim }]}>
      <View style={s.probLabelWrap}>
        <Text style={s.probIcon}>{icon}</Text>
        <Text
          style={[
            s.probLabel,
            isBest && { color: "#f1f5f9", fontWeight: "800" },
          ]}
        >
          {label}
        </Text>
        {isBest && (
          <View style={[s.bestBadge, { backgroundColor: color + "33" }]}>
            <Text style={[s.bestBadgeText, { color }]}>Best</Text>
          </View>
        )}
      </View>
      <View style={s.probBarWrap}>
        <View style={s.probBarBg}>
          <Animated.View
            style={[
              s.probBarFill,
              {
                width: barWidth,
                backgroundColor: color,
                opacity: isBest ? 1 : 0.6,
              },
            ]}
          />
        </View>
        <Text style={[s.probValue, { color: isBest ? color : "#94a3b8" }]}>
          {value}%
        </Text>
      </View>
    </Animated.View>
  );
};

const RecommendationCard = ({ bestAction }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  const actionDescriptions = {
    recycle:
      "This item is best suited for recycling. Take it to your nearest recycling center for maximum environmental benefit.",
    reuse:
      "Great news! This item can be directly reused in its current form, saving resources and reducing waste.",
    upcycle:
      "This item has strong upcycling potential. Transform it into something new and creative!",
    donate:
      "This item is in good enough condition to donate. Someone else can benefit from it!",
  };
  return (
    <Animated.View
      style={[
        s.recCard,
        {
          borderColor: bestAction.color + "66",
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={s.recCardHeader}>
        <Text style={s.recCardEmoji}>{bestAction.icon}</Text>
        <View style={s.recCardTitleWrap}>
          <Text style={s.recCardSubtitle}>AI Recommendation</Text>
          <Text style={[s.recCardTitle, { color: bestAction.color }]}>
            {bestAction.label} This Item
          </Text>
        </View>
        <View
          style={[s.recCardScore, { backgroundColor: bestAction.color + "22" }]}
        >
          <Text style={[s.recCardScoreText, { color: bestAction.color }]}>
            {bestAction.value}%
          </Text>
        </View>
      </View>
      <Text style={s.recCardDesc}>{actionDescriptions[bestAction.key]}</Text>
    </Animated.View>
  );
};

const CO2ImpactCard = ({ carbonSaved, carbonPenalty }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const netBenefit = carbonPenalty - carbonSaved;
  const treesEquivalent = (netBenefit / 21).toFixed(2);
  const kmDrivingEquivalent = (netBenefit / 0.21).toFixed(0);

  return (
    <Animated.View
      style={[
        s.co2Card,
        {
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={s.co2Header}>
        <Text style={s.co2Icon}>🌍</Text>
        <Text style={s.co2Title}>Climate Impact Comparison</Text>
      </View>

      <View style={s.co2Container}>
        {/* Good disposal */}
        <View style={s.co2Column}>
          <View style={[s.co2Indicator, { backgroundColor: "#dcfce7" }]}>
            <Text style={s.co2IndicatorEmoji}>✅</Text>
          </View>
          <Text style={s.co2ColumnLabel}>Proper Disposal</Text>
          <Text style={[s.co2Value, { color: "#22c55e" }]}>
            Save {carbonSaved} kg CO₂
          </Text>
        </View>

        {/* VS */}
        <View style={s.co2VSContainer}>
          <Text style={s.co2VS}>VS</Text>
        </View>

        {/* Bad disposal */}
        <View style={s.co2Column}>
          <View style={[s.co2Indicator, { backgroundColor: "#fee2e2" }]}>
            <Text style={s.co2IndicatorEmoji}>❌</Text>
          </View>
          <Text style={s.co2ColumnLabel}>If Thrown as Trash</Text>
          <Text style={[s.co2Value, { color: "#ef4444" }]}>
            Emit {carbonPenalty} kg CO₂
          </Text>
        </View>
      </View>

      {/* Impact summary */}
      <View style={s.co2Impact}>
        <Text style={s.co2ImpactLabel}>🌟 Your Positive Action:</Text>
        <Text style={s.co2ImpactValue}>
          Avoid {netBenefit} kg CO₂ Emissions
        </Text>
        <View style={s.co2Equivalents}>
          <View style={s.co2Equiv}>
            <Text style={s.co2EquivEmoji}>🌱</Text>
            <Text style={s.co2EquivText}>
              = {treesEquivalent} trees planted
            </Text>
          </View>
          <View style={s.co2Equiv}>
            <Text style={s.co2EquivEmoji}>🚗</Text>
            <Text style={s.co2EquivText}>
              = {kmDrivingEquivalent} km car driving
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const WasteAnalyzer = () => {
  const navigation = useNavigation();

  const [step, setStep] = useState(2); // Start at image upload (skip category selection)
  // Category is auto-detected by CLIP Vision Model - no manual selection needed
  const [wasteCategories, setWasteCategories] = useState(WASTE_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [images, setImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState("");
  const [result, setResult] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCenters, setShowCenters] = useState(false);
  const [userStats, setUserStats] = useState({
    totalAnalyses: 0,
    totalEcoPoints: 0,
    carbonSaved: 0,
  });

  // Load waste categories from API on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categories = await configAPI.getWasteCategories();
        setWasteCategories(categories || WASTE_CATEGORIES); // Fallback to constant if API fails
      } catch (error) {
        console.error("Failed to load waste categories:", error);
        setWasteCategories(WASTE_CATEGORIES); // Fallback to constant
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  // ✅ Only reset on initial mount to avoid clearing analysis results on refocus
  useEffect(() => {
    setStep(2); // Start directly at image upload (skip category selection)
    setImages([]);
    setAnalyzing(false);
    setAnalyzeProgress("");
    setResult(null);
    setShowConfetti(false);
    setShowCenters(false);
  }, []); // Empty dependency array = only run once on mount

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [step]);

  useEffect(() => {
    if (showConfetti) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(confettiAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(confettiAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 5 },
      ).start();
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [showConfetti]);

  const imageToBase64 = async (uri) => {
    try {
      console.log(
        "🔄 Converting image to base64:",
        uri.substring(0, 50) + "...",
      );
      const response = await fetch(uri);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const blob = await response.blob();
      console.log("📦 Blob size:", blob.size, "bytes");

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (result && typeof result === "string") {
            const base64 = result.split(",")[1];
            console.log(
              "✅ Base64 conversion complete, length:",
              base64.length,
            );
            resolve(base64);
          } else {
            reject(new Error("Invalid FileReader result"));
          }
        };
        reader.onerror = (err) => {
          console.error("❌ FileReader error:", err);
          reject(
            new Error(`FileReader error: ${err.message || "Unknown error"}`),
          );
        };
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("❌ imageToBase64 error:", err);
      throw new Error(`Image conversion failed: ${err.message}`);
    }
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handlePickImage = async () => {
    if (images.length >= 5) {
      Toast.show({ type: "info", text1: "Maximum 5 images" });
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera roll access required");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - images.length,
    });
    if (!res.canceled) {
      setImages((prev) => [...prev, ...res.assets].slice(0, 5));
      Toast.show({
        type: "success",
        text1: `${res.assets.length} image(s) added`,
      });
    }
  };

  const handleTakePhoto = async () => {
    if (images.length >= 5) {
      Toast.show({ type: "info", text1: "Maximum 5 images" });
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access required");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled) {
      setImages((prev) => [...prev, res.assets[0]]);
      Toast.show({ type: "success", text1: "Photo captured!" });
    }
  };

  const handleRemoveImage = (index) =>
    setImages((prev) => prev.filter((_, i) => i !== index));

  // ─── Main Analysis ────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    console.log("🔍 handleAnalyze called");

    // Prevent multiple simultaneous analyses
    if (analyzing) {
      console.log("⚠️ Analysis already in progress, ignoring");
      return;
    }

    // Check if we have images
    if (images.length === 0) {
      Toast.show({
        type: "error",
        text1: "Add an image",
        text2: "Upload at least one image for AI analysis",
      });
      return;
    }

    // Reset previous results
    setResult(null);
    setShowConfetti(false);
    setShowCenters(false);
    console.log("✅ Proceeding with analysis");
    setAnalyzing(true);
    setAnalyzeProgress("📸 Processing...");

    try {
      console.log(
        "🔍 Starting CLIP Vision analysis with image count:",
        images.length,
      );
      setAnalyzeProgress("🔍 Analyzing with CLIP Vision Model...");

      try {
        const token = await AsyncStorage.getItem("token");
        const imageBase64 = await imageToBase64(images[0].uri);

        const analyzeResponse = await fetch(
          `${BACKEND_URL}/api/ai/analyze-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              imageBase64: imageBase64,
              mediaType: "image/jpeg",
              // CLIP Vision Model will auto-classify and return material/category
            }),
          },
        );

        if (!analyzeResponse.ok) {
          throw new Error(
            `Analysis failed: ${analyzeResponse.status} ${analyzeResponse.statusText}`,
          );
        }

        const analyzeData = await analyzeResponse.json();
        if (analyzeData.success && analyzeData.analysis) {
          var analysis = analyzeData.analysis;
          console.log("✅ CLIP Vision Analysis:", analysis);
        } else {
          throw new Error("Invalid response from AI analysis API");
        }
      } catch (aiErr) {
        console.error("❌ CLIP Vision analysis error:", aiErr.message);
        // Fallback to mock if API fails
        Toast.show({
          type: "warning",
          text1: "Using default analysis",
          text2: "AI temporarily unavailable",
        });
        var analysis = {
          label: "Unknown Item",
          material: "Plastic",
          confidence: 60,
          reasoning: "AI temporarily unavailable, using default",
          isRecyclable: true,
          urgency: "medium",
          donationPossible: false,
        };
      }

      // ✅ Determine waste category from Gemini API response
      const materialId = analysis.material || "Plastic";
      const detectedCategory = wasteCategories.find(
        (c) => c.id === materialId,
      ) ||
        wasteCategories[0] || { id: "Other", label: "Other", icon: "📦" };

      const categoryAdvice = CATEGORY_ADVICE[detectedCategory?.id] ||
        CATEGORY_ADVICE["Other"] || {
          baseProbabilities: { recyclable: 0.5, reusable: 0.4, donation: 0.3 },
          donationPossible: false,
        };

      const probabilities = computeProbabilities(
        categoryAdvice.baseProbabilities,
        {
          urgency: analysis.urgency,
          isRecyclable: analysis.isRecyclable,
          donationPossible:
            analysis.donationPossible ?? categoryAdvice.donationPossible,
          condition: analysis.condition || "unknown",
        },
      );
      const bestAction = getBestAction(probabilities);
      const motivation =
        MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];

      const analysisResult = {
        label: analysis.label,
        confidence: analysis.confidence.toString(),
        material: detectedCategory.id,
        reasoning: analysis.reasoning,
        isRecyclable: analysis.isRecyclable,
        urgency: analysis.urgency,
        donationPossible:
          analysis.donationPossible ?? categoryAdvice.donationPossible,
        aiConfirmed: true,
        probabilities,
        bestAction,
        ...categoryAdvice,
        motivation,
        totalImages: images.length,
      };

      // ✅ SHOW RESULTS IMMEDIATELY — don't wait for save/API calls
      console.log("📊 Setting result and step...");
      setResult(analysisResult);
      setStep(3);
      setShowConfetti(true);
      setShowCenters(false);
      setUserStats((prev) => ({
        totalAnalyses: prev.totalAnalyses + 1,
        totalEcoPoints:
          prev.totalEcoPoints + (categoryAdvice.impact?.ecoScore || 0),
        carbonSaved:
          prev.carbonSaved + (categoryAdvice.impact?.carbonSaved || 0),
      }));
      Toast.show({ type: "success", text1: "✅ Analysis complete!" });

      // ── Award Eco Points for scan (non-blocking) ──────────────────────
      (async () => {
        try {
          const token = await AsyncStorage.getItem("token");
          if (token) {
            const API = BACKEND_URL;
            await fetch(`${API}/eco/award`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                action: "scan",
                description: `Scanned: ${analysis.label}`,
                itemLabel: analysis.label,
                category: detectedCategory?.label || "Other",
                metadata: { confidence: analysis.confidence },
              }),
            });
          }
        } catch (ecoErr) {
          console.warn(
            "⚠️ Eco points award failed (non-critical):",
            ecoErr?.message || "Unknown error",
          );
          // Don't break main flow
        }
      })();

      // ── Generate ideas IN BACKGROUND (non-blocking fire-and-forget) ────
      (async () => {
        try {
          const { wasteAPI } = await import("../services/api");
          const token = await AsyncStorage.getItem("token");
          let reuseIdeas = [];
          let upcycleIdeas = [];

          // 🔄 Fetch reuse ideas (non-blocking)
          try {
            console.log("🔄 Generating reuse ideas in background...");
            const reuseEndpoint = BACKEND_URL.includes("/api")
              ? `${BACKEND_URL}/upcycle`
              : `${BACKEND_URL}/api/ai/upcycle`;

            const reuseResponse = await fetch(reuseEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                prompt: `You are a practical reuse expert. Give me 4 PRACTICAL ways to reuse: "${analysis.label}" (category: ${detectedCategory.label}). Reuse means finding new uses AS-IS with minimal modification. Respond ONLY with JSON array: ["idea 1", "idea 2", "idea 3", "idea 4"]`,
                material: detectedCategory.id,
                item: analysis.label,
              }),
            });

            if (reuseResponse.ok) {
              const reuseData = await reuseResponse.json();
              reuseIdeas = reuseData.success ? reuseData.ideas || [] : [];
              console.log("✅ Reuse ideas loaded:", reuseIdeas.length);
            } else {
              console.warn("⚠️ Reuse ideas failed (non-critical)");
            }
          } catch (reuseErr) {
            console.warn("⚠️ Reuse generation error (continuing):", reuseErr?.message);
          }

          // 🔄 Fetch upcycle ideas (non-blocking)
          try {
            console.log("🔄 Generating upcycle ideas in background...");
            const upcycleEndpoint = BACKEND_URL.includes("/api")
              ? `${BACKEND_URL}/ai/upcycle`
              : `${BACKEND_URL}/api/ai/upcycle`;

            const upcycleResponse = await fetch(upcycleEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                prompt: `You are a creative upcycling expert. Give me 3 CREATIVE transformation ideas for "${analysis.label}" (category: ${detectedCategory.label}). Upcycling transforms items into something NEW and MORE VALUABLE. Respond ONLY with JSON array: [{"title": "Name", "description": "Brief desc", "difficulty": "Easy", "timeMin": 30}]`,
                material: detectedCategory.id,
                item: analysis.label,
              }),
            });

            if (upcycleResponse.ok) {
              const upcycleData = await upcycleResponse.json();
              upcycleIdeas = upcycleData.success ? upcycleData.ideas || [] : [];
              console.log("✅ Upcycle ideas loaded:", upcycleIdeas.length);
            } else {
              console.warn("⚠️ Upcycle ideas failed (non-critical)");
            }
          } catch (upcycleErr) {
            console.warn("⚠️ Upcycle generation error (continuing):", upcycleErr?.message);
          }

          // 📝 Update result with ideas once loaded
          if (reuseIdeas.length > 0 || upcycleIdeas.length > 0) {
            setResult((prev) => ({
              ...prev,
              reuseIdeas,
              upcycleIdeas,
            }));
            console.log("💡 Result updated with ideas");
          }

          // 💾 Save to DB with ideas (non-blocking)
          try {
            const materialToBackend = {
              Plastic: "Plastic",
              Glass: "Glass",
              Metal: "Metal",
              Paper: "Paper/Cardboard",
              Organic: "Organic Waste",
              Electronic: "E-Waste",
              Textile: "Cloth/Textile",
              Other: "Other",
            };

            const stringifyIdeas = (ideas) =>
              (ideas || []).map((i) =>
                typeof i === "string" ? i : i.title || JSON.stringify(i),
              );

            const analysisToSave = {
              tfLabel: analysis.label,
              material:
                materialToBackend[detectedCategory.id] || detectedCategory.id,
              category: detectedCategory.label,
              imageUrl: null,
              confidence: analysis.confidence,
              reasoning: analysis.reasoning,
              condition: analysis.condition || "unknown",
              urgency: analysis.urgency,
              isRecyclable: analysis.isRecyclable,
              donationPossible:
                analysis.donationPossible ?? categoryAdvice.donationPossible,
              probabilities: probabilities,
              bestAction: bestAction.key,
              bestActionLabel: bestAction.label,
              hazardIfThrown: categoryAdvice.hazardIfThrown,
              recyclingGuidance: categoryAdvice.recyclingGuidance,
              reuseIdeas: stringifyIdeas(reuseIdeas),
              upcycleIdeas: stringifyIdeas(upcycleIdeas),
              impact: categoryAdvice.impact,
              education: categoryAdvice.education,
              totalImages: images.length,
              deviceType: "mobile",
              userSelectedCategory: false,
            };

            await wasteAPI.saveAnalysis(analysisToSave);
            console.log("✅ Analysis + ideas saved to DB");
          } catch (saveErr) {
            console.warn("⚠️ DB save failed (non-critical):", saveErr?.message);
          }
        } catch (backgroundErr) {
          console.error("❌ Background idea generation error:", backgroundErr?.message);
          // Silently continue - results already displayed
        }
      })(); // Fire and forget
    } catch (err) {
      console.error("❌ Analysis error:", err);
      console.error("Error stack:", err.stack);
      console.error("Error message:", err.message);

      // Clear analyzing state
      setAnalyzing(false);
      setAnalyzeProgress("");

      try {
        Toast.show({
          type: "error",
          text1: "Analysis failed",
          text2: err.message || "Check your connection",
        });
      } catch (toastErr) {
        console.error("Toast error:", toastErr);
      }
    } finally {
      // Ensure analyzing state is cleared
      setAnalyzing(false);
      setAnalyzeProgress("");
    }
  };

  const handleReset = () => {
    setStep(2); // Back to image upload step (skip category selection)
    setImages([]);
    setResult(null);
    setShowCenters(false);
  };

  const handleCreateListing = () => {
    navigation.navigate("CreateListing", {
      fromAI: true,
      aiData: {
        title: result.label,
        category: result.material.toLowerCase(),
        description: `${result.label} - ${result.material}`,
        image: images[0]?.uri,
      },
    });
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* ── HEADER ─────────────────────────────────────── */}
          <View style={s.header}>
            <View style={s.headerContent}>
              <View style={s.headerTextWrap}>
                <Text style={s.headerTitle}>🤖 AI Waste Analyzer</Text>
                <Text style={s.headerSub}>
                  Transform waste into opportunity
                </Text>
                <View style={s.geminiBadge}>
                  <Text style={s.geminiBadgeText}>
                    ✦ Powered by CLIP Vision Model
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.historyBtn}
                onPress={() => navigation.navigate("AnalysisHistory")}
              >
                <Text style={s.historyBtnIcon}>📋</Text>
                <Text style={s.historyBtnLabel}>History</Text>
              </TouchableOpacity>
            </View>
          </View>

          <StepIndicator currentStep={step} />

          {/* ════════════════════════════════════════════════
              STEP 2 — Image Upload (No category selection needed)
          ════════════════════════════════════════════════ */}
          {step === 2 && (
            <View style={s.stepContainer}>
              <Text style={s.stepTitle}>Upload images</Text>
              <Text style={s.stepSub}>
                CLIP Vision Model will auto-detect waste type & recommend
                actions
              </Text>

              {images.length > 0 && (
                <View style={s.thumbGrid}>
                  {images.map((img, idx) => (
                    <ImageThumb
                      key={idx}
                      uri={img.uri}
                      index={idx}
                      onRemove={() => handleRemoveImage(idx)}
                    />
                  ))}
                </View>
              )}

              {images.length > 0 && (
                <Text style={s.uploadInfo}>
                  <Text style={s.uploadInfoBold}>{images.length}</Text> image
                  {images.length > 1 ? "s" : ""} uploaded
                  {images.length < 5 && ` • ${5 - images.length} more allowed`}
                </Text>
              )}

              <View style={s.btnGroup}>
                <TouchableOpacity
                  style={[s.btn, s.btnSecondary]}
                  onPress={handlePickImage}
                  disabled={images.length >= 5}
                >
                  <Text style={s.btnTextSecondary}>📁 Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btn, s.btnSecondary]}
                  onPress={handleTakePhoto}
                  disabled={images.length >= 5}
                >
                  <Text style={s.btnTextSecondary}>📸 Camera</Text>
                </TouchableOpacity>
              </View>

              {images.length > 0 && (
                <>
                  <TouchableOpacity
                    style={s.btnRemoveAll}
                    onPress={() => setImages([])}
                  >
                    <Text style={s.btnRemoveAllText}>🗑️ Remove All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.btn, s.btnPrimary, analyzing && s.btnDisabled]}
                    onPress={handleAnalyze}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <View style={s.analyzingWrap}>
                        <ActivityIndicator color="#0a0f1e" size="small" />
                        <Text style={s.analyzingText}>{analyzeProgress}</Text>
                      </View>
                    ) : (
                      <Text style={s.btnTextPrimary}>🤖 Analyze with AI</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* ════════════════════════════════════════════════
              STEP 3 — Results
          ════════════════════════════════════════════════ */}
          {step === 3 && result && (
            <View style={s.stepContainer}>
              {/* Success banner */}
              <View style={s.successBanner}>
                <Text style={s.successEmoji}>🎉</Text>
                <Text style={s.successText}>Analysis Complete!</Text>
              </View>

              {/* Item label */}
              <Text style={s.resultLabel}>{result.label}</Text>

              {/* Category badge */}
              <View
                style={[
                  s.resultCatBadge,
                  {
                    backgroundColor:
                      wasteCategories.find((c) => c.id === result.material)
                        ?.bg || "#f1f5f9",
                    borderColor:
                      wasteCategories.find((c) => c.id === result.material)
                        ?.border || "#cbd5e1",
                  },
                ]}
              >
                <Text>
                  {wasteCategories.find((c) => c.id === result.material)?.icon}
                </Text>
                <Text
                  style={{
                    color:
                      wasteCategories.find((c) => c.id === result.material)
                        ?.color || "#64748b",
                    fontWeight: "700",
                  }}
                >
                  {result.material}
                </Text>
                {result.aiConfirmed && (
                  <Text style={s.resultCatSub}>• AI confirmed</Text>
                )}
              </View>

              {/* Confidence */}
              <View style={s.confidenceWrap}>
                <View style={s.confidenceTop}>
                  <Text style={s.confidenceLabel}>Detection Confidence</Text>
                  <Text style={s.confidenceValue}>{result.confidence}%</Text>
                </View>
                <View style={s.confidenceBarBg}>
                  <View
                    style={[
                      s.confidenceBarFill,
                      { width: `${result.confidence}%` },
                    ]}
                  />
                </View>
              </View>

              {/* AI Reasoning */}
              {result.reasoning && (
                <View style={s.reasoningCard}>
                  <Text style={s.reasoningTitle}>🧠 AI Analysis</Text>
                  <Text style={s.reasoningText}>{result.reasoning}</Text>
                  {result.urgency === "high" && (
                    <View style={s.urgencyBadge}>
                      <Text style={s.urgencyText}>
                        ⚠️ High priority disposal needed
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Recommendation */}
              <RecommendationCard bestAction={result.bestAction} />

              {/* Probability bars */}
              <View style={s.probContainer}>
                <Text style={s.probTitle}>📊 Action Probability Analysis</Text>
                <Text style={s.probSubtitle}>
                  AI-computed suitability for each disposal method
                </Text>
                <ProbabilityBar
                  label="Recycle"
                  icon="♻️"
                  value={result.probabilities.recycle}
                  color="#4ade80"
                  isBest={result.bestAction.key === "recycle"}
                  delay={0}
                />
                <ProbabilityBar
                  label="Reuse"
                  icon="🔄"
                  value={result.probabilities.reuse}
                  color="#60a5fa"
                  isBest={result.bestAction.key === "reuse"}
                  delay={100}
                />
                <ProbabilityBar
                  label="Upcycle"
                  icon="✨"
                  value={result.probabilities.upcycle}
                  color="#f59e0b"
                  isBest={result.bestAction.key === "upcycle"}
                  delay={200}
                />
                <ProbabilityBar
                  label="Donate"
                  icon="🎁"
                  value={result.probabilities.donate}
                  color="#f472b6"
                  isBest={result.bestAction.key === "donate"}
                  delay={300}
                />
              </View>

              {/* Motivation */}
              <View style={s.motivationBox}>
                <Text style={s.motivationText}>{result.motivation}</Text>
              </View>

              {/* ⚠️ HAZARD WARNING ⚠️ */}
              {result.hazardIfThrown && (
                <View style={s.hazardCard}>
                  <View style={s.hazardHeader}>
                    <Text style={s.hazardIcon}>⚠️</Text>
                    <Text style={s.hazardTitle}>
                      Hazards of Improper Disposal
                    </Text>
                  </View>
                  <Text style={s.hazardText}>{result.hazardIfThrown}</Text>
                  <View style={s.hazardFooter}>
                    <Text style={s.hazardFooterIcon}>🌍</Text>
                    <Text style={s.hazardFooterText}>
                      Proper disposal protects our environment
                    </Text>
                  </View>
                </View>
              )}

              {/* 🌍 CO2 SAVINGS IMPACT CARD 🌍 */}
              <CO2ImpactCard
                carbonSaved={result.impact?.carbonSaved ?? 0}
                carbonPenalty={result.impact?.carbonPenalty ?? 0}
              />

              {/* Image preview */}
              {images.length > 0 && images[0]?.uri && (
                <Image
                  source={{ uri: images[0].uri }}
                  style={s.resultImage}
                  resizeMode="cover"
                />
              )}
              {result.totalImages > 1 && (
                <Text style={s.multiImageBadge}>
                  📸 Enhanced: {result.totalImages} images analyzed
                </Text>
              )}

              {/* Stats */}
              <View style={s.statsGrid}>
                <View style={s.statCard}>
                  <Text style={s.statValue}>
                    {(result.impact?.carbonSaved ?? 0).toFixed(1)}
                  </Text>
                  <Text style={s.statLabel}>kg CO₂ Saved</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>
                    {(result.impact?.wasteDiverted ?? 0).toFixed(1)}
                  </Text>
                  <Text style={s.statLabel}>kg Diverted</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>
                    +{result.impact?.ecoScore ?? 0}
                  </Text>
                  <Text style={s.statLabel}>Eco Points</Text>
                </View>
              </View>

              {/* Recycling guide */}
              <View style={s.infoCard}>
                <Text style={s.infoCardTitle}>♻️ Recycling Guide</Text>
                <Text style={s.infoCardText}>{result.recyclingGuidance}</Text>
              </View>

              {/* Quick reuse ideas */}
              {result.reuseIdeas && result.reuseIdeas.length > 0 && (
                <View style={s.infoCard}>
                  <Text style={s.infoCardTitle}>🔄 Reuse Ideas</Text>
                  {result.reuseIdeas.map((idea, idx) => (
                    <View key={idx} style={s.ideaRow}>
                      <Text style={s.ideaBullet}>•</Text>
                      <Text style={s.ideaText}>{idea}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Education */}
              {result.education && (
                <View style={[s.infoCard, s.eduCard]}>
                  <Text style={s.infoCardTitle}>🎓 Education Corner</Text>
                  <View style={s.eduRow}>
                    <Text style={s.eduLabel}>💡 Did you know?</Text>
                    <Text style={s.eduText}>{result.education.didYouKnow}</Text>
                  </View>
                  <View style={s.eduRow}>
                    <Text style={s.eduLabel}>🇮🇳 India Impact:</Text>
                    <Text style={s.eduText}>
                      {result.education.localImpact}
                    </Text>
                  </View>
                  <View style={s.eduRow}>
                    <Text style={s.eduLabel}>👨‍🎓 What you can do:</Text>
                    <Text style={s.eduText}>
                      {result.education.studentAction}
                    </Text>
                  </View>
                </View>
              )}

              {/* ══════════════════════════════════════════════
                  🎯 TAKE ACTION — 4 PATHS
              ══════════════════════════════════════════════ */}
              <View style={s.actionSection}>
                <Text style={s.actionSectionTitle}>🎯 Take Action Now</Text>

                {/* PRIMARY action based on AI recommendation */}
                {result.bestAction.key === "recycle" && (
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnGreen]}
                    onPress={() => setShowCenters((v) => !v)}
                    activeOpacity={0.85}
                  >
                    <Text style={s.actionBtnIcon}>♻️</Text>
                    <View style={s.actionBtnContent}>
                      <Text style={s.actionBtnTitle}>
                        Find Recycling Centers
                      </Text>
                      <Text style={s.actionBtnSub}>
                        Locate nearest centers on map
                      </Text>
                    </View>
                    <Text style={s.actionBtnArrow}>
                      {showCenters ? "▲" : "▼"}
                    </Text>
                  </TouchableOpacity>
                )}

                {result.bestAction.key === "reuse" && (
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnBlue]}
                    onPress={() =>
                      navigation.navigate("ReuseGuide", {
                        item: result.label,
                        category: result.material,
                        imageUri: images[0]?.uri,
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={s.actionBtnIcon}>🔄</Text>
                    <View style={s.actionBtnContent}>
                      <Text style={s.actionBtnTitle}>Get Reuse Ideas</Text>
                      <Text style={s.actionBtnSub}>AI + YouTube tutorials</Text>
                    </View>
                    <Text style={s.actionBtnArrow}>→</Text>
                  </TouchableOpacity>
                )}

                {result.bestAction.key === "upcycle" && (
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnYellow]}
                    onPress={() =>
                      navigation.navigate("UpCycleModal", {
                        item: result.label,
                        category: result.material,
                        imageUri: images[0]?.uri,
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={s.actionBtnIcon}>✨</Text>
                    <View style={s.actionBtnContent}>
                      <Text style={s.actionBtnTitle}>Upcycle This Item</Text>
                      <Text style={s.actionBtnSub}>
                        Creative transformations + tutorials
                      </Text>
                    </View>
                    <Text style={s.actionBtnArrow}>→</Text>
                  </TouchableOpacity>
                )}

                {result.donationPossible && (
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnPink]}
                    onPress={handleCreateListing}
                    activeOpacity={0.85}
                  >
                    <Text style={s.actionBtnIcon}>🎁</Text>
                    <View style={s.actionBtnContent}>
                      <Text style={s.actionBtnTitle}>Donate This Item</Text>
                      <Text style={s.actionBtnSub}>
                        Create a listing for someone in need
                      </Text>
                    </View>
                    <Text style={s.actionBtnArrow}>→</Text>
                  </TouchableOpacity>
                )}

                {/* Inline centers for recycle path */}
                {result.bestAction.key === "recycle" && showCenters && (
                  <NearbyCentersSection material={result.material} />
                )}

                {/* SECONDARY — always show the other 2 options */}
                <View style={s.otherActionsRow}>
                  {result.bestAction.key !== "reuse" && (
                    <TouchableOpacity
                      style={s.otherActionBtn}
                      onPress={() =>
                        navigation.navigate("ReuseGuide", {
                          item: result.label,
                          category: result.material,
                          imageUri: images[0]?.uri,
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={s.otherActionIcon}>🔄</Text>
                      <Text style={s.otherActionText}>Reuse Ideas</Text>
                    </TouchableOpacity>
                  )}
                  {result.bestAction.key !== "upcycle" && (
                    <TouchableOpacity
                      style={s.otherActionBtn}
                      onPress={() =>
                        navigation.navigate("UpCycleModal", {
                          item: result.label,
                          category: result.material,
                          imageUri: images[0]?.uri,
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={s.otherActionIcon}>✨</Text>
                      <Text style={s.otherActionText}>Upcycle</Text>
                    </TouchableOpacity>
                  )}
                  {result.bestAction.key !== "recycle" && (
                    <TouchableOpacity
                      style={s.otherActionBtn}
                      onPress={() => setShowCenters((v) => !v)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.otherActionIcon}>♻️</Text>
                      <Text style={s.otherActionText}>Recycle</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Inline centers for non-recycle paths */}
                {result.bestAction.key !== "recycle" && showCenters && (
                  <NearbyCentersSection material={result.material} />
                )}
              </View>

              {/* Reset */}
              <TouchableOpacity
                style={[s.btn, s.btnSecondary, { marginTop: 8 }]}
                onPress={handleReset}
              >
                <Text style={s.btnTextSecondary}>🔄 Analyze Another Item</Text>
              </TouchableOpacity>

              {/* User stats */}
              <View style={s.userStatsWrap}>
                <Text style={s.userStatsTitle}>🏆 Your Eco Journey</Text>
                <View style={s.userStatsGrid}>
                  <View style={s.userStatItem}>
                    <Text style={s.userStatValue}>
                      {userStats.totalAnalyses}
                    </Text>
                    <Text style={s.userStatLabel}>Analyzed</Text>
                  </View>
                  <View style={s.userStatItem}>
                    <Text style={s.userStatValue}>
                      {userStats.totalEcoPoints}
                    </Text>
                    <Text style={s.userStatLabel}>Eco Points</Text>
                  </View>
                  <View style={s.userStatItem}>
                    <Text style={s.userStatValue}>
                      {userStats.carbonSaved.toFixed(1)}
                    </Text>
                    <Text style={s.userStatLabel}>kg CO₂</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Confetti */}
      {showConfetti && (
        <Animated.View
          style={[s.confettiOverlay, { opacity: confettiAnim }]}
          pointerEvents="none"
        >
          <Text style={s.confettiEmoji}>🎉</Text>
          <Text style={s.confettiEmoji}>✨</Text>
          <Text style={s.confettiEmoji}>🌟</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e" },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  headerSub: { fontSize: 13, color: "#94a3b8", marginBottom: 8 },
  geminiBadge: {
    backgroundColor: "rgba(74,222,128,0.1)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },
  geminiBadgeText: { fontSize: 11, color: "#4ade80", fontWeight: "600" }, // kept style name for compat

  // History Button
  historyBtn: {
    backgroundColor: "#1e2d45",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  historyBtnIcon: {
    fontSize: 20,
  },
  historyBtnLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
  },

  // Step indicator
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  stepItem: { alignItems: "center", gap: 6 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e2d45",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: { backgroundColor: "#4ade80" },
  stepCircleCurrent: { transform: [{ scale: 1.15 }] },
  stepCircleText: { fontSize: 14, fontWeight: "700", color: "#64748b" },
  stepCircleTextActive: { color: "#0a0f1e" },
  stepLabel: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  stepLabelActive: { color: "#4ade80" },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: "#1e2d45",
    marginBottom: 24,
  },
  stepLineActive: { backgroundColor: "#4ade80" },

  stepContainer: { paddingHorizontal: 20 },
  stepTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f1f5f9",
    textAlign: "center",
    marginBottom: 6,
  },
  stepSub: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 20,
  },

  // Category grid
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catCard: {
    width: (SW - 50) / 2,
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  catIcon: { fontSize: 32 },
  catLabel: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  catExamples: { fontSize: 10, color: "#64748b", textAlign: "center" },

  // Selected category
  selectedCatWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  selectedCatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 2,
    padding: 10,
  },
  selectedCatIcon: { fontSize: 24 },
  selectedCatLabelSmall: { fontSize: 9, color: "#64748b" },
  selectedCatLabel: { fontSize: 13, fontWeight: "700" },
  changeBtn: {
    backgroundColor: "#1e2d45",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  changeBtnText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },

  // Image thumbnails
  thumbGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  thumbWrap: {
    width: (SW - 50) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbNumber: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#4ade80",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbNumberText: { fontSize: 11, fontWeight: "700", color: "#0a0f1e" },
  thumbRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(248,113,113,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbRemoveText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  uploadInfo: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 16,
  },
  uploadInfoBold: { color: "#4ade80", fontWeight: "700" },

  // Buttons
  btnGroup: { flexDirection: "row", gap: 10, marginBottom: 10 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#4ade80" },
  btnSecondary: {
    backgroundColor: "#1e2d45",
    borderWidth: 1,
    borderColor: "#334155",
  },
  btnDisabled: { opacity: 0.5 },
  btnTextPrimary: { color: "#0a0f1e", fontWeight: "700", fontSize: 14 },
  btnTextSecondary: { color: "#94a3b8", fontWeight: "600", fontSize: 14 },
  btnRemoveAll: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  btnRemoveAllText: { color: "#f87171", fontSize: 13, fontWeight: "600" },
  analyzingWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  analyzingText: { color: "#0a0f1e", fontWeight: "700", fontSize: 13 },

  // Results
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(74,222,128,0.12)",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },
  successEmoji: { fontSize: 24 },
  successText: { fontSize: 16, fontWeight: "800", color: "#4ade80" },
  resultLabel: {
    fontSize: 26,
    fontWeight: "900",
    color: "#f1f5f9",
    textAlign: "center",
    marginBottom: 12,
  },
  resultCatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  resultCatSub: { fontSize: 11, color: "#64748b" },

  confidenceWrap: { marginBottom: 16 },
  confidenceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  confidenceLabel: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },
  confidenceValue: { fontSize: 12, color: "#f1f5f9", fontWeight: "700" },
  confidenceBarBg: {
    height: 8,
    backgroundColor: "#1e2d45",
    borderRadius: 4,
    overflow: "hidden",
  },
  confidenceBarFill: { height: 8, backgroundColor: "#4ade80", borderRadius: 4 },

  reasoningCard: {
    backgroundColor: "#131c2e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  reasoningTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4ade80",
    marginBottom: 8,
  },
  reasoningText: { fontSize: 13, color: "#94a3b8", lineHeight: 20 },
  urgencyBadge: {
    backgroundColor: "rgba(248,113,113,0.1)",
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
  },
  urgencyText: { color: "#f87171", fontSize: 12, fontWeight: "700" },

  recCard: {
    backgroundColor: "#131c2e",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 2,
  },
  recCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  recCardEmoji: { fontSize: 36 },
  recCardTitleWrap: { flex: 1 },
  recCardSubtitle: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 2,
  },
  recCardTitle: { fontSize: 18, fontWeight: "900" },
  recCardScore: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  recCardScoreText: { fontSize: 16, fontWeight: "900" },
  recCardDesc: { fontSize: 13, color: "#94a3b8", lineHeight: 20 },

  probContainer: {
    backgroundColor: "#131c2e",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  probTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  probSubtitle: { fontSize: 11, color: "#64748b", marginBottom: 18 },
  probRow: { marginBottom: 16 },
  probLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 7,
  },
  probIcon: { fontSize: 16 },
  probLabel: { fontSize: 13, color: "#94a3b8", fontWeight: "600", flex: 1 },
  bestBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  bestBadgeText: { fontSize: 10, fontWeight: "800" },
  probBarWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  probBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: "#1e2d45",
    borderRadius: 5,
    overflow: "hidden",
  },
  probBarFill: { height: 10, borderRadius: 5 },
  probValue: { fontSize: 13, fontWeight: "800", width: 38, textAlign: "right" },

  motivationBox: {
    backgroundColor: "rgba(74,222,128,0.08)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
  },
  motivationText: {
    fontSize: 14,
    color: "#86efac",
    textAlign: "center",
    lineHeight: 20,
  },

  // Hazard warning card
  hazardCard: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#ef4444",
    borderLeftWidth: 4,
  },
  hazardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  hazardIcon: { fontSize: 24 },
  hazardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ef4444",
    flex: 1,
  },
  hazardText: {
    fontSize: 12,
    color: "#fca5a5",
    lineHeight: 18,
    marginBottom: 10,
    fontWeight: "600",
  },
  hazardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  hazardFooterIcon: { fontSize: 16 },
  hazardFooterText: {
    fontSize: 11,
    color: "#ef4444",
    fontWeight: "700",
    flex: 1,
  },

  // CO2 Impact Card Styles
  co2Card: {
    backgroundColor: "#131c2e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e2d45",
    padding: 16,
    marginBottom: 16,
  },
  co2Header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  co2Icon: { fontSize: 24 },
  co2Title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f1f5f9",
  },
  co2Container: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 16,
    gap: 8,
  },
  co2Column: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  co2Indicator: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  co2IndicatorEmoji: {
    fontSize: 24,
  },
  co2ColumnLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    textAlign: "center",
  },
  co2Value: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  co2VSContainer: {
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  co2VS: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "700",
  },
  co2Impact: {
    backgroundColor: "#1e2d45",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  co2ImpactLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 6,
    fontWeight: "600",
  },
  co2ImpactValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#3b82f6",
    marginBottom: 10,
  },
  co2Equivalents: {
    gap: 8,
  },
  co2Equiv: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  co2EquivEmoji: {
    fontSize: 14,
  },
  co2EquivText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },

  resultImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: 12,
  },
  multiImageBadge: {
    fontSize: 11,
    color: "#4ade80",
    textAlign: "center",
    marginBottom: 16,
  },

  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#131c2e",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#4ade80",
    marginBottom: 4,
  },
  statLabel: { fontSize: 10, color: "#64748b", textAlign: "center" },

  infoCard: {
    backgroundColor: "#131c2e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#4ade80",
    marginBottom: 12,
  },
  infoCardText: { fontSize: 13, color: "#94a3b8", lineHeight: 20 },
  ideaRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  ideaBullet: { color: "#4ade80", fontSize: 16, fontWeight: "700" },
  ideaText: { flex: 1, fontSize: 13, color: "#94a3b8", lineHeight: 19 },

  eduCard: {
    backgroundColor: "rgba(74,222,128,0.05)",
    borderColor: "rgba(74,222,128,0.2)",
  },
  eduRow: { marginBottom: 12 },
  eduLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4ade80",
    marginBottom: 4,
  },
  eduText: { fontSize: 12, color: "#86efac", lineHeight: 18 },

  // ── Action section ────────────────────────────────────────────────────────
  actionSection: { marginBottom: 16, gap: 10 },
  actionSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  actionBtnGreen: {
    backgroundColor: "rgba(74,222,128,0.1)",
    borderColor: "rgba(74,222,128,0.3)",
  },
  actionBtnBlue: {
    backgroundColor: "rgba(96,165,250,0.1)",
    borderColor: "rgba(96,165,250,0.3)",
  },
  actionBtnYellow: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderColor: "rgba(245,158,11,0.3)",
  },
  actionBtnPink: {
    backgroundColor: "rgba(244,114,182,0.1)",
    borderColor: "rgba(244,114,182,0.3)",
  },
  actionBtnIcon: { fontSize: 32 },
  actionBtnContent: { flex: 1 },
  actionBtnTitle: { color: "#f1f5f9", fontWeight: "800", fontSize: 15 },
  actionBtnSub: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  actionBtnArrow: { color: "#64748b", fontSize: 16, fontWeight: "700" },
  otherActionsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  otherActionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#131c2e",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  otherActionIcon: { fontSize: 22 },
  otherActionText: { color: "#94a3b8", fontSize: 11, fontWeight: "600" },

  // User stats
  userStatsWrap: {
    backgroundColor: "#131c2e",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  userStatsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f1f5f9",
    textAlign: "center",
    marginBottom: 14,
  },
  userStatsGrid: { flexDirection: "row", justifyContent: "space-around" },
  userStatItem: { alignItems: "center" },
  userStatValue: { fontSize: 24, fontWeight: "900", color: "#4ade80" },
  userStatLabel: { fontSize: 11, color: "#94a3b8", marginTop: 4 },

  // Confetti
  confettiOverlay: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    height: 200,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  confettiEmoji: { fontSize: 48 },
});

export default WasteAnalyzer;
