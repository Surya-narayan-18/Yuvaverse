import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { sendAnnouncementEmail } from '../mailers/announcement.mailer';

interface UpdateEventBody {
  title?: string;
  description?: string;
  date?: string;
  venue?: string;
  price?: string | number;
  imageUrl?: string | null;
  bannerUrl?: string | null;
}

export const getDashboardAnalytics = async (_req: Request, res: Response) => {
  try {
    // 1. Total Revenue — sum from individual successful registrations + team registrations
    const successfulRegistrations = await prisma.registration.findMany({
      where: { status: 'SUCCESS' },
      include: { event: true },
    });
    const successfulTeams = await prisma.team.findMany({
      where: { status: 'SUCCESS' },
      include: { event: true },
    });

    const individualRevenue = successfulRegistrations.reduce((acc, curr) => {
      return acc + (curr.event.price || 0);
    }, 0);
    const teamRevenue = successfulTeams.reduce((acc, curr) => {
      return acc + (curr.event.price || 0);
    }, 0);
    const totalRevenue = individualRevenue + teamRevenue;

    // 2. Total Registrations — individuals + teams
    const individualCount = await prisma.registration.count();
    const teamCount = await prisma.team.count();
    const totalRegistrations = individualCount + teamCount;

    // 3. Active Events (Date is in the future)
    const activeEvents = await prisma.event.count({
      where: {
        date: {
          gt: new Date()
        }
      }
    });

    // 4. Real Monthly Revenue derived from DB — last 6 months
    // Build a month → revenue map from actual successful registrations and teams
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const revenueByMonth: Record<string, number> = {};

    // Individual registrations
    for (const reg of successfulRegistrations) {
      const d = new Date(reg.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
      revenueByMonth[key] = (revenueByMonth[key] || 0) + (reg.event.price || 0);
    }
    // Team registrations
    for (const team of successfulTeams) {
      const d = new Date(team.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
      revenueByMonth[key] = (revenueByMonth[key] || 0) + (team.event.price || 0);
    }

    // Produce the last 6 calendar months in order
    const now = new Date();
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
      monthlyRevenue.push({ month: monthNames[d.getMonth()], revenue: revenueByMonth[key] || 0 });
    }

    return sendSuccess(res, {
      totalRevenue,
      totalRegistrations,
      activeEvents,
      monthlyRevenue
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return sendError(res, 'Internal Server Error', 500);
  }
};

// --- EVENT REVENUE ---
export const getEventRevenue = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return sendError(res, 'Event not found', 404);

    const [successRegs, successTeams] = await Promise.all([
      prisma.registration.count({ where: { eventId: id, status: 'SUCCESS' } }),
      prisma.team.count({ where: { eventId: id, status: 'SUCCESS' } }),
    ]);

    const revenue = (successRegs + successTeams) * (event.price || 0);
    return sendSuccess(res, { eventId: id, eventTitle: event.title, price: event.price, successRegs, successTeams, revenue });
  } catch (error) {
    console.error('Error fetching event revenue:', error);
    return sendError(res, 'Internal Server Error', 500);
  }
};

// --- EVENTS ---
export const getAdminEvents = async (_req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { registrations: true, teams: true } },
      },
    });
    return sendSuccess(res, events);
  } catch (error) {
    return sendError(res, 'Internal Server Error', 500);
  }
};

export const createAdminEvent = async (req: Request, res: Response) => {
  try {
    const {
      title, description, date, venue, price, imageUrl, customFields,
      eventType, maxTeamSize, maxRegistrations, registrationDeadline,
    } = req.body;

    // multer-storage-cloudinary places the CDN URL at req.file.path
    const bannerUrl = (req.file as (Express.Multer.File & { path: string }) | undefined)?.path ?? null;

    // customFields arrives as a JSON string in multipart submissions
    let parsedCustomFields: Prisma.InputJsonValue = [];
    if (customFields) {
      try { parsedCustomFields = JSON.parse(customFields) as Prisma.InputJsonValue; } catch { parsedCustomFields = []; }
    }

    const newEvent = await prisma.event.create({
      data: {
        title, description, date: new Date(date), venue,
        price: Number(price),
        imageUrl: imageUrl ?? null,
        bannerUrl,
        customFields: parsedCustomFields,
        eventType: eventType || null,
        maxTeamSize: maxTeamSize ? Number(maxTeamSize) : 1,
        maxRegistrations: maxRegistrations ? Number(maxRegistrations) : null,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      }
    });
    return sendSuccess(res, newEvent);
  } catch (error) {
    console.error('Event creation error', error);
    return sendError(res, 'Error creating event', 500);
  }
};

