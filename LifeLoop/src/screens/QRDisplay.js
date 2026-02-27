// src/screens/QRDisplay.js - Donor shows QR code to recipient at pickup
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";
import QRGenerator from "../components/QRGenerator";

const QRDisplayScreen = ({ route, navigation }) => {
  const { listingId, recipientId, recipientName, listingTitle, transactionId } =
    route.params || {};

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your QR Code</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Recipient context */}
          <View style={styles.contextCard}>
            <Text style={styles.contextLabel}>Show this to</Text>
            <Text style={styles.contextValue}>{recipientName}</Text>
            <Text style={styles.contextSubtext}>at pickup</Text>
          </View>

          {/* QR Generator component */}
          <QRGenerator
            listingId={listingId}
            recipientId={recipientId}
            recipientName={recipientName}
            listingTitle={listingTitle}
          />

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>📱 How it works</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>
                Show this QR code to {recipientName}
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                They scan it with their phone camera
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>
                Exchange completes & impact is recorded
              </Text>
            </View>
          </View>

          {/* Warning */}
          <View style={styles.warning}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Only share this QR with {recipientName}
            </Text>
          </View>

          {/* Navigation hint */}
          <View style={styles.bottomHint}>
            <Text style={styles.hintText}>
              After pickup, you'll rate each other
            </Text>
            <Text style={styles.hintSubtext}>→ Keep this screen open</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  backButton: {
    color: "#4ade80",
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },

  // Context card
  contextCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#4ade80",
  },
  contextLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 4,
  },
  contextValue: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  contextSubtext: {
    color: "#64748b",
    fontSize: 11,
  },

  // Instructions
  instructions: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#667eea",
  },
  instructionsTitle: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  instructionStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#667eea",
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 12,
    marginRight: 10,
    lineHeight: 24,
  },
  stepText: {
    color: "#cbd5e1",
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },

  // Warning
  warning: {
    backgroundColor: "#7c2d12",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginVertical: 12,
  },
  warningIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  warningText: {
    color: "#fed7aa",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },

  // Bottom hint
  bottomHint: {
    backgroundColor: "#1e3a1f",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    alignItems: "center",
  },
  hintText: {
    color: "#4ade80",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  hintSubtext: {
    color: "#86efac",
    fontSize: 11,
  },
});

export default QRDisplayScreen;
