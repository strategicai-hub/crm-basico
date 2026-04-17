import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { ownershipFilter } from '../../middleware/ownership';
import * as dealsController from './deals.controller';
import { dealsStream } from './deals.sse';

const router = Router();

router.get('/stream', dealsStream);

router.use(authenticate, ownershipFilter);

router.get('/', dealsController.list);
router.get('/:id', dealsController.get);
router.post('/', dealsController.create);
router.post('/bulk-delete', dealsController.bulkRemove);
router.patch('/:id', dealsController.update);
router.patch('/:id/stage', dealsController.move);
router.delete('/:id', dealsController.remove);

export default router;
