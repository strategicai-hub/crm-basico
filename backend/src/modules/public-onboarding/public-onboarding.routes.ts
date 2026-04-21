import { Router } from 'express';
import multer from 'multer';
import * as controller from './public-onboarding.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido'));
  },
});

const router = Router();

router.get('/:token', controller.getByToken);
router.post('/:token/upload', upload.single('file'), controller.upload);
router.post('/:token/submit', controller.submit);

export default router;
