// src/navigation/AppNavigator.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";
import LiveNotificationBanner from "../components/LiveNotificationBanner";

// ─── Public Screens ───────────────────────────────────────────
import LoginScreen from "../screens/Login";
import RegisterScreen from "../screens/Register";
import ForgotPasswordScreen from "../screens/ForgotPassword";
import ResetPasswordScreen from "../screens/ResetPassword";

// ─── Protected Screens ────────────────────────────────────────
import HomeScreen from "../screens/Home";
import ListingsScreen from "../screens/Listings";
import ListingDetailsScreen from "../screens/ListingDetails";
import CreateListingScreen from "../screens/CreateListing";
import ProfileScreen from "../screens/Profile";
import NotificationsScreen from "../screens/Notifications";
import WasteAnalyzerScreen from "../screens/WasteAnalyzer";
import AnalysisHistoryScreen from "../screens/AiAnalysisHistory";
import AnalysisDetailScreen from "../screens/AnalysisDetail";
import MyPickupsScreen from "../screens/MyPickups";
import RouteOptimizerScreen from "../screens/RouteOptimizer";
import DigitalTwinScreen from "../screens/DigitalTwin";
import ChatScreen from "../screens/Chat";
import QRScannerScreen from "../components/QRScanner";
import PersonalImpactScreen from "../components/PersonalImpact";
import AdminDashboardScreen from "../Admin/AdminDashboard";
import SchedulesScreen from "../screens/Schedules";
import ScheduleDetailsScreen from "../screens/ScheduleDetails";
import CommunityStatsScreen from "../components/CommunityStats";

// ─── NEW Screens (from role-based blueprint) ──────────────
import InterestedUsersScreen from "../screens/InterestedUsers";
import QRDisplayScreen from "../screens/QRDisplay";
import RateUserScreen from "../screens/RateUser";
import AcceptAssignmentScreen from "../screens/AcceptAssignment";
import VerifyAccountScreen from "../screens/VerifyAccount";
import ReuseGuideScreen from "../screens/ReuseGuide";
import UpcycleScreen from "../screens/UpcycleScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─────────────────────────────────────────────────────────────
// Raised centre FAB for the AI Scan tab
// ─────────────────────────────────────────────────────────────
function AITabButton({ onPress }) {
  return (
    <TouchableOpacity
      style={tabStyles.fabWrap}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={tabStyles.fab}>
        <Text style={tabStyles.fabIcon}>🤖</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom Tabs  →  Home | Listings | [🤖 FAB] | Chat | Profile
// ─────────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.bar,
        tabBarActiveTintColor: "#4ade80",
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: tabStyles.label,
      }}
    >
      {/* LEFT */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 21, color }}>🏠</Text>
          ),
          tabBarLabel: "Home",
        }}
      />
      <Tab.Screen
        name="Listings"
        component={ListingsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 21, color }}>📦</Text>
          ),
          tabBarLabel: "Listings",
        }}
      />

      {/* CENTRE — raised FAB, no label */}
      <Tab.Screen
        name="WasteAnalyzer"
        component={WasteAnalyzerScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => <AITabButton {...props} />,
        }}
      />

      {/* RIGHT */}
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 21, color }}>🔔</Text>
          ),
          tabBarLabel: "Notifications",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 21, color }}>👤</Text>
          ),
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: "#0f172a",
    borderTopColor: "#1e293b",
    borderTopWidth: 1,
    height: 68,
    paddingBottom: 8,
    paddingTop: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
  // Centre FAB
  fabWrap: {
    top: -22, // lifts the circle above the bar
    alignItems: "center",
    justifyContent: "center",
    width: 70,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4ade80",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 3,
    borderColor: "#0f172a", // matches bar background = clean cutout look
  },
  fabIcon: { fontSize: 26 },
});

// ─────────────────────────────────────────────────────────────
// Root Stack
// Every navigation.navigate() call across Dashboard + other
// screens is registered here so nothing crashes at runtime.
// ─────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      >
        {!user ? (
          // ── Public ─────────────────────────────────────────
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </>
        ) : (
          // ── Protected ────────────────────────────────────
          <>
            {/* Root — renders the bottom tab bar */}
            <Stack.Screen name="Main" component={MainTabs} />

            {/* ── Dashboard navigates to all of these ── */}
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen
              name="CreateListing"
              component={CreateListingScreen}
            />
            <Stack.Screen
              name="InterestedUsers"
              component={InterestedUsersScreen}
            />
            <Stack.Screen name="Listings" component={ListingsScreen} />
            <Stack.Screen
              name="WasteAnalyzer"
              component={WasteAnalyzerScreen}
            />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
            <Stack.Screen name="QRDisplay" component={QRDisplayScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen
              name="ListingDetails"
              component={ListingDetailsScreen}
            />
            <Stack.Screen name="Schedules" component={SchedulesScreen} />

            {/* ── From Schedules screen ── */}
            <Stack.Screen
              name="ScheduleDetails"
              component={ScheduleDetailsScreen}
            />

            {/* ── Reachable from Profile / other screens ── */}
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
            />
            <Stack.Screen
              name="AnalysisHistory"
              component={AnalysisHistoryScreen}
            />
            <Stack.Screen
              name="AnalysisDetail"
              component={AnalysisDetailScreen}
            />
            <Stack.Screen name="MyPickups" component={MyPickupsScreen} />
            <Stack.Screen name="RateUser" component={RateUserScreen} />
            <Stack.Screen
              name="AcceptAssignment"
              component={AcceptAssignmentScreen}
            />
            <Stack.Screen
              name="RouteOptimizer"
              component={RouteOptimizerScreen}
            />
            <Stack.Screen name="DigitalTwin" component={DigitalTwinScreen} />
            <Stack.Screen
              name="PersonalImpact"
              component={PersonalImpactScreen}
            />
            <Stack.Screen
              name="CommunityStats"
              component={CommunityStatsScreen}
            />
            <Stack.Screen
              name="AdminDashboard"
              component={AdminDashboardScreen}
            />

            {/* ── Additional Protected Screens ── */}
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
            />
            <Stack.Screen
              name="VerifyAccount"
              component={VerifyAccountScreen}
            />
            <Stack.Screen name="ReuseGuide" component={ReuseGuideScreen} />
            <Stack.Screen name="UpCycleModal" component={UpcycleScreen} />
          </>
        )}
      </Stack.Navigator>
      <LiveNotificationBanner />
    </NavigationContainer>
  );
}