export const updateAdminEvent = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const body = req.body as UpdateEventBody & {
      eventType?: string;
      maxTeamSize?: string | number;
      maxRegistrations?: string | number;
      registrationDeadline?: string;
    };

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return sendError(res, 'Event not found', 404);
    }

    // Build partial update — only include explicitly sent fields
    const data: {
      title?: string;
      description?: string;
      date?: Date;
      venue?: string;
      price?: number;
      imageUrl?: string | null;
      bannerUrl?: string | null;
      eventType?: string | null;
      maxTeamSize?: number;
      maxRegistrations?: number | null;
      registrationDeadline?: Date | null;
    } = {};

    if (body.title       !== undefined) data.title       = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.date        !== undefined) data.date        = new Date(body.date);
    if (body.venue       !== undefined) data.venue       = body.venue;
    if (body.price       !== undefined) data.price       = Number(body.price);
    if ('imageUrl' in body)             data.imageUrl    = body.imageUrl ?? null;
    if (body.eventType   !== undefined) data.eventType   = body.eventType || null;
    if (body.maxTeamSize !== undefined) data.maxTeamSize = Number(body.maxTeamSize);
    if (body.maxRegistrations !== undefined)
      data.maxRegistrations = body.maxRegistrations ? Number(body.maxRegistrations) : null;
    if (body.registrationDeadline !== undefined)
      data.registrationDeadline = body.registrationDeadline ? new Date(body.registrationDeadline) : null;

    // multer-storage-cloudinary puts the CDN URL at req.file.path
    const uploaded = (req.file as (Express.Multer.File & { path: string }) | undefined);
    if (uploaded) data.bannerUrl = uploaded.path;

    // customFields handled separately if sent
    let updatePayload: Prisma.EventUpdateInput = { ...data };
    if (req.body.customFields) {
      try {
        updatePayload.customFields = JSON.parse(req.body.customFields as string) as Prisma.InputJsonValue;
      } catch {
        // ignore malformed JSON
      }
    }

    const updated = await prisma.event.update({ where: { id }, data: updatePayload });
    return sendSuccess(res, updated, 'Event updated successfully');
  } catch (error) {
    console.error('Event update error', error);
    return sendError(res, 'Error updating event', 500);
  }
};

export const deleteAdminEvent = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // Check if event exists
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return sendError(res, 'Event not found', 404);
    }

    // Delete event (registrations will be deleted via Cascade)
    await prisma.event.delete({ where: { id } });

    return sendSuccess(res, null, 'Event deleted successfully');
  } catch (error) {
    console.error('Event deletion error', error);
    return sendError(res, 'Error deleting event', 500);
  }
};

// --- REGISTRATIONS ---
export const getAdminRegistrations = async (_req: Request, res: Response) => {
  try {
    const registrations = await prisma.registration.findMany({
      include: { event: true },
      orderBy: { createdAt: 'desc' }
    });
    return sendSuccess(res, registrations);
  } catch (error) {
    return sendError(res, 'Internal Server Error', 500);
  }
};

export const updateRegistrationStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body as { status: string };
    const validStatuses = ['PENDING', 'SUCCESS', 'FAILED'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 'Invalid status value', 400);
    }
    const updated = await prisma.registration.update({
      where: { id },
      data: { status: status as 'PENDING' | 'SUCCESS' | 'FAILED' },
      include: { event: true },
    });
    return sendSuccess(res, updated, 'Registration status updated');
  } catch (error) {
    console.error('Update registration status error:', error);
    return sendError(res, 'Error updating status', 500);
  }
};

export const deleteRegistration = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.registration.findUnique({ where: { id } });
    if (!existing) return sendError(res, 'Registration not found', 404);

    await prisma.registration.delete({ where: { id } });
    return sendSuccess(res, null, 'Registration deleted successfully');
  } catch (error) {
    console.error('Delete registration error:', error);
    return sendError(res, 'Error deleting registration', 500);
  }
};

export const updateTeamStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body as { status: string };
    const validStatuses = ['PENDING', 'SUCCESS', 'FAILED'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 'Invalid status value', 400);
    }
    const updated = await prisma.team.update({
      where: { id },
      data: { status },
      include: { event: true, members: true },
    });
    return sendSuccess(res, updated, 'Team status updated');
  } catch (error) {
    console.error('Update team status error:', error);
    return sendError(res, 'Error updating team status', 500);
  }
};

