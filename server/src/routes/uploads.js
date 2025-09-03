import express from 'express';
import { 
  uploadSingle, 
  uploadMultiple, 
  getSignedUrl,
  upload 
} from '../controllers/uploads.js';
import { authenticate } from '../middlewares/auth.js';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middlewares/validation.js';

const router = express.Router();

// All upload routes require authentication
router.use('/single', authenticate);
router.use('/multiple', authenticate);
router.use('/sign', authenticate);

// Get signed URL for upload
router.post('/sign', [
  body('filename').notEmpty().withMessage('Filename is required'),
  body('contentType').notEmpty().withMessage('Content type is required'),
  handleValidationErrors
], getSignedUrl);

// Upload single file with error handling
router.post('/single', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          ok: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds the 50MB limit'
          }
        });
      }
      
      if (err.code === 'UNSUPPORTED_FILE_TYPE') {
        return res.status(415).json({
          ok: false,
          error: {
            code: 'UNSUPPORTED_FILE_TYPE',
            message: err.message
          }
        });
      }
      
      return res.status(400).json({
        ok: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message || 'File upload failed'
        }
      });
    }
    
    next();
  });
}, uploadSingle);

// Upload multiple files
router.post('/multiple', upload.array('files', 5), uploadMultiple);

// Files are now served directly from Cloudinary URLs - no local serving needed

export default router;