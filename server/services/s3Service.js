const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock_key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock_secret'
  },
  // If working locally with mock S3 like MinIO or localstack, configure endpoint here
  // endpoint: process.env.AWS_ENDPOINT
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'nuurtech-learning-media';

// Configure Multer for memory storage (useful for direct streaming to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

/**
 * Uploads a buffer directly to AWS S3
 */
async function uploadToS3(fileBuffer, originalName, mimetype) {
  // If we don't have real credentials or it's local isolated dev, skip actual upload
  if (process.env.AWS_ACCESS_KEY_ID === 'mock_key' || !process.env.AWS_ACCESS_KEY_ID) {
    console.log('AWS S3 Mock Mode: Pretending to upload', originalName);
    return `https://${BUCKET_NAME}.s3.amazonaws.com/mock-folder/${Date.now()}_${originalName}`;
  }

  const key = `courses/media/${Date.now()}_${originalName.replace(/\s+/g, '_')}`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
    ACL: 'public-read' // or private if using signed URLs
  });

  await s3Client.send(command);
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

module.exports = {
  upload,
  uploadToS3
};
