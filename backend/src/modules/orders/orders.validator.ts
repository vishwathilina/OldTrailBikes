import { body, param, query } from 'express-validator';

export const createOrderValidator = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('items must be a non-empty array'),
  body('items.*.partId').isUUID().withMessage('Each item.partId must be a UUID'),
  body('items.*.quantity').isInt({ min: 1 }).toInt().withMessage('Each item.quantity must be >= 1'),
  body('shippingAddress').optional({ values: 'null' }).isObject(),
  body('shippingAddress.line1').optional().isString().trim().isLength({ max: 200 }),
  body('shippingAddress.city').optional().isString().trim().isLength({ max: 100 }),
  body('shippingAddress.province').optional().isString().trim().isLength({ max: 100 }),
  body('shippingAddress.postalCode').optional().isString().trim().isLength({ max: 20 }),
];

export const listOrdersValidator = [
  query('status').optional().isIn(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'FULFILLED', 'CANCELLED']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const idParamValidator = [param('id').isUUID()];