export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) return sendError(res, 'Team not found', 404);

    await prisma.team.delete({ where: { id } });
    return sendSuccess(res, null, 'Team deleted successfully');
  } catch (error) {
    console.error('Delete team error:', error);
    return sendError(res, 'Error deleting team', 500);
  }
};

// --- APPLICATIONS ---
export const getAdminApplications = async (_req: Request, res: Response) => {
  try {
    const applications = await prisma.application.findMany({ orderBy: { createdAt: 'desc' } });
    return sendSuccess(res, applications);
  } catch (error) {
    return sendError(res, 'Internal Server Error', 500);
  }
};

export const updateApplicationStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body; 
    const updated = await prisma.application.update({
      where: { id },
      data: { status: status as ApplicationStatus }
    });
    return sendSuccess(res, updated);
  } catch (error) {
    return sendError(res, 'Error updating status', 500);
  }
};

// --- BROADCAST EMAIL ---
export const sendEventAnnouncement = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { subject, message } = req.body as { subject?: string; message?: string };

    if (!subject?.trim() || !message?.trim()) {
      return sendError(res, 'Subject and message are required', 400);
    }

    // Verify the event exists
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return sendError(res, 'Event not found', 404);
    }

    // Get all successful registrants for this event
    const registrations = await prisma.registration.findMany({
      where: { eventId: id, status: 'SUCCESS' },
      select: { studentEmail: true, studentName: true },
    });

    if (registrations.length === 0) {
      return sendError(res, 'No confirmed registrants found for this event', 404);
    }

    // Send email to each registrant (sequentially to avoid SMTP rate limits)
    let emailsSent = 0;
    const errors: string[] = [];

    for (const reg of registrations) {
      try {
        await sendAnnouncementEmail({
          toEmail: reg.studentEmail,
          studentName: reg.studentName,
          eventTitle: event.title,
          subject: subject.trim(),
          message: message.trim(),
        });
        emailsSent++;
      } catch (err) {
        console.error(`Failed to send email to ${reg.studentEmail}:`, err);
        errors.push(reg.studentEmail);
      }
    }

    return sendSuccess(res, { emailsSent, failed: errors.length, totalRegistrants: registrations.length },
      `Announcement sent to ${emailsSent} of ${registrations.length} registrants.`);
  } catch (error) {
    console.error('Announcement email error:', error);
    return sendError(res, 'Error sending announcement', 500);
  }
};

// --- GLOBAL BROADCAST EMAIL (deduped across ALL registrants) ---
export const broadcastEmail = async (req: Request, res: Response) => {
  try {
    const { subject, message } = req.body as { subject?: string; message?: string };

    if (!subject?.trim() || !message?.trim()) {
      return sendError(res, 'Subject and message are required', 400);
    }

    // Fetch unique emails at the DB level using Prisma's distinct — most efficient approach.
    // Only SUCCESS registrations so we target confirmed attendees.
    const uniqueRegistrants = await prisma.registration.findMany({
      where:  { status: 'SUCCESS' },
      select: { studentEmail: true, studentName: true },
      distinct: ['studentEmail'],
      orderBy: { createdAt: 'asc' }, // keep earliest name for a given email
    });

    if (uniqueRegistrants.length === 0) {
      return sendError(res, 'No confirmed registrants found across all events', 404);
    }

    let emailsSent = 0;
    const failedEmails: string[] = [];

    for (const reg of uniqueRegistrants) {
      try {
        await sendAnnouncementEmail({
          toEmail:    reg.studentEmail,
          studentName: reg.studentName,
          eventTitle: 'Yuvaverse Events',   // generic label for broadcast
          subject:    subject.trim(),
          message:    message.trim(),
        });
        emailsSent++;
      } catch (err) {
        console.error(`Broadcast failed for ${reg.studentEmail}:`, err);
        failedEmails.push(reg.studentEmail);
      }
    }

    return sendSuccess(
      res,
      {
        emailsSent,
        failed:            failedEmails.length,
        uniqueRecipients:  uniqueRegistrants.length,
      },
      `Broadcast sent to ${emailsSent} unique registrant(s).`,
    );
  } catch (error) {
    console.error('Broadcast email error:', error);
    return sendError(res, 'Error sending broadcast', 500);
  }
};
