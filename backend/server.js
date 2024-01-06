require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const { exec } = require('child_process');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    socket.on('sendChunk', (data) => {
        processAudio(data, false, socket);
    });

    socket.on('sendChunkForImmediateProcessing', (data) => {
        processAudio(data, true, socket);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    socket.on('convertToSpeech', (data) => {
        const { text } = data;
        exec(`python3 translated_speech.py "${text.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('Error in text_to_speech:', error);
                socket.emit('ttsError', { message: 'Failed to generate speech.' });
                return;
            }
            fs.readFile('output.mp3', (err, data) => {
                if (err) {
                    console.error('Error reading audio file:', err);
                    socket.emit('ttsError', { message: 'Failed to read speech file.' });
                    return;
                }
                socket.emit('audioData', { audio: data.toString('base64') });
            });
        });
    });
});

const processAudio = (data, isChunk, socket) => {
    const { buffer, language } = data;
    const fileName = `audio_${Date.now()}.webm`;
    const filePath = `/tmp/${fileName}`;
    fs.writeFileSync(filePath, Buffer.from(new Uint8Array(buffer)));

    console.log(`Processing file: ${filePath}`);
    exec(`python3 speech_processing.py ${filePath}`, (error, stdout, stderr) => {
        if (error) {
            console.error('Error in speech_processing:', error);
            return;
        }
        console.log('Speech processing output:', stdout);
        const chunkUrls = stdout.trim().split('\n');

        if (!isChunk) {
            let translations = new Array(chunkUrls.length);
            let chunksProcessed = 0;

            chunkUrls.forEach((url, index) => {
                const fileKey = url.split('/').pop();
                exec(`python3 process_audio.py ${fileKey} ${language}`, (error, stdout, stderr) => {
                    chunksProcessed++;
                    if (error) {
                        console.error('Error in process_audio:', error);
                        return;
                    }
                    try {
                        const parsedOutput = JSON.parse(stdout);
                        translations[index] = parsedOutput.translatedText;

                        if (chunksProcessed === chunkUrls.length) {
                            const completeTranslation = translations.filter(t => t).join(" ");
                            socket.emit('completeAudioProcessed', { translatedText: completeTranslation.trim() });
                        }
                    } catch (parseError) {
                        console.error('Error parsing process_audio output:', parseError);
                    }
                });
            });
        } else {
            chunkUrls.forEach(url => {
                if (url.trim()) {
                    const fileKey = url.split('/').pop();
                    exec(`python3 process_audio.py ${fileKey} ${language}`, (error, stdout, stderr) => {
                        if (error) {
                            console.error('Error in process_audio:', error);
                            return;
                        }
                        try {
                            const parsedOutput = JSON.parse(stdout);
                            socket.emit('chunkProcessed', { translatedText: parsedOutput.translatedText });
                        } catch (parseError) {
                            console.error('Error parsing process_audio output:', parseError);
                        }
                    });
                } else {
                    console.error('Empty URL received');
                }
            });
        }
    });
};

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
