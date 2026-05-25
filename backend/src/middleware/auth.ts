import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { UserRole } from '@prisma/client';
import { verifyAccessToken, type JwtPayload } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../config/db';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token.trim();
}

/**
 * Require a valid JWT. Populates req.user.
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized('Missing Bearer token'));

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optional auth — populates req.user if a valid token is present, else continues.
 * Useful for public endpoints that personalize responses for logged-in users.
 */
export const authenticateOptional: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.user = verifyAccessToken(token);
  } catch {
    // ignore — treat as anonymous
  }
  next();
};

/**
 * Require the authenticated user to have one of the given roles.
 */
export function authorize(...allowed: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized('Authentication required'));
    if (!allowed.includes(req.user.role as UserRole)) {
      return next(ApiError.forbidden('Insufficient role for this resource'));
    }
    next();
  };
}

/**
 * For shop-scoped routes: ensure the JWT is for an APPROVED shop owner. Loads
 * the shop and attaches it to res.locals.shop for the route handler.
 */
export const requireApprovedShop: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    if (req.user.role !== 'SHOP') throw ApiError.forbidden('Shop role required');

    const shop = await prisma.shop.findUnique({ where: { ownerUserId: req.user.sub } });
    if (!shop) throw ApiError.forbidden('No shop is registered for this account');
    if (shop.status !== 'APPROVED') {
      throw ApiError.forbidden(`Shop is ${shop.status.toLowerCase()} and cannot perform this action`);
    }

    res.locals.shop = shop;
    next();
  } catch (err) {
    next(err);
  }
};
