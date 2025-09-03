import { body, param, query, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  next();
};

// Auth validation rules
export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('displayName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Display name must be 1-50 characters'),
  handleValidationErrors
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// User validation rules
export const updateProfileValidation = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Display name must be 1-50 characters'),
  body('status')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Status cannot exceed 100 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Bio cannot exceed 200 characters'),
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('Avatar URL must be valid'),
  handleValidationErrors
];

// Conversation validation rules
export const createConversationValidation = [
  body('type')
    .isIn(['direct', 'group'])
    .withMessage('Type must be either direct or group'),
  body('memberIds')
    .isArray({ min: 1 })
    .withMessage('Must provide at least one member'),
  body('memberIds.*')
    .isMongoId()
    .withMessage('All member IDs must be valid'),
  body('name')
    .if(body('type').equals('group'))
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be 1-100 characters'),
  handleValidationErrors
];

export const updateConversationValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 characters'),
  body('memberIds')
    .optional()
    .isArray()
    .withMessage('Member IDs must be an array'),
  body('memberIds.*')
    .isMongoId()
    .withMessage('All member IDs must be valid'),
  handleValidationErrors
];

// Message validation rules
export const sendMessageValidation = [
  body('body')
    .if(body('type').not().isIn(['image', 'video', 'file']))
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message body must be 1-2000 characters'),
  body('type')
    .optional()
    .isIn(['text', 'image', 'video', 'file'])
    .withMessage('Type must be text, image, video, or file'),
  body('fileUrl')
    .if(body('type').isIn(['image', 'video', 'file']))
    .isURL()
    .withMessage('File URL must be valid'),
  body('fileName')
    .if(body('type').equals('file'))
    .trim()
    .isLength({ min: 1 })
    .withMessage('File name is required for file messages'),
  body('fileSize')
    .if(body('type').isIn(['image', 'video', 'file']))
    .isInt({ min: 1 })
    .withMessage('File size must be a positive integer'),
  body('meta.width')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Width must be a positive integer'),
  body('meta.height')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Height must be a positive integer'),
  body('meta.duration')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Duration must be a positive number'),
  body('meta.mime')
    .optional()
    .isString()
    .withMessage('MIME type must be a string'),
  body('meta.thumbnailUrl')
    .optional()
    .isURL()
    .withMessage('Thumbnail URL must be valid'),
  handleValidationErrors
];

// Search validation rules
export const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be 1-100 characters'),
  query('conversationId')
    .optional()
    .isMongoId()
    .withMessage('Conversation ID must be valid'),
  handleValidationErrors
];

// Pagination validation rules
export const paginationValidation = [
  query('cursor')
    .optional()
    .isMongoId()
    .withMessage('Cursor must be a valid ID'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// MongoDB ObjectId validation
export const mongoIdValidation = (field = 'id') => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId`),
  handleValidationErrors
];