import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { validationResult, type ValidationChain } from 'express-validator';
import { ApiError } from '../utils/ApiError';

/**
 * Compose express-validator chains and convert any errors into a 422 ApiError
 * with structured field-level details.
 *
 * Usage:
 *   router.post(
 *     '/login',
 *     validate([
 *       body('email').isEmail(),
 *       body('password').isString().isLength({ min: 8 }),
 *     ]),
 *     loginController,
 *   );
 */
export function validate(chains: ValidationChain[]): RequestHandler[] {
  return [
    ...chains.map((chain) => chain as unknown as RequestHandler),
    (req: Request, _res: Response, next: NextFunction) => {
      const result = validationResult(req);
      if (result.isEmpty()) return next();

      const details = result.array({ onlyFirstError: true }).map((e) => ({
        field: 'path' in e ? e.path : undefined,
        message: e.msg,
        value: 'value' in e ? e.value : undefined,
      }));
      next(ApiError.unprocessable('Validation failed', details));
    },
  ];
}
