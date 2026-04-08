"use client";

import { Clock3, ImageIcon, MessageSquareText, PanelRight } from "lucide-react";

const items = [
  { label: "Chat", icon: MessageSquareText },
  { label: "History", icon: Clock3 },
  { label: "Images", icon: ImageIcon },
  { label: "Insights", icon: PanelRight },
];

export function MobileNav({ onOpenInsights }: { onOpenInsights: () => void }) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 rounded-[1.8rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))] px-3 py-2 text-slate-300 shadow-[0_24px_60px_rgba(0,0,0,0.28)] ring-1 ring-white/10 backdrop-blur-2xl lg:hidden">
      <div className="flex items-center justify-between gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const action =
            item.label === "Chat"
              ? () => window.scrollTo({ top: 0, behavior: "smooth" })
              : onOpenInsights;

          return (
            <button
              key={item.label}
              type="button"
              onClick={action}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 transition hover:bg-white/6 hover:text-white"
            >
              <Icon className="h-4 w-4" />
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
