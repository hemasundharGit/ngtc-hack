"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";

import { apiBaseUrl } from "../../lib/api";
import type { HealthApiResponse } from "../../lib/api";
import type { HealthState } from "../../lib/types";

export function getHealthBannerConfig(health: HealthApiResponse | null, healthState: HealthState) {
  return healthState === "online"
    ? health?.groq_configured
      ? {
          title: "Backend online",
          className: "bg-emerald-400/12 text-emerald-200 ring-emerald-400/20",
          icon: CheckCircle2,
        }
      : {
          title: "Config incomplete",
          className: "bg-amber-400/12 text-amber-200 ring-amber-400/20",
          icon: AlertTriangle,
        }
    : healthState === "offline"
      ? {
          title: "Backend offline",
          className: "bg-rose-400/12 text-rose-200 ring-rose-400/20",
          icon: AlertTriangle,
        }
      : {
          title: "Checking backend",
          className: "bg-white/8 text-slate-200 ring-white/10",
          icon: LoaderCircle,
        };
}

export function HealthBanner({
  health,
  healthState,
  healthMessage,
  fullWidth = false,
}: {
  health: HealthApiResponse | null;
  healthState: HealthState;
  healthMessage: string;
  fullWidth?: boolean;
}) {
  const config = getHealthBannerConfig(health, healthState);

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${fullWidth ? "flex w-full max-w-none" : "inline-flex max-w-[20rem]"} min-w-0 items-center gap-3 rounded-full px-3 py-2 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-1 backdrop-blur-xl ${config.className}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${healthState === "checking" ? "animate-spin" : ""}`} />
      <div className="min-w-0">
        <p className="font-medium">{config.title}</p>
        <p className="mt-0.5 truncate text-[11px] opacity-70">{healthMessage}</p>
      </div>
      <div className="hidden max-w-[9rem] truncate rounded-full bg-white/8 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-300 md:block">
        {apiBaseUrl}
      </div>
    </motion.div>
  );
}
