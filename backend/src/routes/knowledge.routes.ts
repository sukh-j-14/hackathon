import { Router } from 'express';
import multer from 'multer';
import { mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { authenticate } from '../middleware/authenticate.js';
import { roles } from '../middleware/authorize.js';
import { HttpError } from '../errors/HttpError.js';
import * as controller from '../controllers/knowledge.controller.js';
const directory = resolve('uploads');
mkdirSync(directory, { recursive: true });
// Multer generates filenames; uploaded content is never served as executable public assets.
const upload = multer({
  dest: directory,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (['.pdf', '.md', '.txt', '.csv', '.json'].includes(extname(file.originalname).toLowerCase()))
      cb(null, true);
    else
      cb(new HttpError(400, 'FILE_TYPE', 'Supported formats: PDF, Markdown, text, CSV and JSON.'));
  },
});
export const knowledgeRoutes = Router();
knowledgeRoutes.use(authenticate);
knowledgeRoutes.get('/sources/:id', controller.source);
knowledgeRoutes.get('/documents', roles('ADMIN'), controller.list);
knowledgeRoutes.post('/documents', roles('ADMIN'), upload.single('file'), controller.upload);
knowledgeRoutes.patch('/documents/:id', roles('ADMIN'), controller.activate);
knowledgeRoutes.post('/documents/:id/reindex', roles('ADMIN'), controller.reindex);
