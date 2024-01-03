const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const uploadFileToS3 = require('./s3Uploader'); // Ensure this module is correctly implemented
require('dotenv').config();

const app = express();

// Use CORS middleware for express
app.use(cors());

const server = http.createServer(app);

// Set up socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Frontend URL
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
    console.log('User connected');

    socket.on('sendChunk', async (data) => {
        const { buffer, language } = data;
        const fileName = `chunk_${Date.now()}.webm`;
        const filePath = `/tmp/${fileName}`;

        // Save buffer to a temporary file
        fs.writeFileSync(filePath, Buffer.from(buffer));

        try {
            // Upload to S3
            await uploadFileToS3(fs.readFileSync(filePath), fileName, 'togdatabase');
            console.log('File uploaded successfully to S3.');

            // Process the audio file
            const childEnv = process.env;
            exec(`python3 process_audio.py ${fileName} ${language}`, { env: childEnv }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error: ${error.message}`);
                    socket.emit('processingError', 'Error processing file.');
                    return;
                }
                if (stderr) {
                    console.error(`Stderr: ${stderr}`);
                    socket.emit('processingError', 'Error processing file.');
                    return;
                }

                // Sending the speech URL back to the client
                socket.emit('chunkProcessed', stdout.trim());
            });
        } catch (error) {
            console.error('Error uploading to S3 or processing file:', error);
            socket.emit('processingError', 'Error processing file.');
        } finally {
            // Clean up temporary file
            fs.unlinkSync(filePath);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
