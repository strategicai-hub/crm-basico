import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as originsController from './origins.controller';

const router = Router();

router.use(authenticate);

router.get('/', originsController.list);
router.post('/', originsController.create);
router.delete('/:id', originsController.remove);

export default router;
