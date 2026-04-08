"use client";

import { motion } from "framer-motion";

export function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="rounded-[1.8rem] bg-white/6 px-5 py-4 text-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.2)] ring-1 ring-white/10 backdrop-blur-2xl">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
        <span>MediGenie</span>
        <span>{label}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            className="h-2.5 w-2.5 rounded-full bg-teal-300"
            animate={{ y: [0, -5, 0], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, delay: dot * 0.14 }}
          />
        ))}
      </div>
    </div>
  );
}
