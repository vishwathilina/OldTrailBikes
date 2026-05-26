import { body, param, query } from 'express-validator';

export const createPartValidator = [
  body('categoryId').isUUID().withMessage('categoryId must be a valid UUID'),
  body('brandId').optional({ values: 'falsy' }).isUUID(),
  body('name').isString().trim().isLength({ min: 2, max: 200 }),
  body('description').optional({ values: 'falsy' }).isString().isLength({ max: 4000 }),
  body('compatibleBikes')
    .optional()
    .isArray()
    .withMessage('compatibleBikes must be an array of strings'),
  body('compatibleBikes.*').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('price').isFloat({ min: 0 }).withMessage('price must be a positive number').toFloat(),
  body('stockQuantity').isInt({ min: 0 }).toInt(),
];

export const updatePartValidator = [
  param('id').isUUID(),
  body('categoryId').optional().isUUID(),
  body('brandId').optional({ values: 'null' }).isUUID(),
  body('name').optional().isString().trim().isLength({ min: 2, max: 200 }),
  body('description').optional({ values: 'null' }).isString().isLength({ max: 4000 }),
  body('compatibleBikes').optional().isArray(),
  body('compatibleBikes.*').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('price').optional().isFloat({ min: 0 }).toFloat(),
  body('stockQuantity').optional().isInt({ min: 0 }).toInt(),
];

export const listPartsValidator = [
  query('shopId').optional().isUUID(),
  query('categoryId').optional().isUUID(),
  query('brandId').optional().isUUID(),
  query('search').optional().isString().trim().isLength({ max: 200 }),
  query('minPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('includeInactive').optional().isBoolean().toBoolean(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const idParamValidator = [param('id').isUUID()];
