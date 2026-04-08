"use client";

import { motion } from "framer-motion";
import { ImagePlus, Mic, SendHorizontal, X } from "lucide-react";

export function ChatInput({
  query,
  onQueryChange,
  onSubmit,
  onToggleRecording,
  isRecording,
  recordingSeconds,
  isSending,
  onSelectImage,
  selectedImageName,
  selectedImagePreview,
  onClearImage,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onToggleRecording: () => void;
  isRecording: boolean;
  recordingSeconds: number;
  isSending: boolean;
  onSelectImage: (file: File | null) => void;
  selectedImageName: string | null;
  selectedImagePreview: string | null;
  onClearImage: () => void;
}) {
  return (
    <div className="sticky bottom-0 px-3 pb-4 pt-2 sm:px-0 sm:pb-6">
      <motion.div
        layout
        className="rounded-[2rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.74),rgba(15,23,42,0.92))] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.28)] ring-1 ring-white/10 backdrop-blur-2xl"
      >
        {selectedImagePreview ? (
          <div className="mb-3 flex items-center gap-3 rounded-[1.5rem] bg-white/6 p-3 ring-1 ring-white/8">
            <img src={selectedImagePreview} alt={selectedImageName ?? "Uploaded preview"} className="h-16 w-16 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">{selectedImageName}</p>
              <p className="mt-1 text-sm text-slate-400">Image attached and ready for upload.</p>
            </div>
            <button
              type="button"
              onClick={onClearImage}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8 text-slate-300 transition hover:bg-white/12 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 rounded-[1.6rem] bg-white/6 px-4 py-3 ring-1 ring-white/8">
            <textarea
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              rows={3}
              placeholder="Describe symptoms, ask a question, or request guidance..."
              className="w-full resize-none border-0 bg-transparent text-[15px] leading-7 text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleRecording}
              disabled={isSending}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                isRecording
                  ? "bg-rose-600 text-white shadow-[0_16px_36px_rgba(225,29,72,0.24)]"
                  : "bg-white/8 text-slate-300 ring-1 ring-white/10 hover:bg-white/12 hover:text-white"
              } disabled:cursor-not-allowed disabled:opacity-60`}
              aria-label={isRecording ? `Stop recording at ${recordingSeconds} seconds` : "Start voice recording"}
            >
              <Mic className="h-4 w-4" />
            </button>

            <label className="inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl bg-white/8 text-slate-300 ring-1 ring-white/10 transition hover:bg-white/12 hover:text-white">
              <ImagePlus className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => onSelectImage(event.target.files?.[0] ?? null)}
              />
            </label>

            <button
              type="button"
              onClick={onSubmit}
              disabled={(!query.trim() && !selectedImagePreview) || isSending}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f766e,#2dd4bf)] px-5 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(20,184,166,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              <SendHorizontal className="h-4 w-4" />
              <span>Send</span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 px-1 text-xs text-slate-500">
          <span>{isRecording ? `Recording ${recordingSeconds}s` : "Voice, image, and text supported"}</span>
          <span>Return sends faster care prompts</span>
        </div>
      </motion.div>
    </div>
  );
}
