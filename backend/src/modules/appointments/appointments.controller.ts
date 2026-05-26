import type { Request, Response } from 'express';
import type { AppointmentStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { uploadFiles } from '../../services/cloudinary.service';
import {
  addAppointmentPhotos,
  createAppointment,
  getAppointmentById,
  getHistoryByPlate,
  listAppointmentsForAdmin,
  listAppointmentsForCustomer,
  transitionAppointmentStatus,
  updateAppointment,
} from './appointments.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

// POST /appointments  (customer)
export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as {
    registrationPlate: string;
    brandId?: string;
    model?: string;
    year?: number;
    engineType?: 'TWO_STROKE' | 'FOUR_STROKE' | 'ELECTRIC';
    issueCategory:
      | 'ENGINE_2_STROKE_REBUILD'
      | 'ENGINE_4_STROKE_REBUILD'
      | 'SUSPENSION_TUNING'
      | 'BRAKE_REPAIR'
      | 'ELECTRICAL_FAULT'
      | 'DRIVE_ISSUE'
      | 'TYRE_WORK'
      | 'OTHER';
    customerMessage?: string;
    contactPhone: string;
    preferredDate: string;
    preInspectionPhotos?: string[];
  };

  const appointment = await createAppointment({
    customerId: user.sub,
    registrationPlate: body.registrationPlate,
    brandId: body.brandId,
    model: body.model,
    year: body.year,
    engineType: body.engineType,
    issueCategory: body.issueCategory,
    customerMessage: body.customerMessage,
    contactPhone: body.contactPhone,
    preferredDate: new Date(body.preferredDate),
    preInspectionPhotos: body.preInspectionPhotos,
  });

  res.status(201).json({ appointment });
});

// GET /appointments/mine  (customer)
export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { status, page, pageSize } = req.query as {
    status?: AppointmentStatus;
    page?: number;
    pageSize?: number;
  };
  const result = await listAppointmentsForCustomer(user.sub, { status, page, pageSize });
  res.json(result);
});

// GET /appointments/:id
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const appointment = await getAppointmentById(req.params.id, {
    customerId: user.sub,
    isAdmin: user.role === 'ADMIN',
  });
  res.json({ appointment });
});

// GET /appointments/by-plate/:plate
export const historyByPlate = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { bike, appointments } = await getHistoryByPlate(req.params.plate);

  // A non-admin can only view a plate's history if they currently own at least
  // one appointment tied to it.
  if (user.role !== 'ADMIN') {
    const ownsHistory = appointments.some((a) => a.customerId === user.sub);
    if (!ownsHistory) throw ApiError.forbidden('You do not have access to this bike\'s history');
  }

  res.json({ bike, appointments });
});

// GET /appointments  (admin)
export const listForAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { status, customerId, plate, page, pageSize } = req.query as {
    status?: AppointmentStatus;
    customerId?: string;
    plate?: string;
    page?: number;
    pageSize?: number;
  };
  const result = await listAppointmentsForAdmin({ status, customerId, plate, page, pageSize });
  res.json(result);
});

// PATCH /appointments/:id  (admin: notes, costs, reschedule)
export const update = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as {
    adminNotes?: string | null;
    estimatedCost?: number | null;
    finalCost?: number | null;
    preferredDate?: string;
  };
  const appointment = await updateAppointment(req.params.id, {
    adminNotes: body.adminNotes,
    estimatedCost: body.estimatedCost,
    finalCost: body.finalCost,
    preferredDate: body.preferredDate ? new Date(body.preferredDate) : undefined,
  });
  res.json({ appointment });
});

// POST /appointments/:id/photos  (customer: issue photos after booking)
export const uploadPhotos = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const files = (req.files ?? []) as Express.Multer.File[];
  if (files.length === 0) throw ApiError.badRequest('No image files provided');
  const urls = await uploadFiles(files, 'appointments');
  const appointment = await addAppointmentPhotos(req.params.id, user.sub, urls, user.role === 'ADMIN');
  res.json({ appointment });
});

// PATCH /appointments/:id/status  (admin: state machine + bilingual email)
export const transition = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as {
    status: AppointmentStatus;
    estimatedCost?: number | null;
    finalCost?: number | null;
    adminNotes?: string | null;
    force?: boolean;
  };
  const appointment = await transitionAppointmentStatus(req.params.id, body);
  res.json({ appointment });
});
