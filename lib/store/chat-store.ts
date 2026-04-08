"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ChatSession, DiagnosisRecord, Message, UploadedImageRecord } from "../types";

type ChatStore = {
  currentChatId: string;
  messages: Message[];
  chatSessions: ChatSession[];
  uploadedImages: UploadedImageRecord[];
  diagnoses: DiagnosisRecord[];
  addMessage: (message: Message) => void;
  addMessageToChat: (chatId: string, message: Message) => void;
  addDiagnosis: (diagnosis: DiagnosisRecord) => void;
  addUploadedImage: (image: UploadedImageRecord) => void;
  setMessages: (messages: Message[]) => void;
  startNewChat: () => void;
  createChat: () => string;
  selectChat: (chatId: string) => void;
};

type PersistedChatStore = Partial<ChatStore>;

function buildWelcomeMessage(): Message {
  return {
    id: "welcome-message",
    sender: "assistant",
    mode: "text",
    timestamp: "Now",
    content:
      "Hello, I'm MediGenie. Share symptoms, upload a medical image, or record your voice, and I'll send it to your healthcare backend.",
  };
}

const defaultChatId = "default-chat";
const defaultMessages: Message[] = [buildWelcomeMessage()];

function deriveChatTitle(messages: Message[]) {
  const firstUserMessage = messages.find((message) => message.sender === "user");
  if (!firstUserMessage) {
    return "New chat";
  }

  return firstUserMessage.content.replace(/\s+/g, " ").trim().slice(0, 42) || "New chat";
}

function deriveChatPreview(messages: Message[]) {
  const latestVisibleMessage = [...messages].reverse().find((message) => message.sender !== "system");
  if (!latestVisibleMessage) {
    return "Start a new healthcare conversation.";
  }

  return latestVisibleMessage.content.replace(/\s+/g, " ").trim().slice(0, 72) || "Start a new healthcare conversation.";
}

function buildSession(id: string, messages: Message[], updatedAt: string): ChatSession {
  return {
    id,
    title: deriveChatTitle(messages),
    preview: deriveChatPreview(messages),
    updatedAt,
    messages,
  };
}

function syncSession(chatSessions: ChatSession[], currentChatId: string, messages: Message[], updatedAt: string) {
  const nextSession = buildSession(currentChatId, messages, updatedAt);
  return [nextSession, ...chatSessions.filter((session) => session.id !== currentChatId)];
}

function createNewChatSession(chatId: string): ChatSession {
  const nextMessages = [buildWelcomeMessage()];

  return {
    id: chatId,
    title: "New chat",
    updatedAt: "Now",
    preview: "Start a new healthcare conversation.",
    messages: nextMessages,
  };
}

const defaultChatSessions: ChatSession[] = [
  {
    id: defaultChatId,
    title: "New chat",
    updatedAt: "Now",
    preview: "Start a new healthcare conversation.",
    messages: defaultMessages,
  },
];

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      currentChatId: defaultChatId,
      messages: defaultMessages,
      chatSessions: defaultChatSessions,
      uploadedImages: [],
      diagnoses: [],
      addMessage: (message) =>
        set((state) => {
          const nextMessages = [...state.messages, message];
          return {
            messages: nextMessages,
            chatSessions: syncSession(state.chatSessions, state.currentChatId, nextMessages, message.timestamp),
          };
        }),
      addMessageToChat: (chatId, message) =>
        set((state) => {
          const targetSession = state.chatSessions.find((session) => session.id === chatId);
          if (!targetSession) {
            return state;
          }

          const nextMessages = [...targetSession.messages, message];
          return {
            currentChatId: chatId,
            messages: nextMessages,
            chatSessions: syncSession(state.chatSessions, chatId, nextMessages, message.timestamp),
          };
        }),
      addDiagnosis: (diagnosis) =>
        set((state) => ({
          diagnoses: [diagnosis, ...state.diagnoses],
        })),
      addUploadedImage: (image) =>
        set((state) => ({
          uploadedImages: [image, ...state.uploadedImages],
        })),
      setMessages: (messages) =>
        set((state) => ({
          messages,
          chatSessions: syncSession(state.chatSessions, state.currentChatId, messages, messages.at(-1)?.timestamp ?? "Now"),
        })),
      createChat: () => {
        const newChatId = `chat-${Date.now()}`;

        set((state) => {
          const nextSession = createNewChatSession(newChatId);

          return {
            currentChatId: newChatId,
            messages: nextSession.messages,
            chatSessions: [nextSession, ...state.chatSessions],
          };
        });

        return newChatId;
      },
      startNewChat: () => {
        get().createChat();
      },
      selectChat: (chatId) => {
        const targetSession = get().chatSessions.find((session) => session.id === chatId);
        if (!targetSession) {
          return;
        }

        set({
          currentChatId: chatId,
          messages: targetSession.messages,
        });
      },
    }),
    {
      name: "medigenie-dashboard-v3",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as PersistedChatStore;
        const messages = state.messages?.length ? state.messages : defaultMessages;
        const chatSessions =
          state.chatSessions?.length
            ? state.chatSessions
            : [buildSession(defaultChatId, messages, messages.at(-1)?.timestamp ?? "Now")];

        return {
          currentChatId: state.currentChatId ?? chatSessions[0]?.id ?? defaultChatId,
          messages,
          chatSessions,
          uploadedImages: state.uploadedImages ?? [],
          diagnoses: state.diagnoses ?? [],
        };
      },
      partialize: (state) => ({
        currentChatId: state.currentChatId,
        messages: state.messages,
        chatSessions: state.chatSessions,
        uploadedImages: state.uploadedImages,
        diagnoses: state.diagnoses,
      }),
    },
  ),
);
