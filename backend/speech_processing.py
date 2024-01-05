import sys
import os
import boto3
from pydub import AudioSegment
from pydub.silence import split_on_silence
import uuid

# AWS S3 configuration
s3 = boto3.client('s3', 
                  aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                  aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'))
bucket_name = os.getenv('S3_BUCKET_NAME')

def upload_to_s3(file_path, file_key):
    s3.upload_file(file_path, bucket_name, file_key)
    return f"https://{bucket_name}.s3.amazonaws.com/{file_key}"

def process_audio(file_path):
    sound = AudioSegment.from_file(file_path, format="webm")
    chunks = split_on_silence(sound, min_silence_len=500, silence_thresh=-40)

    urls = []
    for i, chunk in enumerate(chunks):
        # Check if the chunk duration meets the minimum requirement
        if len(chunk) >= 100:  # 100 milliseconds
            chunk_file = f"/tmp/chunk_{uuid.uuid4()}.webm"
            chunk.export(chunk_file, format="webm")
            file_key = os.path.basename(chunk_file)
            url = upload_to_s3(chunk_file, file_key)
            urls.append(url)

    return urls

if __name__ == "__main__":
    input_file_path = sys.argv[1]
    chunk_urls = process_audio(input_file_path)
    for url in chunk_urls:
        print(url)
