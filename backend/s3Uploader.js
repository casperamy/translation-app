const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function uploadFileToS3(fileBuffer, fileName, bucketName) {
    const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileBuffer
    };

    try {
        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        return { message: 'Upload successful' };
    } catch (error) {
        throw error;
    }
}

module.exports = uploadFileToS3;
