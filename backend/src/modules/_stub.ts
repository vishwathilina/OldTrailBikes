import type { Request, Response } from 'express';

/**
 * Helper to register a "Not Implemented" handler for a domain route that will
 * be filled in during phase 2. Keeps the route surface visible and self-
 * documenting while we build out modules incrementally.
 */
export function notImplemented(name: string) {
  return (_req: Request, res: Response) => {
    res.status(501).json({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: `${name} is not implemented yet`,
      },
    });
  };
}
