from __future__ import annotations

import base64
from pathlib import Path

from groq import Groq
from gtts import gTTS


def transcribe_audio_with_whisper(audio_path: str, whisper_model: str, groq_api_key: str) -> str:
    client = Groq(api_key=groq_api_key)
    with Path(audio_path).open("rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model=whisper_model,
            file=audio_file,
            language="en",
            response_format="json",
        )
    return (transcription.text or "").strip()


def generate_text_response(prompt: str, system_prompt: str, model: str, groq_api_key: str) -> str:
    client = Groq(api_key=groq_api_key)
    completion = client.chat.completions.create(
        model=model,
        temperature=0.3,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
    )
    content = completion.choices[0].message.content
    return content.strip() if content else ""


def analyze_image_with_query(query: str, image_path: str, model: str, groq_api_key: str) -> str:
    with Path(image_path).open("rb") as image_file:
        encoded_image = base64.b64encode(image_file.read()).decode("utf-8")

    client = Groq(api_key=groq_api_key)
    completion = client.chat.completions.create(
        model=model,
        temperature=0.2,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": query},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{encoded_image}"},
                    },
                ],
            }
        ],
    )
    content = completion.choices[0].message.content
    return content.strip() if content else ""


def synthesize_speech_to_file(text: str, output_path: str) -> str:
    cleaned_text = text.strip()
    if not cleaned_text:
        raise ValueError("text must not be empty")

    tts = gTTS(text=cleaned_text, lang="en", slow=False)
    tts.save(output_path)
    return output_path
