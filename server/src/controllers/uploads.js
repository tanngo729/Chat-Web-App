import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { asyncHandler } from '../middlewares/error.js';

// Cloudinary will be configured on first use

// Configure multer to use memory storage for Cloudinary
const storage = multer.memoryStorage();

// File filter for media uploads
const fileFilter = (req, file, cb) => {
  const allowedMimes = {
    'image/jpeg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'video/mp4': true,
    'video/webm': true,
    'video/quicktime': true, // .mov
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'text/plain': true
  };

  if (allowedMimes[file.mimetype]) {
    cb(null, true);
  } else {
    const error = new Error(`File type ${file.mimetype} is not supported`);
    error.code = 'UNSUPPORTED_FILE_TYPE';
    error.status = 415;
    cb(error, false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for Cloudinary free tier
    files: 5 // Max 5 files at once
  }
});

// Upload single file to Cloudinary
export const uploadSingle = asyncHandler(async (req, res) => {
  // Configure Cloudinary with environment variables
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  if (!req.file) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'NO_FILE',
        message: 'No file uploaded'
      }
    });
  }

  try {
    const file = req.file;
    
    // Determine file type and folder
    let resourceType = 'auto';
    let folder = 'chat-app';
    let type = 'file';
    
    if (file.mimetype.startsWith('image/')) {
      resourceType = 'image';
      folder = 'chat-app/images';
      type = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      resourceType = 'video';
      folder = 'chat-app/videos';
      type = 'video';
    } else {
      folder = 'chat-app/files';
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: folder,
          public_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(file.buffer);
    });

    res.json({
      ok: true,
      data: {
        fileUrl: result.secure_url,
        fileName: file.originalname,
        fileSize: result.bytes,
        type,
        meta: {
          mime: file.mimetype,
          cloudinary_id: result.public_id,
          width: result.width,
          height: result.height,
        }
      }
    });

  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: 'Failed to upload file to cloud storage'
      }
    });
  }
});

// Upload multiple files
export const uploadMultiple = asyncHandler(async (req, res) => {
  // Configure Cloudinary with environment variables
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'NO_FILES',
        message: 'No files uploaded'
      }
    });
  }

  try {
    const uploadPromises = req.files.map(async (file) => {
      // Determine file type and folder
      let resourceType = 'auto';
      let folder = 'chat-app';
      let type = 'file';
      
      if (file.mimetype.startsWith('image/')) {
        resourceType = 'image';
        folder = 'chat-app/images';
        type = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        resourceType = 'video';
        folder = 'chat-app/videos';
        type = 'video';
      } else {
        folder = 'chat-app/files';
      }

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: folder,
            public_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.buffer);
      });

      return {
        fileUrl: result.secure_url,
        fileName: file.originalname,
        fileSize: result.bytes,
        type,
        meta: {
          mime: file.mimetype,
          cloudinary_id: result.public_id,
          width: result.width,
          height: result.height,
        }
      };
    });

    const files = await Promise.all(uploadPromises);

    res.json({
      ok: true,
      data: { files }
    });

  } catch (error) {
    console.error('Cloudinary multiple upload error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: 'Failed to upload files to cloud storage'
      }
    });
  }
});

// Files are now served directly from Cloudinary URLs - no local serving needed

// Get signed upload URL (for future Cloudinary/S3 integration)
export const getSignedUrl = asyncHandler(async (req, res) => {
  const { filename, contentType } = req.body;
  
  // For now, return local upload endpoint
  // In production, this would generate signed URLs for cloud storage
  res.json({
    ok: true,
    data: {
      signedUrl: '/api/uploads/single',
      publicUrl: `/api/uploads/files/${filename}`,
      fields: {} // Additional fields for form data if needed
    }
  });
});

export { upload };