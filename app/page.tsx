"use client";

import axios from "axios";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { MedigenieAppShell } from "../components/medigenie/app-shell";
import {
  apiBaseUrl,
  ErrorApiResponse,
  getHealth,
  HealthApiResponse,
  postChat,
  postImage,
  postVoice,
} from "../lib/api";

type Sender = "user" | "assistant" | "system";
type Mode = "text" | "voice" | "image";

type Message = {
  id: string;
  sender: Sender;
  content: string;
  timestamp: string;
  mode?: Mode;
  audioUrl?: string;
};

type UploadedImageRecord = {
  id: string;
  name: string;
  query: string;
  diagnosis: string;
  previewUrl: string;
  timestamp: string;
};

type DiagnosisRecord = {
  id: string;
  source: Mode;
  query: string;
  diagnosis: string;
  timestamp: string;
};

type DashboardSnapshot = {
  messages: Message[];
  uploadedImages: UploadedImageRecord[];
  diagnoses: DiagnosisRecord[];
};

const quickPrompts = [
  "Summarize my symptoms",
  "What should I monitor at home?",
  "Explain this report simply",
  "When should I seek urgent care?",
];

const storageKey = "medigenie-dashboard-v1";

const symptomKeywords = [
  "fever",
  "cough",
  "headache",
  "pain",
  "rash",
  "fatigue",
  "nausea",
  "vomiting",
  "dizziness",
  "cold",
  "sore throat",
  "swelling",
  "infection",
  "breathing",
  "chest pain",
];

const defaultMessages: Message[] = [
  {
    id: "welcome-message",
    sender: "assistant",
    mode: "text",
    timestamp: "Now",
    content:
      "Hello, I'm MediGenie. Share symptoms, upload a medical image, or record your voice, and I'll send it to your healthcare backend.",
  },
];

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getTimestamp = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to create image preview."));
      }
    };
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

