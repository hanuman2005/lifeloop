// src/context/ThemeContext.js - React Native
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export const lightTheme = {
  name: 'light',
  colors: {
    background:    '#f7fafc',
    surface:       '#ffffff',
    surfaceHover:  '#f8f9fa',
    textPrimary:   '#2d3748',
    textSecondary: '#718096',
    textTertiary:  '#a0aec0',
    primary:       '#f093fb',
    primaryHover:  '#e879f9',
    secondary:     '#f5576c',
    success:       '#48bb78',
    warning:       '#ed8936',
    error:         '#e53e3e',
    info:          '#4299e1',
    border:        '#e2e8f0',
    borderHover:   '#cbd5e0',
    overlay:       'rgba(0,0,0,0.5)',
    cardBg:        '#ffffff',
    cardBorder:    '#e2e8f0',
    headerBg:      '#ffffff',
    headerBorder:  '#e2e8f0',
    inputBg:       '#f8fafc',
    inputBorder:   '#e2e8f0',
    inputFocus:    '#f093fb',
  },
};

export const darkTheme = {
  name: 'dark',
  colors: {
    background:    '#0f172a',
    surface:       '#1e293b',
    surfaceHover:  '#334155',
    textPrimary:   '#f1f5f9',
    textSecondary: '#cbd5e1',
    textTertiary:  '#94a3b8',
    primary:       '#f093fb',
    primaryHover:  '#e879f9',
    secondary:     '#f5576c',
    success:       '#34d399',
    warning:       '#fbbf24',
    error:         '#f87171',
    info:          '#60a5fa',
    border:        '#334155',
    borderHover:   '#475569',
    overlay:       'rgba(0,0,0,0.7)',
    cardBg:        '#1e293b',
    cardBorder:    '#334155',
    headerBg:      '#1e293b',
    headerBorder:  '#334155',
    inputBg:       '#0f172a',
    inputBorder:   '#334155',
    inputFocus:    '#f093fb',
  },
};

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState(systemScheme === 'dark' ? 'dark' : 'light');

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem('theme').then(saved => {
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
      }
    });
  }, []);

  const toggleTheme = async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    await AsyncStorage.setItem('theme', next);
  };

  const setLightTheme = async () => {
    setTheme('light');
    await AsyncStorage.setItem('theme', 'light');
  };

  const setDarkTheme = async () => {
    setTheme('dark');
    await AsyncStorage.setItem('theme', 'dark');
  };

  const currentTheme = theme === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{
      theme,
      themeColors: currentTheme,
      isDark:  theme === 'dark',
      isLight: theme === 'light',
      toggleTheme,
      setLightTheme,
      setDarkTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;