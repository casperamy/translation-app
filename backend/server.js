const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { exec } = require('child_process');
const uploadFileToS3 = require('./s3Uploader'); // Ensure this module is correctly implemented

require('dotenv').config();

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'Please upload a file.' });
    }

    const fileName = req.file.originalname;
    const bucketName = 'togdatabase'; // Replace with your actual S3 bucket name
    const language = req.body.language;

    try {
        await uploadFileToS3(req.file.buffer, fileName, bucketName);
        console.log('File uploaded successfully to S3.');

        // Set the environment for the Python subprocess
        const childEnv = process.env;
        exec(`python3 process_audio.py ${fileName} ${language}`, { env: childEnv }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return res.status(500).send({ message: 'Error processing file.' });
            }
            if (stderr) {
                console.error(`Stderr: ${stderr}`);
                return res.status(500).send({ message: 'Error processing file.' });
            }

            // Log the URL to the console
            console.log('Speech URL:', stdout.trim());

            // Sending the speech URL back to the client
            res.send({ message: 'File processed successfully.', speechUrl: stdout.trim() });
        });
    } catch (error) {
        console.error('Error uploading to S3:', error);
        res.status(500).send({ message: 'Error uploading file.' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
