import { body, param, query } from 'express-validator';

const ISSUE_CATEGORIES = [
  'ENGINE_2_STROKE_REBUILD',
  'ENGINE_4_STROKE_REBUILD',
  'SUSPENSION_TUNING',
  'BRAKE_REPAIR',
  'ELECTRICAL_FAULT',
  'DRIVE_ISSUE',
  'TYRE_WORK',
  'OTHER',
] as const;

const ENGINE_TYPES = ['TWO_STROKE', 'FOUR_STROKE', 'ELECTRIC'] as const;

const APPOINTMENT_STATUSES = ['PENDING', 'INSPECTED', 'WAITING_FOR_PARTS', 'REPAIRED'] as const;

// ─── POST /appointments ──────────────────────────────────────────────────────

export const createAppointmentValidator = [
  body('registrationPlate')
    .isString()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Registration plate is required'),
  body('brandId').optional({ values: 'falsy' }).isUUID().withMessage('brandId must be a UUID'),
  body('model').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
  body('year')
    .optional({ values: 'falsy' })
    .isInt({ min: 1950, max: new Date().getFullYear() + 1 })
    .toInt(),
  body('engineType').optional({ values: 'falsy' }).isIn(ENGINE_TYPES),
  body('issueCategory').isIn(ISSUE_CATEGORIES).withMessage('Invalid issue category'),
  body('customerMessage').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }),
  body('contactPhone').isString().trim().isLength({ min: 7, max: 20 }),
  body('preferredDate').isISO8601().withMessage('preferredDate must be ISO 8601'),
  body('preInspectionPhotos')
    .optional()
    .isArray({ max: 12 })
    .withMessage('preInspectionPhotos must be an array of up to 12 URLs'),
  body('preInspectionPhotos.*').optional().isURL().withMessage('Each photo must be a URL'),
];

// ─── GET /appointments (admin queue) ─────────────────────────────────────────

export const listAppointmentsValidator = [
  query('status').optional().isIn(APPOINTMENT_STATUSES),
  query('customerId').optional().isUUID(),
  query('plate').optional().isString().trim().isLength({ min: 2, max: 20 }),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const myAppointmentsValidator = [
  query('status').optional().isIn(APPOINTMENT_STATUSES),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const idParamValidator = [param('id').isUUID().withMessage('id must be a UUID')];

export const plateParamValidator = [
  param('plate').isString().trim().isLength({ min: 2, max: 20 }),
];

// ─── PATCH /appointments/:id (admin: notes, costs) ───────────────────────────

export const updateAppointmentValidator = [
  ...idParamValidator,
  body('adminNotes').optional({ values: 'null' }).isString().isLength({ max: 4000 }),
  body('estimatedCost').optional({ values: 'null' }).isFloat({ min: 0 }).toFloat(),
  body('finalCost').optional({ values: 'null' }).isFloat({ min: 0 }).toFloat(),
  body('preferredDate').optional().isISO8601(),
];

// ─── PATCH /appointments/:id/status ──────────────────────────────────────────

export const transitionStatusValidator = [
  ...idParamValidator,
  body('status').isIn(APPOINTMENT_STATUSES).withMessage('Invalid status'),
  body('estimatedCost').optional({ values: 'null' }).isFloat({ min: 0 }).toFloat(),
  body('finalCost').optional({ values: 'null' }).isFloat({ min: 0 }).toFloat(),
  body('adminNotes').optional({ values: 'null' }).isString().isLength({ max: 4000 }),
  body('force').optional().isBoolean().toBoolean(),
];
