import * as Brevo from '@getbrevo/brevo';
import { type AppointmentStatus, type Language } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Bilingual transactional email service (Brevo).
//
// Per the project brief, every appointment status change triggers an email
// to the customer in their preferred language (Sinhala / English). The
// language is stored on the user account, so we pick the right Brevo
// template at send time.
//
// Templates are referenced via env vars so they can be swapped per
// environment without code changes:
//
//   BREVO_TEMPLATE_APPT_<STATUS>_<EN|SI>
//
// If the Brevo API key (or a specific template ID) is missing we LOG and
// SKIP rather than throwing — outgoing email is non-critical to API
// integrity, and we never want a status transition to fail because of an
// email outage.
// ─────────────────────────────────────────────────────────────────────────────

let api: Brevo.TransactionalEmailsApi | null = null;
let configWarned = false;

function getApi(): Brevo.TransactionalEmailsApi | null {
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) {
    if (!configWarned) {
      logger.warn('Brevo: BREVO_API_KEY / BREVO_SENDER_EMAIL not set — emails will be skipped');
      configWarned = true;
    }
    return null;
  }
  if (!api) {
    api = new Brevo.TransactionalEmailsApi();
    api.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, env.BREVO_API_KEY);
  }
  return api;
}

function getTemplateId(status: AppointmentStatus, lang: Language): number | null {
  const key = `BREVO_TEMPLATE_APPT_${status}_${lang}` as keyof NodeJS.ProcessEnv;
  const raw = process.env[key];
  const id = raw ? Number(raw) : NaN;
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

const STATUS_LABEL: Record<AppointmentStatus, { EN: string; SI: string }> = {
  PENDING: { EN: 'Pending', SI: 'බලා සිටී' },
  INSPECTED: { EN: 'Inspected', SI: 'පරීක්ෂා කර ඇත' },
  WAITING_FOR_PARTS: { EN: 'Waiting for parts', SI: 'කොටස් එනතුරු බලා සිටී' },
  REPAIRED: { EN: 'Repaired', SI: 'අලුත්වැඩියා කර ඇත' },
};

export interface AppointmentEmailContext {
  appointmentId: string;
  status: AppointmentStatus;
  customerName: string;
  customerEmail: string;
  customerLanguage: Language;
  registrationPlate: string;
  brandName?: string | null;
  model?: string | null;
  preferredDate: Date;
  estimatedCost?: string | null;
  finalCost?: string | null;
  adminNotes?: string | null;
}

/**
 * Send the appointment-status email for the given context. Resolves
 * silently (with logging) if Brevo isn't configured or the template ID
 * for this (status, language) pair is unset.
 */
export async function sendAppointmentStatusEmail(ctx: AppointmentEmailContext): Promise<void> {
  const client = getApi();
  if (!client) return;

  const templateId = getTemplateId(ctx.status, ctx.customerLanguage);
  if (!templateId) {
    logger.warn(
      { status: ctx.status, lang: ctx.customerLanguage, appointmentId: ctx.appointmentId },
      'Brevo template id not configured — skipping email',
    );
    return;
  }

  const message = new Brevo.SendSmtpEmail();
  message.templateId = templateId;
  message.sender = { email: env.BREVO_SENDER_EMAIL!, name: env.BREVO_SENDER_NAME ?? 'OldTrailBikes' };
  message.to = [{ email: ctx.customerEmail, name: ctx.customerName }];
  message.params = {
    appointmentId: ctx.appointmentId,
    customerName: ctx.customerName,
    status: ctx.status,
    statusLabel: STATUS_LABEL[ctx.status][ctx.customerLanguage],
    registrationPlate: ctx.registrationPlate,
    brandName: ctx.brandName ?? '',
    model: ctx.model ?? '',
    preferredDate: ctx.preferredDate.toISOString(),
    estimatedCost: ctx.estimatedCost ?? '',
    finalCost: ctx.finalCost ?? '',
    adminNotes: ctx.adminNotes ?? '',
  };
  message.tags = ['appointment-status', `status:${ctx.status}`, `lang:${ctx.customerLanguage}`];

  try {
    await client.sendTransacEmail(message);
    logger.info(
      { appointmentId: ctx.appointmentId, status: ctx.status, lang: ctx.customerLanguage },
      'Brevo: appointment status email sent',
    );
  } catch (err) {
    logger.error(
      { err, appointmentId: ctx.appointmentId, status: ctx.status },
      'Brevo: failed to send appointment status email',
    );
  }
}
