// src/screens/GuestScreen.js - Landing Page (No Authentication)
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
} from "react-native";

const { width: SW } = Dimensions.get("window");

// ═══════════════════════════════════════════════════════════════════════════
// GUEST VIEW COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const BenefitCard = ({ icon, title, description }) => (
  <View style={styles.benefitCard}>
    <Text style={styles.benefitIcon}>{icon}</Text>
    <Text style={styles.benefitTitle}>{title}</Text>
    <Text style={styles.benefitDesc}>{description}</Text>
  </View>
);

const StepCard = ({ num, title, desc }) => (
  <View style={styles.stepCard}>
    <View style={styles.stepNum}>
      <Text style={styles.stepNumText}>{num}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDesc}>{desc}</Text>
    </View>
  </View>
);

const TestimonialCard = ({ text, author, role, initial }) => (
  <View style={styles.testimonialCard}>
    <Text style={styles.testimonialStars}>⭐⭐⭐⭐⭐</Text>
    <Text style={styles.testimonialText}>"{text}"</Text>
    <View style={styles.testimonialAuthorContainer}>
      <View style={styles.testimonialAvatar}>
        <Text style={styles.testimonialAvatarText}>{initial}</Text>
      </View>
      <View>
        <Text style={styles.testimonialAuthor}>{author}</Text>
        <Text style={styles.testimonialRole}>{role}</Text>
      </View>
    </View>
  </View>
);

const GuestScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const benefits = [
    {
      icon: "🤖",
      title: "AI-Powered Analysis",
      description:
        "Snap a photo and our AI instantly identifies items and suggests the best options.",
    },
    {
      icon: "🌍",
      title: "Track Your Impact",
      description:
        "See exactly how much CO₂ you've saved and your contribution to a cleaner planet.",
    },
    {
      icon: "🤝",
      title: "Community Connection",
      description:
        "Connect with neighbors who need what you have. Real-time chat and verified pickups.",
    },
    {
      icon: "📍",
      title: "Local First",
      description:
        "Find recycling centers and donation points within your area.",
    },
    {
      icon: "🔒",
      title: "Secure & Verified",
      description: "QR code verification, user ratings, and secure messaging.",
    },
    {
      icon: "📊",
      title: "Smart Scheduling",
      description: "Flexible pickup times and route optimization.",
    },
  ];

  const steps = [
    {
      num: "1",
      title: "Snap & Identify",
      desc: "Take a photo of an item you want to donate or recycle",
    },
    {
      num: "2",
      title: "AI Suggests",
      desc: "Our AI recommends the best action for that item",
    },
    {
      num: "3",
      title: "Choose Path",
      desc: "Donate to someone in need, recycle, or upcycle",
    },
    {
      num: "4",
      title: "Schedule Pickup",
      desc: "Pick a time that works for you",
    },
    {
      num: "5",
      title: "Track Impact",
      desc: "See how your actions help the planet",
    },
  ];

  const testimonials = [
    {
      text: "I've donated so much stuff instead of throwing it away. LifeLoop made it so easy!",
      author: "Sarah M.",
      role: "Active Donor",
      initial: "S",
    },
    {
      text: "Found exactly what I needed at a fraction of the price. Love the verification system!",
      author: "John D.",
      role: "Recipient",
      initial: "J",
    },
    {
      text: "The AI feature is incredible. It identified my old items and found perfect homes for them.",
      author: "Emma K.",
      role: "Sustainability Advocate",
      initial: "E",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View
          style={[
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>♻️ LifeLoop</Text>
            <Text style={styles.heroSubtitle}>
              Give your items a second life. Save the planet, one donation at a
              time.
            </Text>
            <View style={styles.heroCTAContainer}>
              <TouchableOpacity
                style={styles.heroButtonPrimary}
                onPress={() => navigation.navigate("Register")}
              >
                <Text style={styles.heroButtonText}>Get Started</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroButtonSecondary}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={styles.heroButtonSecondaryText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Benefits Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why Use LifeLoop?</Text>
            <View style={styles.benefitsGrid}>
              {benefits.map((benefit, idx) => (
                <BenefitCard key={idx} {...benefit} />
              ))}
            </View>
          </View>

          {/* How It Works */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            {steps.map((step, idx) => (
              <StepCard key={idx} {...step} />
            ))}
          </View>

          {/* Testimonials */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What People Say</Text>
            {testimonials.map((testimonial, idx) => (
              <TestimonialCard key={idx} {...testimonial} />
            ))}
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statPill}>
              <Text style={styles.statNumber}>10K+</Text>
              <Text style={styles.statLabel}>Items Donated</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statNumber}>5K+</Text>
              <Text style={styles.statLabel}>Active Users</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statNumber}>50T</Text>
              <Text style={styles.statLabel}>CO₂ Saved</Text>
            </View>
          </View>

          {/* Footer CTA */}
          <View style={styles.footerCTA}>
            <Text style={styles.footerCTATitle}>
              Ready to make a difference?
            </Text>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={styles.footerButtonText}>Join LifeLoop Today</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: "#2A9D8F",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#E0F7F6",
    marginBottom: 30,
    lineHeight: 24,
  },
  heroCTAContainer: {
    flexDirection: "row",
    gap: 10,
  },
  heroButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderRadius: 8,
    alignItems: "center",
  },
  heroButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#FFF",
    borderRadius: 8,
    alignItems: "center",
  },
  heroButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2A9D8F",
  },
  heroButtonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1B1B1B",
    marginBottom: 20,
  },
  benefitsGrid: {
    gap: 15,
  },
  benefitCard: {
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 20,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#2A9D8F",
  },
  benefitIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1B1B1B",
    marginBottom: 5,
  },
  benefitDesc: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  stepCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    gap: 15,
  },
  stepNum: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#2A9D8F",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1B1B1B",
  },
  stepDesc: {
    fontSize: 13,
    color: "#666",
    marginTop: 3,
  },
  testimonialCard: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  testimonialStars: {
    fontSize: 14,
    marginBottom: 8,
  },
  testimonialText: {
    fontSize: 14,
    color: "#333",
    fontStyle: "italic",
    marginBottom: 12,
    lineHeight: 20,
  },
  testimonialAuthorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  testimonialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2A9D8F",
    justifyContent: "center",
    alignItems: "center",
  },
  testimonialAvatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
  testimonialAuthor: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1B1B1B",
  },
  testimonialRole: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 40,
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: "#2A9D8F",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#E0F7F6",
    marginTop: 5,
  },
  footerCTA: {
    marginHorizontal: 20,
    marginTop: 40,
    padding: 20,
    backgroundColor: "#2A9D8F",
    borderRadius: 12,
    alignItems: "center",
  },
  footerCTATitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 15,
  },
  footerButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderRadius: 8,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2A9D8F",
  },
});

export default GuestScreen;
