import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { loginValidator, refreshValidator, registerValidator } from './auth.validator';
import { login, logout, me, refresh, register } from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate(registerValidator), register);
authRouter.post('/login', authLimiter, validate(loginValidator), login);
authRouter.post('/refresh', authLimiter, validate(refreshValidator), refresh);
authRouter.post('/logout', authenticate, logout);
authRouter.get('/me', authenticate, me);
