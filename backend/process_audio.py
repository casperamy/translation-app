import sys
import boto3
import openai
import os
from io import BytesIO
import uuid
from datetime import datetime
openai.api_key = os.getenv('OPENAI_API_KEY')
if not openai.api_key:
    raise ValueError('The OPENAI_API_KEY environment variable is not set.')

client = openai.OpenAI()

def download_from_s3(bucket_name, file_key, local_file_path):
    s3 = boto3.client('s3')
    s3.download_file(bucket_name, file_key, local_file_path)

def translate_audio_to_english(file_path):
    with open(file_path, 'rb') as audio_file:
        response = client.audio.translations.create(
            model="whisper-1",
            file=audio_file
        )
    return response.text

def translate_text_to_language(text, target_language):
    if target_language.lower() == 'English':
        return text
    prompt = f"Translate this text to {target_language}: {text}"
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a translator."},
            {"role": "user", "content": prompt}
        ]
    )
    if response.choices and len(response.choices) > 0:
        translated_text = response.choices[0].message.content.strip()
        return translated_text
    else:
        return "Translation not available."

def text_to_speech(text):
    response = client.audio.speech.create(
        model="tts-1",
        input=text,
        voice="shimmer"
    )
    audio_data = response.content 
    return audio_data

def upload_to_s3(audio_data, language):
    s3 = boto3.client('s3')
    bucket_name = 'togdatabase' 
    audio_key = f"translations/{language}/{uuid.uuid4()}.mp3"

    s3.put_object(Bucket=bucket_name, Key=audio_key, Body=audio_data, ContentType='audio/mpeg')
    presigned_url = s3.generate_presigned_url('get_object',
                                              Params={'Bucket': bucket_name, 'Key': audio_key},
                                              ExpiresIn=3600)
    return presigned_url

if __name__ == '__main__':
    file_key = sys.argv[1]
    target_language = sys.argv[2]
    local_file_path = '/tmp/' + file_key

    download_from_s3('togdatabase', file_key, local_file_path)

    english_translation = translate_audio_to_english(local_file_path)
    final_translation = translate_text_to_language(english_translation, target_language)
    speech_data = text_to_speech(final_translation)
    speech_url = upload_to_s3(speech_data, target_language)

    print(speech_url)








    