import { body, param, query } from 'express-validator';

const ENGINE_TYPES = ['TWO_STROKE', 'FOUR_STROKE', 'ELECTRIC'] as const;
const LISTING_STATUSES = ['AVAILABLE', 'PENDING', 'SOLD'] as const;
const CURRENT_YEAR = new Date().getFullYear();

export const createListingValidator = [
  body('brandId').isUUID().withMessage('brandId must be a valid UUID'),
  body('model').isString().trim().isLength({ min: 1, max: 100 }),
  body('year').isInt({ min: 1950, max: CURRENT_YEAR + 1 }).toInt(),
  body('engineType').isIn(ENGINE_TYPES),
  body('mileageKm').isInt({ min: 0 }).toInt(),
  body('fuelConsumption').optional({ values: 'falsy' }).isFloat({ min: 0 }).toFloat(),
  body('price').isFloat({ min: 0 }).withMessage('price must be a positive number').toFloat(),
  body('description').isString().trim().isLength({ min: 10, max: 5000 }),
  body('location').isString().trim().isLength({ min: 2, max: 200 }),
  body('whatsappNumber').optional({ values: 'falsy' }).isString().isLength({ min: 7, max: 20 }),
  body('phoneNumber').optional({ values: 'falsy' }).isString().isLength({ min: 7, max: 20 }),
];

export const updateListingValidator = [
  param('id').isUUID(),
  body('brandId').optional().isUUID(),
  body('model').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('year').optional().isInt({ min: 1950, max: CURRENT_YEAR + 1 }).toInt(),
  body('engineType').optional().isIn(ENGINE_TYPES),
  body('mileageKm').optional().isInt({ min: 0 }).toInt(),
  body('fuelConsumption').optional({ values: 'null' }).isFloat({ min: 0 }).toFloat(),
  body('price').optional().isFloat({ min: 0 }).toFloat(),
  body('description').optional().isString().trim().isLength({ min: 10, max: 5000 }),
  body('location').optional().isString().trim().isLength({ min: 2, max: 200 }),
  body('whatsappNumber').optional({ values: 'null' }).isString().isLength({ min: 7, max: 20 }),
  body('phoneNumber').optional({ values: 'null' }).isString().isLength({ min: 7, max: 20 }),
];

export const updateStatusValidator = [
  param('id').isUUID(),
  body('status').isIn(LISTING_STATUSES).withMessage('status must be AVAILABLE, PENDING, or SOLD'),
];

export const listListingsValidator = [
  query('brandId').optional().isUUID(),
  query('engineType').optional().isIn(ENGINE_TYPES),
  query('status').optional().isIn(LISTING_STATUSES),
  query('verified').optional().isBoolean().toBoolean(),
  query('minPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('sellerId').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const idParamValidator = [param('id').isUUID()];

export const verifyBikeValidator = [
  param('id').isUUID(),
  body('inspectionNotes')
    .isString()
    .trim()
    .isLength({ min: 10, max: 4000 })
    .withMessage('Inspection notes are required (min 10 chars)'),
];
