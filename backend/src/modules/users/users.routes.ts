import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { notImplemented } from '../_stub';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get('/', authorize('ADMIN'), notImplemented('GET /users (admin list)'));
usersRouter.patch('/me', notImplemented('PATCH /users/me (update profile + language)'));
usersRouter.patch('/me/password', notImplemented('PATCH /users/me/password'));
usersRouter.patch('/:id/status', authorize('ADMIN'), notImplemented('PATCH /users/:id/status (activate/deactivate)'));
