"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clock3, ImageIcon, MessageSquarePlus, MessageSquareText, Settings2, Stethoscope, X } from "lucide-react";

import { getHealthBannerConfig } from "./health-banner";
import { apiBaseUrl } from "../../lib/api";
import { quickPrompts } from "../../lib/ui-utils";
import type { HealthApiResponse } from "../../lib/api";
import type { ChatSession, HealthState } from "../../lib/types";

const navItems = [
  { label: "Chat", icon: MessageSquareText },
  { label: "History", icon: Clock3 },
  { label: "Images", icon: ImageIcon },
  { label: "Settings", icon: Settings2 },
];

export function Sidebar({
  onQuickPrompt,
  chatSessions,
  currentChatId,
  onSelectChat,
  onStartNewChat,
  health,
  healthState,
  healthMessage,
  mobileOpen = false,
  onCloseMobile,
}: {
  onQuickPrompt: (prompt: string) => void;
  chatSessions: ChatSession[];
  currentChatId: string;
  onSelectChat: (chatId: string) => void;
  onStartNewChat: () => void;
  health: HealthApiResponse | null;
  healthState: HealthState;
  healthMessage: string;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const healthConfig = getHealthBannerConfig(health, healthState);
  const HealthIcon = healthConfig.icon;

  const content = (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.18),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.92))]" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.2rem] bg-[linear-gradient(135deg,#0f766e,#2dd4bf)] text-white shadow-[0_16px_34px_rgba(45,212,191,0.22)]">
            <Stethoscope className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.34em] text-teal-200">MediGenie</p>
            <p className="mt-1 truncate text-sm text-slate-400">AI care workspace</p>
          </div>
          {onCloseMobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-7 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className="flex w-full items-center gap-3 rounded-[1.15rem] px-2 py-2.5 text-left text-slate-300 transition hover:bg-white/8 hover:text-white"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-white/7 text-slate-200 ring-1 ring-white/8">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="overflow-hidden text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="sidebar-scroll mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden pr-1">
          <div className="rounded-[1.5rem] bg-white/6 p-3.5 ring-1 ring-white/8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-200">Chats</p>
              <button
                type="button"
                onClick={() => {
                  onStartNewChat();
                  onCloseMobile?.();
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/6 text-slate-200 transition hover:bg-white/10 hover:text-white"
                aria-label="Start new chat"
                title="Start new chat"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {chatSessions.slice(0, 5).map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => {
                    onSelectChat(chat.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full rounded-[1rem] px-3 py-2.5 text-left transition ${
                    chat.id === currentChatId ? "bg-white/12 text-white ring-1 ring-white/12" : "bg-white/4 text-slate-300 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{chat.title}</p>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-slate-500">{chat.updatedAt}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">{chat.preview}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white/6 p-3.5 ring-1 ring-white/8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-200">Quick prompts</p>
            <div className="mt-4 flex flex-col gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    onQuickPrompt(prompt);
                    onCloseMobile?.();
                  }}
                  className="rounded-full bg-white/6 px-4 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white/6 p-3.5 ring-1 ring-white/8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-200">Settings</p>
            <div className="mt-3 rounded-[1.2rem] bg-white/5 p-3 ring-1 ring-white/8">
              <div className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ring-1 ${healthConfig.className}`}>
                  <HealthIcon className={`h-3.5 w-3.5 ${healthState === "checking" ? "animate-spin" : ""}`} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-100">{healthConfig.title}</p>
                  <p className="truncate text-[11px] text-slate-400">{healthMessage}</p>
                </div>
              </div>
              <div className="mt-3 rounded-full bg-white/6 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 ring-1 ring-white/8">
                {apiBaseUrl}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <motion.aside
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="group fixed left-5 top-5 z-30 hidden h-[calc(100vh-2.5rem)] w-[4.6rem] overflow-hidden rounded-[2rem] bg-white/5 p-2.5 text-slate-200 shadow-[0_24px_80px_rgba(0,0,0,0.28)] ring-1 ring-white/10 backdrop-blur-2xl transition-[width] duration-300 hover:w-[16rem] xl:block"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.18),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.92))]" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.2rem] bg-[linear-gradient(135deg,#0f766e,#2dd4bf)] text-white shadow-[0_16px_34px_rgba(45,212,191,0.22)]">
              <Stethoscope className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 overflow-hidden opacity-0 transition duration-200 group-hover:opacity-100">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.34em] text-teal-200">MediGenie</p>
              <p className="mt-1 truncate text-sm text-slate-400">AI care workspace</p>
            </div>
          </div>

          <div className="mt-7 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-[1.15rem] px-2 py-2.5 text-left text-slate-300 transition hover:bg-white/8 hover:text-white"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-white/7 text-slate-200 ring-1 ring-white/8">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="overflow-hidden text-sm font-medium opacity-0 transition duration-200 group-hover:opacity-100">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="sidebar-scroll mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden pr-1 opacity-0 transition duration-200 group-hover:opacity-100">
            <div className="rounded-[1.5rem] bg-white/6 p-3.5 ring-1 ring-white/8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-200">Chats</p>
                <button
                  type="button"
                  onClick={onStartNewChat}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/6 text-slate-200 transition hover:bg-white/10 hover:text-white"
                  aria-label="Start new chat"
                  title="Start new chat"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {chatSessions.slice(0, 5).map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => onSelectChat(chat.id)}
                    className={`w-full rounded-[1rem] px-3 py-2.5 text-left transition ${
                      chat.id === currentChatId ? "bg-white/12 text-white ring-1 ring-white/12" : "bg-white/4 text-slate-300 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">{chat.title}</p>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-slate-500">{chat.updatedAt}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">{chat.preview}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white/6 p-3.5 ring-1 ring-white/8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-200">Quick prompts</p>
              <div className="mt-4 flex flex-col gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onQuickPrompt(prompt)}
                    className="rounded-full bg-white/6 px-4 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white/6 p-3.5 ring-1 ring-white/8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-200">Settings</p>
              <div className="mt-3 rounded-[1.2rem] bg-white/5 p-3 ring-1 ring-white/8">
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ring-1 ${healthConfig.className}`}>
                    <HealthIcon className={`h-3.5 w-3.5 ${healthState === "checking" ? "animate-spin" : ""}`} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100">{healthConfig.title}</p>
                    <p className="truncate text-[11px] text-slate-400">{healthMessage}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-full bg-white/6 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 ring-1 ring-white/8">
                  {apiBaseUrl}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close sidebar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
            />
            <motion.aside
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="fixed inset-y-4 left-4 z-50 w-[min(88vw,22rem)] overflow-hidden rounded-[2rem] bg-white/5 p-2.5 text-slate-200 shadow-[0_24px_80px_rgba(0,0,0,0.28)] ring-1 ring-white/10 backdrop-blur-2xl lg:hidden"
            >
              {content}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
