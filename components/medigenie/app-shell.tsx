"use client";

import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, PanelRight, Sparkles } from "lucide-react";

import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { HealthBanner } from "./health-banner";
import { InsightsPanel } from "./insights-panel";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { ToastItem, ToastStack } from "./toast-stack";
import { TypingIndicator } from "./typing-indicator";
import {
  ErrorApiResponse,
  getHealth,
  HealthApiResponse,
  postChat,
  postImage,
  postVoice,
} from "../../lib/api";
import { useChatStore } from "../../lib/store/chat-store";
import type { HealthState, Message, Mode } from "../../lib/types";
import { createId, fileToDataUrl, getTimestamp, symptomKeywords } from "../../lib/ui-utils";

export function MedigenieAppShell() {
  const currentChatId = useChatStore((state) => state.currentChatId);
  const messages = useChatStore((state) => state.messages);
  const chatSessions = useChatStore((state) => state.chatSessions);
  const uploadedImages = useChatStore((state) => state.uploadedImages);
  const diagnoses = useChatStore((state) => state.diagnoses);
  const addMessage = useChatStore((state) => state.addMessage);
  const addMessageToChat = useChatStore((state) => state.addMessageToChat);
  const addDiagnosis = useChatStore((state) => state.addDiagnosis);
  const addUploadedImage = useChatStore((state) => state.addUploadedImage);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const createChat = useChatStore((state) => state.createChat);
  const selectChat = useChatStore((state) => state.selectChat);

  const [query, setQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [loadingLabel, setLoadingLabel] = useState("Preparing");
  const [health, setHealth] = useState<HealthApiResponse | null>(null);
  const [healthState, setHealthState] = useState<HealthState>("checking");
  const [healthMessage, setHealthMessage] = useState("Checking backend connection...");
  const [animatedAssistantId, setAnimatedAssistantId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

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

  useEffect(() => {
    if (!toasts.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [toasts]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioRef.current?.pause();
    },
    [],
  );

  useEffect(() => {
    function handleWindowScroll() {
      const scrollOffset = window.innerHeight + window.scrollY;
      const bottomEdge = document.documentElement.scrollHeight - 140;
      setShowScrollDown(scrollOffset < bottomEdge);
    }

    handleWindowScroll();
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    window.addEventListener("resize", handleWindowScroll);

    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
      window.removeEventListener("resize", handleWindowScroll);
    };
  }, []);

  const symptomTrends = useMemo(() => {
    const searchableText = [
      ...messages.filter((message) => message.sender === "user").map((message) => message.content.toLowerCase()),
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

  function getApiError(error: unknown, fallback: string) {
    if (!axios.isAxiosError(error)) {
      return fallback;
    }

    const data = error.response?.data as ErrorApiResponse | undefined;
    return data?.error || error.message || fallback;
  }

  function pushToast(title: string, description: string, tone: ToastItem["tone"]) {
    setToasts((current) => [...current, { id: createId(), title, description, tone }].slice(-3));
  }

  function addAssistantMessage(content: string, mode: Mode, audioUrl?: string) {
    const message: Message = {
      id: createId(),
      sender: "assistant",
      content,
      timestamp: getTimestamp(),
      mode,
      audioUrl,
    };

    setAnimatedAssistantId(message.id);
    addMessage(message);
  }

  function addAssistantMessageToChat(chatId: string, content: string, mode: Mode, audioUrl?: string) {
    const message: Message = {
      id: createId(),
      sender: "assistant",
      content,
      timestamp: getTimestamp(),
      mode,
      audioUrl,
    };

    setAnimatedAssistantId(message.id);
    addMessageToChat(chatId, message);
  }

  function addDiagnosisRecord(source: Mode, diagnosisQuery: string, diagnosisText: string) {
    addDiagnosis({
      id: createId(),
      source,
      query: diagnosisQuery,
      diagnosis: diagnosisText,
      timestamp: getTimestamp(),
    });
  }

  function resolveUploadChatId() {
    const hasConversation = messages.some((message) => message.id !== "welcome-message");
    return hasConversation ? createChat() : currentChatId;
  }

  async function submitText(prefill?: string) {
    const value = (prefill ?? query).trim();
    if (!value || isSending) {
      return;
    }

    addMessage({
      id: createId(),
      sender: "user",
      mode: "text",
      content: value,
      timestamp: getTimestamp(),
    });
    setQuery("");
    setIsSending(true);
    setLoadingLabel("Thinking");

    try {
      const { data } = await postChat(value);
      addAssistantMessage(data.response, "text", data.audio_url);
      addDiagnosisRecord("text", value, data.response);
      pushToast("Reply ready", "Your AI care response has been generated.", "success");
    } catch (error) {
      pushToast("Chat request failed", getApiError(error, "Unable to reach the chat service."), "error");
    } finally {
      setIsSending(false);
    }
  }

  async function submitImage() {
    if (!selectedImage || isSending) {
      return;
    }

    const imageQuery = query.trim() || "Please analyze this medical image.";
    const targetChatId = resolveUploadChatId();

    addMessageToChat(targetChatId, {
      id: createId(),
      sender: "user",
      mode: "image",
      content: `${imageQuery}\nImage: ${selectedImage.name}`,
      timestamp: getTimestamp(),
    });
    setQuery("");
    setIsSending(true);
    setLoadingLabel("Analyzing image");

    try {
      const previewUrl = selectedImagePreview ?? (await fileToDataUrl(selectedImage));
      const { data } = await postImage(selectedImage, imageQuery);
      addAssistantMessageToChat(targetChatId, data.diagnosis, "image");
      addDiagnosisRecord("image", imageQuery, data.diagnosis);
      addUploadedImage({
        id: createId(),
        name: selectedImage.name,
        query: imageQuery,
        diagnosis: data.diagnosis,
        previewUrl,
        timestamp: getTimestamp(),
      });
      setSelectedImage(null);
      setSelectedImagePreview(null);
      pushToast("Image analyzed", "The diagnosis was added to your insights timeline.", "success");
    } catch (error) {
      pushToast("Image request failed", getApiError(error, "Image analysis failed."), "error");
    } finally {
      setIsSending(false);
    }
  }

  async function handlePrimarySubmit() {
    if (selectedImage) {
      await submitImage();
      return;
    }

    await submitText();
  }

  async function startRecording() {
    if (isRecording || isSending) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
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
          pushToast("No audio captured", "Voice recording finished, but the browser did not return audio data.", "error");
          return;
        }

        const file = new File([blob], "voice-query.webm", { type: blob.type || "audio/webm" });
        const targetChatId = resolveUploadChatId();

        addMessageToChat(targetChatId, {
          id: createId(),
          sender: "user",
          mode: "voice",
          content: "Voice note sent for analysis.",
          timestamp: getTimestamp(),
        });

        setIsSending(true);
        setLoadingLabel("Transcribing and generating response");

        try {
          const { data } = await postVoice(file);
          addAssistantMessageToChat(
            targetChatId,
            `Diagnosis summary: ${data.response}\n\nOriginal transcription: ${data.transcription}`,
            "voice",
            data.audio_url,
          );
          addDiagnosisRecord("voice", data.transcription, data.response);
          pushToast("Voice processed", "Transcription and response are ready.", "success");
        } catch (error) {
          pushToast("Voice request failed", getApiError(error, "Voice analysis failed."), "error");
        } finally {
          setIsSending(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => current + 1);
      }, 1000);
    } catch {
      pushToast("Microphone unavailable", "Microphone access was denied or unavailable in this browser.", "error");
    }
  }

  function toggleRecording() {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    void startRecording();
  }

  async function handleSelectImage(file: File | null) {
    setSelectedImage(file);
    if (!file) {
      setSelectedImagePreview(null);
      return;
    }

    try {
      setSelectedImagePreview(await fileToDataUrl(file));
    } catch {
      setSelectedImagePreview(null);
      pushToast("Preview failed", "Unable to preview the selected image.", "error");
    }
  }

  async function playAudio(message: Message) {
    if (!message.audioUrl) {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(message.content);
        utterance.rate = 0.95;
        utterance.pitch = 0.94;
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
      pushToast("Audio playback failed", "Confirm the backend returned a valid audio file.", "error");
    }
  }

  function scrollToPageBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.16),transparent_22%),radial-gradient(circle_at_right,rgba(56,189,248,0.12),transparent_24%),linear-gradient(180deg,#020617_0%,#08101f_42%,#020617_100%)] text-slate-100">
      <Sidebar
        onQuickPrompt={(prompt) => void submitText(prompt)}
        chatSessions={chatSessions}
        currentChatId={currentChatId}
        onSelectChat={selectChat}
        onStartNewChat={startNewChat}
        health={health}
        healthState={healthState}
        healthMessage={healthMessage}
      />
      <ToastStack toasts={toasts} />

      <div className="px-4 pb-28 pt-4 sm:px-6 xl:pl-[7rem] xl:pr-6">
        <section className="mx-auto flex min-h-screen max-w-[900px] flex-col">
          <div className="relative z-10 px-0 pb-5 pt-2">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-[28rem]">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-teal-200/80">MediGenie</p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-[3.2rem]">
                  Calm, focused healthcare AI conversation
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                  Ask questions, upload images, or record voice notes in one quiet workspace designed for clinical clarity.
                </p>
              </div>

              <div className="hidden shrink-0 items-center gap-3 self-start lg:flex">
                <button
                  type="button"
                  onClick={() => setInsightsOpen(true)}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-white/8 px-4 text-sm font-medium text-slate-100 ring-1 ring-white/10 transition hover:bg-white/12"
                >
                  <PanelRight className="h-4 w-4" />
                  <span>Insights</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 pt-1">
            <div className="space-y-5">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLatestAssistant={animatedAssistantId === message.id}
                    activeAudioId={activeAudioId}
                    onPlayAudio={playAudio}
                  />
                ))}
              </AnimatePresence>

              {isSending ? <TypingIndicator label={loadingLabel} /> : null}

              {healthState === "online" && health?.groq_configured ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="inline-flex items-center gap-2 rounded-full bg-teal-400/10 px-4 py-2 text-sm text-teal-100 ring-1 ring-teal-300/12"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Live backend connected.</span>
                </motion.div>
              ) : null}

              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="mt-6">
            <ChatInput
              query={query}
              onQueryChange={setQuery}
              onSubmit={() => void handlePrimarySubmit()}
              onToggleRecording={toggleRecording}
              isRecording={isRecording}
              recordingSeconds={recordingSeconds}
              isSending={isSending}
              onSelectImage={handleSelectImage}
              selectedImageName={selectedImage?.name ?? null}
              selectedImagePreview={selectedImagePreview}
              onClearImage={() => {
                setSelectedImage(null);
                setSelectedImagePreview(null);
              }}
            />
          </div>
        </section>
      </div>

      <div className="fixed inset-x-4 top-4 z-20 flex items-center justify-between gap-3 lg:hidden">
        <HealthBanner health={health} healthState={healthState} healthMessage={healthMessage} />
        <button
          type="button"
          onClick={() => setInsightsOpen(true)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/8 text-slate-100 ring-1 ring-white/10 backdrop-blur-xl transition hover:bg-white/12"
          aria-label="Open insights"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>

      <InsightsPanel
        open={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        messages={messages}
        uploadedImages={uploadedImages}
        diagnoses={diagnoses}
        symptomTrends={symptomTrends}
      />

      <MobileNav onOpenInsights={() => setInsightsOpen(true)} />

      <AnimatePresence>
        {showScrollDown ? (
          <motion.button
            type="button"
            onClick={scrollToPageBottom}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-24 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/8 text-white shadow-[0_18px_40px_rgba(0,0,0,0.22)] ring-1 ring-white/10 backdrop-blur-xl transition hover:bg-white/12 lg:bottom-6"
            aria-label="Scroll to bottom"
            title="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
