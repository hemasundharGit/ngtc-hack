"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AreaChart, Brain, History, ImageIcon, ShieldAlert, X } from "lucide-react";

import type { DiagnosisRecord, Message, UploadedImageRecord } from "../../lib/types";

type Trend = {
  keyword: string;
  count: number;
};

const statCards = [
  { key: "messages", label: "Chat history", icon: History },
  { key: "images", label: "Uploaded images", icon: ImageIcon },
  { key: "diagnoses", label: "Diagnoses", icon: Brain },
];

export function InsightsPanel({
  open,
  onClose,
  messages,
  uploadedImages,
  diagnoses,
  symptomTrends,
}: {
  open: boolean;
  onClose: () => void;
  messages: Message[];
  uploadedImages: UploadedImageRecord[];
  diagnoses: DiagnosisRecord[];
  symptomTrends: Trend[];
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close insights panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 hidden bg-slate-950/30 backdrop-blur-[2px] lg:block"
          />

          <motion.aside
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed inset-y-5 right-5 z-40 hidden w-[23rem] overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.96))] text-slate-100 shadow-[0_24px_90px_rgba(0,0,0,0.34)] ring-1 ring-white/10 backdrop-blur-2xl lg:block"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.14),transparent_34%)]" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center justify-between px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8 text-white ring-1 ring-white/10">
                    <AreaChart className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-200">Insights</p>
                    <h3 className="mt-1 text-2xl font-semibold text-white">Care timeline</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
                <div className="grid gap-3">
                  {statCards.map((card) => {
                    const Icon = card.icon;
                    const value =
                      card.key === "messages"
                        ? messages.length
                        : card.key === "images"
                          ? uploadedImages.length
                          : diagnoses.length;

                    return (
                      <div key={card.key} className="rounded-[1.6rem] bg-white/6 p-4 ring-1 ring-white/8">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-400/12 text-teal-200">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{card.label}</p>
                            <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-[1.7rem] bg-white/6 p-4 ring-1 ring-white/8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="h-4 w-4 text-teal-200" />
                      <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Symptom trends</h4>
                    </div>
                    <span className="text-xs text-slate-500">Top mentions</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {symptomTrends.length ? (
                      symptomTrends.map((trend) => (
                        <div key={trend.keyword}>
                          <div className="flex items-center justify-between text-sm text-slate-300">
                            <span className="capitalize">{trend.keyword}</span>
                            <span className="font-semibold text-white">{trend.count}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-white/8">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(trend.count * 20, 100)}%` }}
                              className="h-2 rounded-full bg-[linear-gradient(90deg,#2dd4bf,#38bdf8)]"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">No symptom trends yet. Start chatting to build analytics.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.7rem] bg-white/6 p-4 ring-1 ring-white/8">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Recent diagnoses</h4>
                  <div className="mt-4 space-y-3">
                    {diagnoses.length ? (
                      diagnoses.slice(0, 4).map((diagnosis) => (
                        <div key={diagnosis.id} className="rounded-2xl bg-white/5 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-200">
                              {diagnosis.source}
                            </span>
                            <span className="text-xs text-slate-500">{diagnosis.timestamp}</span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-slate-100">{diagnosis.query}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-400">{diagnosis.diagnosis}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">No diagnoses saved yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.7rem] bg-white/6 p-4 ring-1 ring-white/8">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Uploaded images</h4>
                  <div className="mt-4 space-y-3">
                    {uploadedImages.length ? (
                      uploadedImages.slice(0, 4).map((image) => (
                        <div key={image.id} className="flex gap-3 rounded-2xl bg-white/5 p-3">
                          <img src={image.previewUrl} alt={image.name} className="h-16 w-16 rounded-2xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-semibold text-slate-100">{image.name}</p>
                              <span className="text-xs text-slate-500">{image.timestamp}</span>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-slate-400">{image.query}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">Uploaded image cases will appear here.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>

          <motion.button
            type="button"
            aria-label="Close insights panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
          />

          <motion.aside
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed inset-x-3 bottom-20 top-20 z-50 overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] text-slate-100 shadow-[0_24px_90px_rgba(0,0,0,0.34)] ring-1 ring-white/10 backdrop-blur-2xl lg:hidden"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.14),transparent_34%)]" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-white ring-1 ring-white/10">
                    <AreaChart className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-200">Insights</p>
                    <h3 className="mt-1 truncate text-xl font-semibold text-white">Care timeline</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  {statCards.map((card) => {
                    const Icon = card.icon;
                    const value =
                      card.key === "messages"
                        ? messages.length
                        : card.key === "images"
                          ? uploadedImages.length
                          : diagnoses.length;

                    return (
                      <div key={card.key} className="rounded-[1.6rem] bg-white/6 p-4 ring-1 ring-white/8">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-400/12 text-teal-200">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{card.label}</p>
                            <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-[1.7rem] bg-white/6 p-4 ring-1 ring-white/8">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="h-4 w-4 text-teal-200" />
                      <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Symptom trends</h4>
                    </div>
                    <span className="text-xs text-slate-500">Top mentions</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {symptomTrends.length ? (
                      symptomTrends.map((trend) => (
                        <div key={trend.keyword}>
                          <div className="flex items-center justify-between text-sm text-slate-300">
                            <span className="capitalize">{trend.keyword}</span>
                            <span className="font-semibold text-white">{trend.count}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-white/8">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(trend.count * 20, 100)}%` }}
                              className="h-2 rounded-full bg-[linear-gradient(90deg,#2dd4bf,#38bdf8)]"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">No symptom trends yet. Start chatting to build analytics.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.7rem] bg-white/6 p-4 ring-1 ring-white/8">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Recent diagnoses</h4>
                  <div className="mt-4 space-y-3">
                    {diagnoses.length ? (
                      diagnoses.slice(0, 4).map((diagnosis) => (
                        <div key={diagnosis.id} className="rounded-2xl bg-white/5 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-200">
                              {diagnosis.source}
                            </span>
                            <span className="text-xs text-slate-500">{diagnosis.timestamp}</span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-slate-100">{diagnosis.query}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-400">{diagnosis.diagnosis}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">No diagnoses saved yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.7rem] bg-white/6 p-4 ring-1 ring-white/8">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Uploaded images</h4>
                  <div className="mt-4 space-y-3">
                    {uploadedImages.length ? (
                      uploadedImages.slice(0, 4).map((image) => (
                        <div key={image.id} className="flex gap-3 rounded-2xl bg-white/5 p-3">
                          <img src={image.previewUrl} alt={image.name} className="h-16 w-16 rounded-2xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-semibold text-slate-100">{image.name}</p>
                              <span className="text-xs text-slate-500">{image.timestamp}</span>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-slate-400">{image.query}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">Uploaded image cases will appear here.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
