import { Router, type RequestHandler } from 'express';
import { authenticate, requireApprovedShop } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { multerUpload } from '../../services/cloudinary.service';
import {
  categories,
  create,
  deletePhoto,
  getOne,
  list,
  softDelete,
  update,
  uploadPhotos,
} from './parts.controller';
import {
  createPartValidator,
  idParamValidator,
  listPartsValidator,
  updatePartValidator,
} from './parts.validator';

export const partsRouter = Router();

function multerMiddleware(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2],
) {
  multerUpload.array('photos', 12)(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}

// ─── Public storefront ────────────────────────────────────────────────────────
// NOTE: /categories must precede /:id to avoid "categories" being matched as UUID
partsRouter.get('/categories', categories);
partsRouter.get('/', validate(listPartsValidator), list);
partsRouter.get('/:id', validate(idParamValidator), getOne);

// ─── Shop owner CRUD ──────────────────────────────────────────────────────────
partsRouter.post('/', authenticate, requireApprovedShop, validate(createPartValidator), create);
partsRouter.patch('/:id', authenticate, requireApprovedShop, validate(updatePartValidator), update);
partsRouter.delete('/:id', authenticate, requireApprovedShop, validate(idParamValidator), softDelete);
partsRouter.post('/:id/photos', authenticate, requireApprovedShop, validate(idParamValidator), multerMiddleware, uploadPhotos);
partsRouter.delete('/:id/photos', authenticate, requireApprovedShop, validate(idParamValidator), deletePhoto);
