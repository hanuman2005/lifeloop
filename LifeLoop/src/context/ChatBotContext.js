// src/context/ChatBotContext.js
import React, { createContext, useState, useContext } from "react";

const ChatBotContext = createContext();

export const ChatBotProvider = ({ children }) => {
  const [isChatBotOpen, setIsChatBotOpen] = useState(false);

  const toggleChatBot = () => {
    setIsChatBotOpen(!isChatBotOpen);
  };

  const openChatBot = () => {
    setIsChatBotOpen(true);
  };

  const closeChatBot = () => {
    setIsChatBotOpen(false);
  };

  return (
    <ChatBotContext.Provider
      value={{ isChatBotOpen, toggleChatBot, openChatBot, closeChatBot }}
    >
      {children}
    </ChatBotContext.Provider>
  );
};

export const useChatBot = () => {
  const context = useContext(ChatBotContext);
  if (!context) {
    throw new Error("useChatBot must be used within ChatBotProvider");
  }
  return context;
};
