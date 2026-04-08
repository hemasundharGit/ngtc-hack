export type Sender = "user" | "assistant" | "system";
export type Mode = "text" | "voice" | "image";
export type HealthState = "checking" | "online" | "offline";

export type Message = {
  id: string;
  sender: Sender;
  content: string;
  timestamp: string;
  mode?: Mode;
  audioUrl?: string;
};

export type ChatSession = {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
  messages: Message[];
};

export type UploadedImageRecord = {
  id: string;
  name: string;
  query: string;
  diagnosis: string;
  previewUrl: string;
  timestamp: string;
};

export type DiagnosisRecord = {
  id: string;
  source: Mode;
  query: string;
  diagnosis: string;
  timestamp: string;
};

export type DashboardSnapshot = {
  messages: Message[];
  uploadedImages: UploadedImageRecord[];
  diagnoses: DiagnosisRecord[];
  chatSessions: ChatSession[];
};
