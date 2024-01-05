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

            chunkUrls.forEach(url => {
                if (url.trim()) {
                    const fileKey = url.split('/').pop();
                    console.log(`Processing audio file: ${fileKey}`);
                    exec(`python3 process_audio.py ${fileKey} ${language}`, (error, stdout, stderr) => {
                        if (error) {
                            console.error('Error in process_audio:', error);
                            return;
                        }
                        console.log('process_audio output:', stdout);
                        try {
                            const parsedOutput = JSON.parse(stdout);
                            socket.emit('chunkProcessed', parsedOutput);
                        } catch (parseError) {
                            console.error('Error parsing process_audio output:', parseError);
                        }
                    });
                } else {
                    console.error('Empty URL received');
                }
            });
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
