import { Router } from 'express';
import { 
  getDashboardAnalytics, getAdminEvents, createAdminEvent, updateAdminEvent,
  getAdminRegistrations, updateRegistrationStatus, updateTeamStatus,
  getAdminApplications, updateApplicationStatus,
  deleteAdminEvent, sendEventAnnouncement, broadcastEmail, getEventRevenue
} from '../controllers/admin.controller';
import { getAdminTeams } from '../controllers/team.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { uploadBanner } from '../middlewares/upload.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Apply protection: Only ADMIN can access dashboard APIs
router.get('/analytics', authenticate, authorize(Role.ADMIN), getDashboardAnalytics);

router.get('/events', authenticate, authorize(Role.ADMIN), getAdminEvents);
router.post('/events', authenticate, authorize(Role.ADMIN), uploadBanner, createAdminEvent);
router.patch('/events/:id', authenticate, authorize(Role.ADMIN), uploadBanner, updateAdminEvent);
router.delete('/events/:id', authenticate, authorize(Role.ADMIN), deleteAdminEvent);
router.post('/events/:id/notify', authenticate, authorize(Role.ADMIN), sendEventAnnouncement);
router.get('/events/:id/revenue', authenticate, authorize(Role.ADMIN), getEventRevenue);

router.get('/registrations', authenticate, authorize(Role.ADMIN), getAdminRegistrations);
router.patch('/registrations/:id/status', authenticate, authorize(Role.ADMIN), updateRegistrationStatus);
router.post('/registrations/broadcast', authenticate, authorize(Role.ADMIN), broadcastEmail);

router.get('/teams', authenticate, authorize(Role.ADMIN), getAdminTeams);
router.patch('/teams/:id/status', authenticate, authorize(Role.ADMIN), updateTeamStatus);

router.get('/applications', authenticate, authorize(Role.ADMIN), getAdminApplications);
router.patch('/applications/:id/status', authenticate, authorize(Role.ADMIN), updateApplicationStatus);

export default router;