function Avatar({ user = false }: { user?: boolean }) {
  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg ${
        user ? "bg-slate-900" : "bg-[linear-gradient(135deg,#0f766e,#14b8a6)]"
      }`}
    >
      {user ? (
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
          <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M5 19a7 7 0 0 1 14 0" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
          <path d="M12 4.25a3.75 3.75 0 0 0-3.75 3.75v1.25H7a3 3 0 0 0-3 3v3.75a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V12.25a3 3 0 0 0-3-3h-1.25V8A3.75 3.75 0 0 0 12 4.25Z" />
          <path d="M9.75 14.25h4.5" strokeLinecap="round" />
          <circle cx="9" cy="12.25" r=".75" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12.25" r=".75" fill="currentColor" stroke="none" />
        </svg>
      )}
    </div>
  );
}

export default function Home() {
  return <MedigenieAppShell />;
}

function LegacyHome() {
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [uploadedImages, setUploadedImages] = useState<UploadedImageRecord[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([]);
  const [query, setQuery] = useState("");
  const [imageQuery, setImageQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthApiResponse | null>(null);
  const [healthState, setHealthState] = useState<"checking" | "online" | "offline">("checking");
  const [healthMessage, setHealthMessage] = useState("Checking backend connection...");

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rawSnapshot = window.localStorage.getItem(storageKey);
    if (!rawSnapshot) {
      return;
    }

    try {
      const snapshot = JSON.parse(rawSnapshot) as DashboardSnapshot;
      setMessages(snapshot.messages?.length ? snapshot.messages : defaultMessages);
      setUploadedImages(snapshot.uploadedImages ?? []);
      setDiagnoses(snapshot.diagnoses ?? []);
    } catch {
      setMessages(defaultMessages);
      setUploadedImages([]);
      setDiagnoses([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const snapshot: DashboardSnapshot = {
      messages,
      uploadedImages,
      diagnoses,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, [messages, uploadedImages, diagnoses]);

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      setHealthState("checking");
      setHealthMessage("Checking backend connection...");

      try {
        const { data } = await getHealth();
        if (!isMounted) {
          return;
        }

        setHealth(data);
        setHealthState("online");
        setHealthMessage(
          data.groq_configured
            ? "Backend connected and Groq is configured."
            : "Backend connected, but Groq API key is missing.",
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setHealth(null);
        setHealthState("offline");
        setHealthMessage(getApiError(error, "Backend is unreachable."));
      }
    }

    void checkHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioRef.current?.pause();
    },
    [],
  );

  const assistantCount = useMemo(() => messages.filter((message) => message.sender === "assistant").length, [messages]);

  const symptomTrends = useMemo(() => {
    const searchableText = [
      ...messages
        .filter((message) => message.sender === "user" && message.mode !== "voice")
        .map((message) => message.content.toLowerCase()),
      ...diagnoses.map((diagnosis) => diagnosis.query.toLowerCase()),
    ].join(" ");

    return symptomKeywords
      .map((keyword) => ({
        keyword,
        count: searchableText.split(keyword.toLowerCase()).length - 1,
      }))
      .filter((entry) => entry.count > 0)
      .sort((left, right) => right.count - left.count)
      .slice(0, 6);
  }, [diagnoses, messages]);

  function addMessage(message: Message) {
    setMessages((current) => [...current, message]);
  }

  function addSystemMessage(content: string) {
    addMessage({ id: createId(), sender: "system", content, timestamp: getTimestamp() });
  }

  function addAssistantResponse(content: string, mode: Mode, audioUrl?: string) {
    addMessage({
      id: createId(),
      sender: "assistant",
      mode,
      content,
      timestamp: getTimestamp(),
      audioUrl,
    });
  }

  function addDiagnosisRecord(source: Mode, diagnosisQuery: string, diagnosisText: string) {
    setDiagnoses((current) => [
      {
        id: createId(),
        source,
        query: diagnosisQuery,
        diagnosis: diagnosisText,
        timestamp: getTimestamp(),
      },
      ...current,
    ]);
  }

  function getApiError(error: unknown, fallback: string) {
    if (!axios.isAxiosError(error)) {
      return fallback;
    }

    const data = error.response?.data as ErrorApiResponse | undefined;
    return data?.error || error.message || fallback;
  }

  async function sendTextMessage(prefill?: string) {
    const value = (prefill ?? query).trim();
    if (!value || isSending) return;

    addMessage({ id: createId(), sender: "user", mode: "text", content: value, timestamp: getTimestamp() });
    setQuery("");
    setIsSending(true);
    setLoadingLabel("Thinking...");

    try {
      const { data } = await postChat(value);
      addAssistantResponse(data.response, "text", data.audio_url);
      addDiagnosisRecord("text", value, data.response);
    } catch (error) {
      addSystemMessage(`Chat request failed: ${getApiError(error, "Unable to reach the chat service.")}`);
    } finally {
      setIsSending(false);
      setLoadingLabel(null);
    }
  }

  async function sendImageMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedImage || isSending) return;

    const description = imageQuery.trim() || "Please analyze this medical image.";
    addMessage({
      id: createId(),
      sender: "user",
      mode: "image",
      content: `${description}\nImage: ${selectedImage.name}`,
      timestamp: getTimestamp(),
    });

    setIsSending(true);
    setLoadingLabel("Analyzing image...");

    try {
      const { data } = await postImage(selectedImage, description);
      addAssistantResponse(data.diagnosis, "image");
      addDiagnosisRecord("image", description, data.diagnosis);
      const previewUrl = await fileToDataUrl(selectedImage);
      setUploadedImages((current) => [
        {
          id: createId(),
          name: selectedImage.name,
          query: description,
          diagnosis: data.diagnosis,
          previewUrl,
          timestamp: getTimestamp(),
        },
        ...current,
      ]);
      setSelectedImage(null);
      setImageQuery("");
    } catch (error) {
      addSystemMessage(`Image request failed: ${getApiError(error, "Image analysis failed.")}`);
    } finally {
      setIsSending(false);
      setLoadingLabel(null);
    }
  }

  async function startRecording() {
    if (isRecording || isSending) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setIsRecording(false);
        setRecordingSeconds(0);

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (!blob.size) {
          addSystemMessage("Voice recording finished, but no audio data was captured.");
          return;
        }

        const file = new File([blob], "voice-query.webm", { type: blob.type || "audio/webm" });
        addMessage({
          id: createId(),
          sender: "user",
          mode: "voice",
          content: "Voice note sent for analysis.",
          timestamp: getTimestamp(),
        });

        setIsSending(true);
        setLoadingLabel("Transcribing and generating response...");

        try {
          const { data } = await postVoice(file);
          addAssistantResponse(
            `Transcription: ${data.transcription}\n\nDoctor response: ${data.response}`,
            "voice",
            data.audio_url,
          );
          addDiagnosisRecord("voice", data.transcription, data.response);
        } catch (error) {
          addSystemMessage(`Voice request failed: ${getApiError(error, "Voice analysis failed.")}`);
        } finally {
          setIsSending(false);
          setLoadingLabel(null);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => setRecordingSeconds((current) => current + 1), 1000);
    } catch {
      addSystemMessage("Microphone access was denied or unavailable in this browser.");
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    mediaRecorderRef.current.stop();
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedImage(event.target.files?.[0] ?? null);
  }

  async function playAudio(message: Message) {
    if (!message.audioUrl) {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(message.content);
        utterance.rate = 0.95;
        utterance.pitch = 0.92;
        window.speechSynthesis.cancel();
        setActiveAudioId(message.id);
        utterance.onend = () => setActiveAudioId(null);
        window.speechSynthesis.speak(utterance);
      }
      return;
    }

    try {
      audioRef.current?.pause();
      audioRef.current = new Audio(message.audioUrl);
      setActiveAudioId(message.id);
      audioRef.current.onended = () => setActiveAudioId(null);
      await audioRef.current.play();
    } catch {
      addSystemMessage("Audio playback failed. Confirm the backend returned a valid audio file.");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.2),_transparent_32%),linear-gradient(180deg,#effcf9_0%,#f8fbff_45%,#eef6ff_100%)] px-4 py-4 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[110rem] flex-col gap-4 xl:flex-row">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(240,249,255,0.88))] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur xl:w-[22rem]">
          <div className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(20,184,166,0.5),transparent)]" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-700">MediGenie</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950">Healthcare AI chat, voice, and image triage</h1>
              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">
                A hospital-style Next.js interface for text consultation, voice capture, image upload, and doctor-style audio replies.
              </p>
            </div>
            <Avatar />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-3xl border border-teal-100 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Backend</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{apiBaseUrl}</p>
              <p className="mt-1 text-sm text-slate-600">Connected with reusable Axios client requests.</p>
            </div>
            <div className="rounded-3xl border border-cyan-100 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">AI Replies</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{assistantCount}</p>
              <p className="mt-1 text-sm text-slate-600">Text responses plus optional audio playback.</p>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Status</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {isRecording ? "Recording..." : isSending ? loadingLabel ?? "Sending..." : "Ready"}
              </p>
              <p className="mt-1 text-sm text-slate-600">Responsive for mobile and desktop consultation flows.</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Quick prompts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendTextMessage(prompt)}
                  disabled={isSending}
                  className="rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-400 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={sendImageMessage} className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-950 p-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Medical image upload</p>
                <p className="mt-1 text-sm text-slate-300">Send scans, reports, or clinical photos with context.</p>
              </div>
              <div className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-teal-200">/image</div>
            </div>

            <label className="mt-5 block rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-sm text-slate-200">
              <span className="font-medium text-white">Choose image</span>
              <span className="mt-1 block text-slate-400">{selectedImage ? selectedImage.name : "PNG, JPG, scans, radiology screenshots"}</span>
              <input type="file" accept="image/*" onChange={handleImageChange} className="mt-3 block w-full text-sm" />
            </label>

            <textarea
              value={imageQuery}
              onChange={(event) => setImageQuery(event.target.value)}
              rows={4}
              placeholder="Add clinical context or ask a question about the uploaded image..."
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300"
            />

            <button
              type="submit"
              disabled={!selectedImage || isSending}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#14b8a6,#0f766e)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(20,184,166,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              Analyze Image
            </button>
          </form>
        </section>

        <section className="flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="border-b border-slate-200/80 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-700">Consultation Workspace</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">AI care assistant conversation</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">POST /chat</div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">POST /voice</div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">POST /image</div>
              </div>
            </div>
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                healthState === "online"
                  ? health?.groq_configured
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                  : healthState === "offline"
                    ? "border-rose-200 bg-rose-50 text-rose-900"
                    : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold">
                  {healthState === "online"
                    ? health?.groq_configured
                      ? "Backend Online"
                      : "Backend Online, Config Incomplete"
                    : healthState === "offline"
                      ? "Backend Offline"
                      : "Checking Backend"}
                </span>
                <span className="text-xs uppercase tracking-[0.18em] opacity-75">{apiBaseUrl}</span>
              </div>
              <p className="mt-1">{healthMessage}</p>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
            {messages.map((message) => {
              const isUser = message.sender === "user";
              const isSystem = message.sender === "system";

              return (
                <div key={message.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && !isSystem ? <Avatar /> : null}
                  <div
                    className={`max-w-[88%] rounded-[1.75rem] px-4 py-4 shadow-sm sm:max-w-[78%] ${
                      isUser
                        ? "bg-slate-900 text-white"
                        : isSystem
                          ? "border border-rose-200 bg-rose-50 text-rose-900"
                          : "border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                      <span>{isUser ? "Patient" : isSystem ? "System" : "AI Doctor"}</span>
                      {message.mode ? <span>{message.mode}</span> : null}
                      <span>{message.timestamp}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 sm:text-[15px]">{message.content}</p>
                    {!isUser && !isSystem ? (
                      <button
                        type="button"
                        onClick={() => void playAudio(message)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800 transition hover:border-teal-400 hover:bg-teal-100"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                          <path d="M8 7.5v9l8-4.5-8-4.5Z" />
                        </svg>
                        {activeAudioId === message.id ? "Playing" : message.audioUrl ? "Play Doctor Voice" : "Speak Reply"}
                      </button>
                    ) : null}
                  </div>
                  {isUser ? <Avatar user /> : null}
                </div>
              );
            })}
            {isSending ? (
              <div className="flex gap-3 justify-start">
                <Avatar />
                <div className="max-w-[88%] rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] px-4 py-4 text-slate-900 shadow-sm sm:max-w-[78%]">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                    <span>AI Doctor</span>
                    <span>{loadingLabel ?? "Processing"}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-teal-500 [animation-delay:-0.3s]" />
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-teal-500 [animation-delay:-0.15s]" />
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-teal-500" />
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-slate-200/80 bg-slate-50/80 p-4 sm:p-6">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendTextMessage();
              }}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
            >
              <div className="flex flex-col gap-3">
                <textarea
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  rows={3}
                  placeholder="Describe symptoms, ask a medical question, or request guidance..."
                  className="w-full resize-none border-0 bg-transparent px-2 py-2 text-sm leading-7 text-slate-900 outline-none placeholder:text-slate-400 sm:text-[15px]"
                />

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => (isRecording ? stopRecording() : void startRecording())}
                      disabled={isSending}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        isRecording ? "bg-rose-600 text-white shadow-[0_12px_24px_rgba(225,29,72,0.25)]" : "border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-800"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V7a3.5 3.5 0 1 0-7 0v5a3.5 3.5 0 0 0 3.5 3.5Z" />
                        <path d="M6.5 11.75a.75.75 0 0 1 1.5 0 4 4 0 1 0 8 0 .75.75 0 0 1 1.5 0 5.5 5.5 0 0 1-4.75 5.44v2.06h2a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1 0-1.5h2v-2.06A5.5 5.5 0 0 1 6.5 11.75Z" />
                      </svg>
                      {isRecording ? `Stop (${recordingSeconds}s)` : "Voice Input"}
                    </button>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-800">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                        <path d="M4.75 7.75A2.75 2.75 0 0 1 7.5 5h9A2.75 2.75 0 0 1 19.25 7.75v8.5A2.75 2.75 0 0 1 16.5 19h-9a2.75 2.75 0 0 1-2.75-2.75v-8.5Z" />
                        <circle cx="9.5" cy="10" r="1.25" />
                        <path d="m7.25 16.25 3.5-3.5 2.25 2.25 1.75-1.75 2 3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Image Upload
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>

                    {selectedImage ? <span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">Selected: {selectedImage.name}</span> : null}
                  </div>

                  <button
                    type="submit"
                    disabled={!query.trim() || isSending}
                    className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a,#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                  >
                    {isSending ? "Sending..." : "Send Message"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        <aside className="rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,250,255,0.92))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur xl:w-[23rem]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-700">Dashboard</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">Care timeline</h3>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Local Storage
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-3xl border border-slate-200 bg-white/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Chat History</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{messages.length}</p>
              <p className="mt-1 text-sm text-slate-600">Messages saved across refreshes.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Uploaded Images</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{uploadedImages.length}</p>
              <p className="mt-1 text-sm text-slate-600">Image cases stored locally.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Diagnoses</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{diagnoses.length}</p>
              <p className="mt-1 text-sm text-slate-600">Prior AI assessments and replies.</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <section className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Symptom Trends</h4>
                <span className="text-xs text-slate-400">Top mentions</span>
              </div>
              <div className="mt-4 space-y-3">
                {symptomTrends.length ? (
                  symptomTrends.map((trend) => (
                    <div key={trend.keyword}>
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span className="capitalize">{trend.keyword}</span>
                        <span className="font-semibold text-slate-950">{trend.count}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-[linear-gradient(90deg,#14b8a6,#0f766e)]"
                          style={{ width: `${Math.min(trend.count * 20, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No symptom trends yet. Start chatting to build analytics.</p>
                )}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Recent Diagnoses</h4>
              <div className="mt-4 space-y-3">
                {diagnoses.length ? (
                  diagnoses.slice(0, 4).map((diagnosis) => (
                    <div key={diagnosis.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                          {diagnosis.source}
                        </span>
                        <span className="text-xs text-slate-400">{diagnosis.timestamp}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-700">{diagnosis.query}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{diagnosis.diagnosis}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No diagnoses saved yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Uploaded Images</h4>
              <div className="mt-4 space-y-3">
                {uploadedImages.length ? (
                  uploadedImages.slice(0, 4).map((image) => (
                    <div key={image.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex gap-3">
                        <img
                          src={image.previewUrl}
                          alt={image.name}
                          className="h-16 w-16 rounded-2xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-slate-900">{image.name}</p>
                            <span className="text-xs text-slate-400">{image.timestamp}</span>
                          </div>
                          <p className="mt-1 text-sm text-slate-600 line-clamp-2">{image.query}</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500 line-clamp-3">{image.diagnosis}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Uploaded image cases will appear here.</p>
                )}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Recent Chat History</h4>
              <div className="mt-4 space-y-3">
                {messages.length ? (
                  messages
                    .slice(-5)
                    .reverse()
                    .map((message) => (
                      <div key={message.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {message.sender}
                          </span>
                          <span className="text-xs text-slate-400">{message.timestamp}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{message.content}</p>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-slate-500">Chat history will appear here.</p>
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}
