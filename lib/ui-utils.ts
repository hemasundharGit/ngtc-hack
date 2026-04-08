export const quickPrompts = [
  "Summarize my symptoms",
  "What should I monitor at home?",
  "Explain this report simply",
  "When should I seek urgent care?",
];

export const symptomKeywords = [
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

export const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const getTimestamp = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

export async function fileToDataUrl(file: File) {
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

export function splitResponseSections(content: string) {
  const cleaned = content.replace(/\s+/g, " ").trim();
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const diagnosis = sentences[0] || cleaned;
  const possibleCauses = sentences[1] || "Symptoms may have multiple causes, so correlate with clinical history.";
  const recommendations =
    sentences.slice(2).join(" ") || "Monitor symptom progression and seek in-person care for worsening symptoms.";

  return { diagnosis, possibleCauses, recommendations };
}
