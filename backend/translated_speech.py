import sys
import openai
import os
from openai import OpenAI

client = OpenAI()

# Configure your OpenAI API key here
openai.api_key = os.getenv('OPENAI_API_KEY')

def text_to_speech(text, model="tts-1", voice="alloy"):
    response = client.audio.speech.create(
        model=model,
        voice=voice,
        input=text,
    )
    # Write the response content directly to an output file
    with open("output.mp3", "wb") as f:
        f.write(response.content)
    print("TTS conversion complete.")

if __name__ == "__main__":
    input_text = sys.argv[1]
    text_to_speech(input_text)
