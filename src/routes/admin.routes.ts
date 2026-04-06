import { Router } from 'express';
import { 
  getDashboardAnalytics, getAdminEvents, createAdminEvent, 
  getAdminRegistrations, refundRegistration, getAdminApplications, updateApplicationStatus 
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Apply protection: Only ADMIN can access dashboard APIs
router.get('/analytics', authenticate, authorize(Role.ADMIN), getDashboardAnalytics);

router.get('/events', authenticate, authorize(Role.ADMIN), getAdminEvents);
router.post('/events', authenticate, authorize(Role.ADMIN), createAdminEvent);

router.get('/registrations', authenticate, authorize(Role.ADMIN), getAdminRegistrations);
router.post('/registrations/:id/refund', authenticate, authorize(Role.ADMIN), refundRegistration);

router.get('/applications', authenticate, authorize(Role.ADMIN), getAdminApplications);
router.patch('/applications/:id/status', authenticate, authorize(Role.ADMIN), updateApplicationStatus);

export default router;
