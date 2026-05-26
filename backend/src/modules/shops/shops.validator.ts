import { body, param, query } from 'express-validator';

export const applyValidator = [
  body('name').isString().trim().isLength({ min: 2, max: 120 }),
  body('slug')
    .isString()
    .trim()
    .isLength({ min: 2, max: 80 })
    .matches(/^[a-z0-9-]+$/)
    .withMessage('slug may only contain lowercase letters, numbers, and hyphens'),
  body('description').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }),
  body('contactEmail').isEmail().normalizeEmail(),
  body('contactPhone').isString().trim().isLength({ min: 7, max: 20 }),
  body('address').optional({ values: 'falsy' }).isString().isLength({ max: 400 }),
];

export const updateShopValidator = [
  body('name').optional().isString().trim().isLength({ min: 2, max: 120 }),
  body('description').optional({ values: 'null' }).isString().isLength({ max: 2000 }),
  body('contactEmail').optional().isEmail().normalizeEmail(),
  body('contactPhone').optional().isString().trim().isLength({ min: 7, max: 20 }),
  body('address').optional({ values: 'null' }).isString().isLength({ max: 400 }),
];

export const commissionValidator = [
  param('id').isUUID(),
  body('commissionRate')
    .isFloat({ min: 0, max: 100 })
    .withMessage('commissionRate must be between 0 and 100'),
];

export const listShopsValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const idParamValidator = [param('id').isUUID()];
export const slugParamValidator = [param('slug').isString().trim().isLength({ min: 2, max: 80 })];
