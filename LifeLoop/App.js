// App.js – Classic Expo (React Native)

import React from "react";
import { Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";

import { AuthProvider } from "./src/context/AuthContext";
import { SocketProvider } from "./src/context/SocketContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { ChatBotProvider } from "./src/context/ChatBotContext";
import { ThemeProvider } from "./src/context/ThemeContext";
import AppNavigator from "./src/navigation/AppNavigator";
import ChatBot from "./src/components/ChatBot";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <NotificationProvider>
                <ChatBotProvider>
                  <StatusBar style="light" />
                  <AppNavigator />
                  <ChatBot />

                  <Text
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      textAlign: "center",
                      padding: 10,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      color: "#fff",
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                  >
                    © 2024 LifeLoop. All rights reserved.
                  </Text>

                  <Toast />
                </ChatBotProvider>
              </NotificationProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
