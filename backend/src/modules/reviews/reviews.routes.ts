import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { create, forAppointment, forPart, remove, update } from './reviews.controller';
import {
  appointmentParamValidator,
  createReviewValidator,
  idParamValidator,
  partParamValidator,
  updateReviewValidator,
} from './reviews.validator';

export const reviewsRouter = Router();

// Public
reviewsRouter.get('/appointment/:appointmentId', validate(appointmentParamValidator), forAppointment);
reviewsRouter.get('/part/:partId', validate(partParamValidator), forPart);

// Authenticated
reviewsRouter.post('/', authenticate, validate(createReviewValidator), create);
reviewsRouter.patch('/:id', authenticate, validate(updateReviewValidator), update);
reviewsRouter.delete('/:id', authenticate, validate(idParamValidator), remove);
