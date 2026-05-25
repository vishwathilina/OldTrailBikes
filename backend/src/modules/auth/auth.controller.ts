import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import {
  registerUser,
  loginUser,
  refreshSession,
  getCurrentUser,
  type RegisterInput,
  type LoginInput,
} from './auth.service';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const payload = await registerUser(req.body as RegisterInput);
  res.status(201).json(payload);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const payload = await loginUser(req.body as LoginInput);
  res.json(payload);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string };
  const tokens = await refreshSession(refreshToken);
  res.json({ tokens });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await getCurrentUser(req.user.sub);
  res.json({ user });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  // Stateless JWT — clients discard tokens. Provided for API symmetry; can be
  // upgraded to a Redis-backed token blocklist later.
  res.json({ ok: true });
});
