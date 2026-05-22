import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import multer from 'multer';

import { env } from '../config/environment.js';
import { SUPPORTED_FILE_TYPES, SUPPORTED_MIME_TYPES } from '../utils/constants.js';
import { decodePossiblyMojibakeFilename } from '../utils/filenameEncoding.js';
import { AppError } from './errorHandler.js';

const uploadDirectory = path.resolve(env.uploadDir);
fs.mkdirSync(uploadDirectory, { recursive: true });

const sanitizeFilename = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const originalName = decodePossiblyMojibakeFilename(file.originalname);
    const extension = path.extname(originalName).toLowerCase();
    callback(null, `${Date.now()}-${randomUUID()}-${sanitizeFilename(path.basename(originalName, extension))}${extension}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: env.maxFileSize,
  },
  fileFilter: (_req, file, callback) => {
    const originalName = decodePossiblyMojibakeFilename(file.originalname);
    const extension = path.extname(originalName).toLowerCase().replace('.', '');
    const validExtension = SUPPORTED_FILE_TYPES.includes(extension as (typeof SUPPORTED_FILE_TYPES)[number]);
    const validMime = SUPPORTED_MIME_TYPES.includes(file.mimetype as (typeof SUPPORTED_MIME_TYPES)[number]);

    if (validExtension && validMime) {
      callback(null, true);
      return;
    }

    callback(new AppError('Only PDF, DOCX, and PPTX files are supported.', 400));
  },
});
