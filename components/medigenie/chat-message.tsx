"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CircleUserRound,
  ImagePlus,
  Play,
  Sparkles,
  Stethoscope,
  AudioLines,
} from "lucide-react";

import { splitResponseSections } from "../../lib/ui-utils";
import type { Message } from "../../lib/types";

function StreamedText({ content, animate }: { content: string; animate: boolean }) {
  const [displayed, setDisplayed] = useState(animate ? "" : content);

  useEffect(() => {
    if (!animate) {
      setDisplayed(content);
      return;
    }

    let index = 0;
    const timer = window.setInterval(() => {
      index += Math.max(1, Math.floor(content.length / 45));
      setDisplayed(content.slice(0, index));
      if (index >= content.length) {
        window.clearInterval(timer);
      }
    }, 28);

    return () => window.clearInterval(timer);
  }, [animate, content]);

  return <p className="text-[15px] leading-7 text-slate-100">{displayed}</p>;
}

export function ChatMessage({
  message,
  isLatestAssistant,
  activeAudioId,
  onPlayAudio,
}: {
  message: Message;
  isLatestAssistant: boolean;
  activeAudioId: string | null;
  onPlayAudio: (message: Message) => void;
}) {
  const isUser = message.sender === "user";
  const isSystem = message.sender === "system";
  const sections = useMemo(() => splitResponseSections(message.content), [message.content]);

  const icon =
    message.mode === "image" ? ImagePlus : message.mode === "voice" ? AudioLines : message.sender === "assistant" ? Stethoscope : Sparkles;

  const BubbleIcon = isSystem ? AlertCircle : isUser ? CircleUserRound : icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser ? (
        <div
          className={`mt-1 flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)] ${
            isSystem ? "bg-white/10 text-slate-200 ring-1 ring-white/10" : "bg-[linear-gradient(135deg,#0f766e,#2dd4bf)]"
          }`}
        >
          <BubbleIcon className="h-5 w-5" />
        </div>
      ) : null}

      <div
        className={`max-w-[88%] rounded-[2rem] px-5 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.16)] sm:max-w-[78%] ${
          isUser
            ? "bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.92),rgba(6,78,59,0.9))] text-white"
            : isSystem
              ? "bg-white/6 text-slate-200 ring-1 ring-white/10 backdrop-blur-2xl"
              : "bg-white/8 text-slate-100 ring-1 ring-white/10 backdrop-blur-2xl"
        }`}
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] opacity-60">
          <span>{isUser ? "Patient" : isSystem ? "System" : "AI Doctor"}</span>
          {message.mode ? <span>{message.mode}</span> : null}
          <span>{message.timestamp}</span>
        </div>

        {isUser || isSystem ? (
          <p className={`mt-3 whitespace-pre-wrap text-[15px] leading-7 ${isUser ? "text-white" : "text-slate-200"}`}>{message.content}</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-[1.5rem] bg-white/6 p-4 ring-1 ring-white/8">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">
                <Stethoscope className="h-4 w-4" />
                <span>Diagnosis</span>
              </div>
              <div className="mt-3">
                <StreamedText content={sections.diagnosis} animate={isLatestAssistant} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-white/5 p-4 ring-1 ring-white/8">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <Sparkles className="h-4 w-4" />
                  <span>Possible Causes</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{sections.possibleCauses}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/5 p-4 ring-1 ring-white/8">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>Recommendations</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{sections.recommendations}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onPlayAudio(message)}
              className="inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-medium text-teal-100 ring-1 ring-white/10 transition hover:bg-white/12"
            >
              <Play className="h-4 w-4" />
              <span>{activeAudioId === message.id ? "Playing audio" : message.audioUrl ? "Play Audio" : "Speak Reply"}</span>
            </button>
          </div>
        )}
      </div>

      {isUser ? (
        <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-white ring-1 ring-white/10">
          <CircleUserRound className="h-5 w-5" />
        </div>
      ) : null}
    </motion.div>
  );
}
