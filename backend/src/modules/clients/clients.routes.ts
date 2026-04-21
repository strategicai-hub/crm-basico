import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { ownershipFilter } from '../../middleware/ownership';
import { requireRole } from '../../middleware/role';
import * as clientsController from './clients.controller';
import * as onboardingController from '../onboarding-forms/onboarding-forms.controller';

const router = Router();

router.use(authenticate, ownershipFilter);

router.get('/', clientsController.list);
router.get('/:id', clientsController.get);
router.post('/', clientsController.create);
router.post('/bulk-delete', clientsController.bulkRemove);
router.patch('/:id', clientsController.update);
router.delete('/:id', clientsController.remove);
router.get('/:id/activities', clientsController.getActivities);
router.post('/:id/activities', clientsController.addActivity);

router.post('/:id/form-token', requireRole('ADMIN'), clientsController.generateFormToken);
router.delete('/:id/form-token', requireRole('ADMIN'), clientsController.revokeFormToken);
router.get('/:id/contract-submissions', requireRole('ADMIN'), clientsController.listContractSubmissions);

router.get('/:id/onboarding-form', onboardingController.get);
router.post('/:id/onboarding-form', onboardingController.createOrUpdate);
router.delete('/:id/onboarding-form/token', onboardingController.revoke);
router.get('/:id/onboarding-form/submissions', onboardingController.listSubmissions);
router.delete('/:id/onboarding-form/submissions/:submissionId', onboardingController.deleteSubmission);
router.get('/:id/onboarding-form/yaml', onboardingController.downloadYaml);

export default router;
