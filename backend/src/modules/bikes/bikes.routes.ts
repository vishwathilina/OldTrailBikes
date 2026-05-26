import { Router, type RequestHandler } from 'express';
import { authenticate, authenticateOptional, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { multerUpload } from '../../services/cloudinary.service';
import {
  create,
  deletePhoto,
  getOne,
  list,
  remove,
  unverify,
  update,
  updateStatus,
  uploadPhotos,
  verify,
} from './bikes.controller';
import {
  createListingValidator,
  idParamValidator,
  listListingsValidator,
  updateListingValidator,
  updateStatusValidator,
  verifyBikeValidator,
} from './bikes.validator';

export const bikesRouter = Router();

// Wrap multer to forward its errors into the Express error chain
function multerMiddleware(req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  multerUpload.array('photos', 12)(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}

// ─── Public (optional auth for personalisation) ───────────────────────────────
bikesRouter.get('/', authenticateOptional, validate(listListingsValidator), list);
bikesRouter.get('/:id', authenticateOptional, validate(idParamValidator), getOne);

// ─── Authenticated seller ─────────────────────────────────────────────────────
bikesRouter.post('/', authenticate, validate(createListingValidator), create);
bikesRouter.patch('/:id', authenticate, validate(updateListingValidator), update);
bikesRouter.patch('/:id/status', authenticate, validate(updateStatusValidator), updateStatus);
bikesRouter.delete('/:id', authenticate, validate(idParamValidator), remove);

// Photo management
bikesRouter.post('/:id/photos', authenticate, validate(idParamValidator), multerMiddleware, uploadPhotos);
bikesRouter.delete('/:id/photos', authenticate, validate(idParamValidator), deletePhoto);

// ─── Admin — mechanic verification ───────────────────────────────────────────
bikesRouter.post('/:id/verify', authenticate, authorize('ADMIN'), validate(verifyBikeValidator), verify);
bikesRouter.delete('/:id/verify', authenticate, authorize('ADMIN'), validate(idParamValidator), unverify);
