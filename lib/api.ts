import axios from "axios";

export type ChatApiResponse = {
  success: boolean;
  input_text: string;
  response: string;
  audio_url: string;
  model: string;
};

export type VoiceApiResponse = {
  success: boolean;
  transcription: string;
  response: string;
  audio_url: string;
  stt_model: string;
  llm_model: string;
};

export type ImageApiResponse = {
  success: boolean;
  query: string;
  diagnosis: string;
  model: string;
};

export type HealthApiResponse = {
  success: boolean;
  status: string;
  groq_configured: boolean;
};

export type ErrorApiResponse = {
  success: false;
  error: string;
  details?: unknown;
};

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: apiBaseUrl,
});

export async function getHealth() {
  return api.get<HealthApiResponse>("/health");
}

export async function postChat(text: string) {
  return api.post<ChatApiResponse>("/chat", { text });
}

export async function postVoice(audio: File) {
  const formData = new FormData();
  formData.append("audio", audio);

  return api.post<VoiceApiResponse>("/voice", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function postImage(image: File, query: string) {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("query", query);

  return api.post<ImageApiResponse>("/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
