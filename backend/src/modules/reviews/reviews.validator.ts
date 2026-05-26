import { body, param } from 'express-validator';

export const createReviewValidator = [
  body('targetType')
    .isIn(['APPOINTMENT', 'PART'])
    .withMessage('targetType must be APPOINTMENT or PART'),
  body('appointmentId')
    .if(body('targetType').equals('APPOINTMENT'))
    .isUUID()
    .withMessage('appointmentId is required for APPOINTMENT reviews'),
  body('partId')
    .if(body('targetType').equals('PART'))
    .isUUID()
    .withMessage('partId is required for PART reviews'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .toInt()
    .withMessage('rating must be an integer from 1 to 5'),
  body('comment').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }),
];

export const updateReviewValidator = [
  param('id').isUUID(),
  body('rating').optional().isInt({ min: 1, max: 5 }).toInt(),
  body('comment').optional({ values: 'null' }).isString().isLength({ max: 2000 }),
];

export const idParamValidator = [param('id').isUUID()];
export const appointmentParamValidator = [param('appointmentId').isUUID()];
export const partParamValidator = [param('partId').isUUID()];
