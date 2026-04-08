# doctor_response.py

from dotenv import load_dotenv
load_dotenv()

import os
from gtts import gTTS

# ElevenLabs (optional)
try:
    import elevenlabs
    from elevenlabs.client import ElevenLabs
except:
    elevenlabs = None

ELEVENLABS_API_KEY = os.environ.get("ELEVEN_API_KEY")


# 🔊 ElevenLabs TTS (Premium)
def text_to_speech_with_elevenlabs(input_text, output_filepath):
    if not ELEVENLABS_API_KEY:
        raise Exception("ElevenLabs API key not found")

    client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

    audio = client.generate(
        text=input_text,
        voice="Rachel",  # safe default voice
        output_format="mp3_22050_32",
        model="eleven_turbo_v2"
    )

    elevenlabs.save(audio, output_filepath)

    # ✅ DO NOT play audio manually
    return output_filepath


# 🔊 gTTS (Fallback - Free)
def text_to_speech_with_gtts(input_text, output_filepath):
    tts = gTTS(text=input_text, lang="en", slow=False)
    tts.save(output_filepath)

    # ✅ Return file path (Gradio will play it)
    return output_filepath
