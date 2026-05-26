import {
  AppointmentStatus,
  type EngineType,
  type IssueCategory,
  type Prisma,
} from '@prisma/client';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import { sendAppointmentStatusEmail } from '../../services/email.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateAppointmentInput {
  customerId: string;
  registrationPlate: string;
  brandId?: string;
  model?: string;
  year?: number;
  engineType?: EngineType;
  issueCategory: IssueCategory;
  customerMessage?: string;
  contactPhone: string;
  preferredDate: Date;
  preInspectionPhotos?: string[];
}

export interface UpdateAppointmentInput {
  adminNotes?: string | null;
  estimatedCost?: number | null;
  finalCost?: number | null;
  preferredDate?: Date;
}

export interface TransitionStatusInput {
  status: AppointmentStatus;
  estimatedCost?: number | null;
  finalCost?: number | null;
  adminNotes?: string | null;
  /** Override the status state machine (ADMIN-only escape hatch). */
  force?: boolean;
}

export interface ListAppointmentsParams {
  status?: AppointmentStatus;
  customerId?: string;
  plate?: string;
  page?: number;
  pageSize?: number;
}

// Include relations the API actually returns to clients.
const APPT_INCLUDE = {
  serviceBike: { include: { brand: true } },
  customer: { select: { id: true, fullName: true, email: true, phone: true, preferredLanguage: true } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{ include: typeof APPT_INCLUDE }>;

// ─── Status state machine ────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: [AppointmentStatus.INSPECTED],
  INSPECTED: [AppointmentStatus.WAITING_FOR_PARTS, AppointmentStatus.REPAIRED],
  WAITING_FOR_PARTS: [AppointmentStatus.REPAIRED, AppointmentStatus.INSPECTED],
  REPAIRED: [], // terminal
};

function assertTransitionAllowed(from: AppointmentStatus, to: AppointmentStatus): void {
  if (from === to) return; // idempotent no-op handled by caller
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw ApiError.badRequest(
      `Illegal status transition ${from} → ${to}. Allowed: ${allowed.join(', ') || '(none, terminal)'}`,
      { from, to, allowed },
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function normalizePlate(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Find the persistent ServiceBike row for this plate, or create one. The
 * registration plate is the lifetime identifier — every appointment on the
 * same plate auto-links to the same physical bike, giving the workshop a
 * complete service history per vehicle.
 */
async function findOrCreateServiceBike(
  tx: Prisma.TransactionClient,
  args: {
    plate: string;
    customerId: string;
    brandId?: string;
    model?: string;
    year?: number;
    engineType?: EngineType;
  },
) {
  const existing = await tx.serviceBike.findUnique({ where: { registrationPlate: args.plate } });
  if (existing) {
    // Backfill any missing optional fields the customer provided this time.
    const patch: Prisma.ServiceBikeUpdateInput = {};
    if (args.brandId && !existing.brandId) patch.brand = { connect: { id: args.brandId } };
    if (args.model && !existing.model) patch.model = args.model;
    if (args.year && !existing.year) patch.year = args.year;
    if (args.engineType && !existing.engineType) patch.engineType = args.engineType;
    if (!existing.ownerUserId) patch.owner = { connect: { id: args.customerId } };
    if (Object.keys(patch).length === 0) return existing;
    return tx.serviceBike.update({ where: { id: existing.id }, data: patch });
  }

  return tx.serviceBike.create({
    data: {
      registrationPlate: args.plate,
      brandId: args.brandId,
      model: args.model,
      year: args.year,
      engineType: args.engineType,
      ownerUserId: args.customerId,
    },
  });
}

function decimalToString(v: unknown): string | null {
  if (v == null) return null;
  return typeof v === 'object' && v !== null && 'toString' in v
    ? (v as { toString(): string }).toString()
    : String(v);
}

async function fireStatusEmail(appt: AppointmentWithRelations): Promise<void> {
  await sendAppointmentStatusEmail({
    appointmentId: appt.id,
    status: appt.status,
    customerName: appt.customer.fullName,
    customerEmail: appt.customer.email,
    customerLanguage: appt.customer.preferredLanguage,
    registrationPlate: appt.serviceBike.registrationPlate,
    brandName: appt.serviceBike.brand?.name ?? null,
    model: appt.serviceBike.model,
    preferredDate: appt.preferredDate,
    estimatedCost: decimalToString(appt.estimatedCost),
    finalCost: decimalToString(appt.finalCost),
    adminNotes: appt.adminNotes,
  });
}

// ─── Service operations ──────────────────────────────────────────────────────

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<AppointmentWithRelations> {
  const plate = normalizePlate(input.registrationPlate);

  const appt = await prisma.$transaction(async (tx) => {
    const bike = await findOrCreateServiceBike(tx, {
      plate,
      customerId: input.customerId,
      brandId: input.brandId,
      model: input.model,
      year: input.year,
      engineType: input.engineType,
    });

    return tx.appointment.create({
      data: {
        customerId: input.customerId,
        serviceBikeId: bike.id,
        issueCategory: input.issueCategory,
        customerMessage: input.customerMessage,
        contactPhone: input.contactPhone,
        preferredDate: input.preferredDate,
        preInspectionPhotos: input.preInspectionPhotos ?? [],
        status: AppointmentStatus.PENDING,
      },
      include: APPT_INCLUDE,
    });
  });

  // Fire confirmation email asynchronously — don't block the booking response.
  void fireStatusEmail(appt).catch((err) =>
    logger.error({ err, id: appt.id }, 'Booking confirmation email failed'),
  );

  return appt;
}

export async function getAppointmentById(
  id: string,
  opts: { customerId?: string; isAdmin?: boolean } = {},
): Promise<AppointmentWithRelations> {
  const appt = await prisma.appointment.findUnique({ where: { id }, include: APPT_INCLUDE });
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (!opts.isAdmin && opts.customerId && appt.customerId !== opts.customerId) {
    throw ApiError.forbidden('You do not have access to this appointment');
  }
  return appt;
}

export async function listAppointmentsForCustomer(
  customerId: string,
  params: { status?: AppointmentStatus; page?: number; pageSize?: number },
): Promise<{ items: AppointmentWithRelations[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const where: Prisma.AppointmentWhereInput = {
    customerId,
    ...(params.status ? { status: params.status } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: APPT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.appointment.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function listAppointmentsForAdmin(
  params: ListAppointmentsParams,
): Promise<{ items: AppointmentWithRelations[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const where: Prisma.AppointmentWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.customerId ? { customerId: params.customerId } : {}),
    ...(params.plate
      ? { serviceBike: { registrationPlate: normalizePlate(params.plate) } }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: APPT_INCLUDE,
      orderBy: [{ status: 'asc' }, { preferredDate: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.appointment.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

/**
 * Lifetime per-bike service history. Returns every appointment ever booked
 * against this registration plate, regardless of which customer booked it.
 */
export async function getHistoryByPlate(
  plate: string,
): Promise<{ bike: Awaited<ReturnType<typeof prisma.serviceBike.findUnique>>; appointments: AppointmentWithRelations[] }> {
  const normalized = normalizePlate(plate);
  const bike = await prisma.serviceBike.findUnique({
    where: { registrationPlate: normalized },
    include: { brand: true },
  });
  if (!bike) throw ApiError.notFound(`No service history found for plate ${normalized}`);

  const appointments = await prisma.appointment.findMany({
    where: { serviceBikeId: bike.id },
    include: APPT_INCLUDE,
    orderBy: { preferredDate: 'desc' },
  });
  return { bike, appointments };
}

const MAX_ISSUE_PHOTOS = 12;

export async function addAppointmentPhotos(
  id: string,
  userId: string,
  urls: string[],
  isAdmin: boolean,
): Promise<AppointmentWithRelations> {
  if (urls.length === 0) throw ApiError.badRequest('No photos to add');
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (!isAdmin && appt.customerId !== userId) throw ApiError.forbidden('You do not have access to this appointment');
  if (appt.preInspectionPhotos.length + urls.length > MAX_ISSUE_PHOTOS) {
    throw ApiError.badRequest(`At most ${MAX_ISSUE_PHOTOS} issue photos allowed per appointment`);
  }
  return prisma.appointment.update({
    where: { id },
    data: { preInspectionPhotos: { push: urls } },
    include: APPT_INCLUDE,
  });
}

export async function updateAppointment(
  id: string,
  input: UpdateAppointmentInput,
): Promise<AppointmentWithRelations> {
  await getAppointmentById(id, { isAdmin: true });

  return prisma.appointment.update({
    where: { id },
    data: {
      adminNotes: input.adminNotes,
      estimatedCost: input.estimatedCost ?? undefined,
      finalCost: input.finalCost ?? undefined,
      preferredDate: input.preferredDate,
    },
    include: APPT_INCLUDE,
  });
}

/**
 * Transition the appointment to a new status. Enforces the state machine
 * unless `force` is set. Stamps inspectedAt / repairedAt when relevant and
 * fires a bilingual Brevo email keyed on the customer's preferred language.
 */
export async function transitionAppointmentStatus(
  id: string,
  input: TransitionStatusInput,
): Promise<AppointmentWithRelations> {
  const current = await getAppointmentById(id, { isAdmin: true });

  if (current.status === input.status) {
    // Idempotent — return current without re-emailing.
    return current;
  }

  if (!input.force) {
    assertTransitionAllowed(current.status, input.status);
  }

  // Server-side rule: REPAIRED requires a finalCost (either pre-existing or
  // supplied in this transition). INSPECTED expects an estimatedCost.
  if (input.status === AppointmentStatus.INSPECTED) {
    if (input.estimatedCost == null && current.estimatedCost == null) {
      throw ApiError.badRequest('estimatedCost is required when transitioning to INSPECTED');
    }
  }
  if (input.status === AppointmentStatus.REPAIRED) {
    if (input.finalCost == null && current.finalCost == null) {
      throw ApiError.badRequest('finalCost is required when transitioning to REPAIRED');
    }
  }

  const data: Prisma.AppointmentUpdateInput = {
    status: input.status,
    ...(input.estimatedCost != null ? { estimatedCost: input.estimatedCost } : {}),
    ...(input.finalCost != null ? { finalCost: input.finalCost } : {}),
    ...(input.adminNotes !== undefined ? { adminNotes: input.adminNotes } : {}),
    ...(input.status === AppointmentStatus.INSPECTED ? { inspectedAt: new Date() } : {}),
    ...(input.status === AppointmentStatus.REPAIRED ? { repairedAt: new Date() } : {}),
  };

  const updated = await prisma.appointment.update({
    where: { id },
    data,
    include: APPT_INCLUDE,
  });

  void fireStatusEmail(updated).catch((err) =>
    logger.error({ err, id, status: input.status }, 'Status email dispatch failed'),
  );

  return updated;
}
