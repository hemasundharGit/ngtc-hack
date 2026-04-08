"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, LoaderCircle } from "lucide-react";

export type ToastItem = {
  id: string;
  title: string;
  description: string;
  tone: "success" | "error" | "info";
};

const toneMap = {
  success: {
    icon: CheckCircle2,
    className: "bg-emerald-400/12 text-emerald-100 ring-emerald-400/20",
  },
  error: {
    icon: AlertCircle,
    className: "bg-rose-400/12 text-rose-100 ring-rose-400/20",
  },
  info: {
    icon: LoaderCircle,
    className: "bg-white/10 text-slate-100 ring-white/12",
  },
};

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = toneMap[toast.tone];
          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className={`pointer-events-auto rounded-[1.4rem] px-4 py-3 shadow-[0_16px_50px_rgba(0,0,0,0.24)] ring-1 backdrop-blur-2xl ${config.className}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${toast.tone === "info" ? "animate-spin" : ""}`} />
                <div>
                  <p className="text-sm font-semibold">{toast.title}</p>
                  <p className="mt-1 text-sm opacity-80">{toast.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
