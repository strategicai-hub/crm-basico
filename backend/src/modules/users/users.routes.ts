import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import * as usersController from './users.controller';

const router = Router();

// Rota sem requerimento de ADMIN — apenas autenticado
router.get('/minimal', authenticate, usersController.listMinimal);

// Demais rotas requerem ADMIN
router.use(authenticate, requireRole('ADMIN'));

router.get('/', usersController.list);
router.post('/', usersController.create);
router.post('/bulk-delete', usersController.bulkRemove);
router.patch('/:id', usersController.update);
router.delete('/:id', usersController.remove);

export default router;
