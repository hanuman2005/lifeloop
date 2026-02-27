// src/context/LanguageContext.js - React Native
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "../i18n/locales/en.json";
import hi from "../i18n/locales/hi.json";
import te from "../i18n/locales/te.json";

export const LanguageContext = createContext();

const translations = { en, hi, te };

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState("en");

  // Load saved language on mount
  useEffect(() => {
    AsyncStorage.getItem("language").then((saved) => {
      if (saved && translations[saved]) {
        setLanguageState(saved);
      }
    });
  }, []);

  const setLanguage = async (lang) => {
    if (translations[lang]) {
      setLanguageState(lang);
      await AsyncStorage.setItem("language", lang);
    }
  };

  // Translation function with fallback to English
  const t = (key) => {
    const translation = translations[language]?.[key];
    if (!translation && __DEV__) {
      console.warn(
        `Missing translation for key: "${key}" in language: "${language}"`,
      );
    }
    return translation || translations.en?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
