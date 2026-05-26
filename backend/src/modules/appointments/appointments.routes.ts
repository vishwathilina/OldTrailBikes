import { Router, type RequestHandler } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { multerUpload } from '../../services/cloudinary.service';
import {
  create,
  getOne,
  historyByPlate,
  listForAdmin,
  listMine,
  transition,
  update,
  uploadPhotos,
} from './appointments.controller';
import {
  createAppointmentValidator,
  idParamValidator,
  listAppointmentsValidator,
  myAppointmentsValidator,
  plateParamValidator,
  transitionStatusValidator,
  updateAppointmentValidator,
} from './appointments.validator';

export const appointmentsRouter = Router();

function multerMiddleware(req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  multerUpload.array('photos', 12)(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}

appointmentsRouter.use(authenticate);

// ─── Customer endpoints ──────────────────────────────────────────────────────
//
// IMPORTANT: routes with concrete prefixes (`/mine`, `/by-plate/...`) MUST be
// declared before the parametric `/:id` route; otherwise Express matches
// `/:id = "mine"` and we end up validating "mine" as a UUID.

appointmentsRouter.post('/', validate(createAppointmentValidator), create);
appointmentsRouter.get('/mine', validate(myAppointmentsValidator), listMine);
appointmentsRouter.get('/by-plate/:plate', validate(plateParamValidator), historyByPlate);

// ─── Admin endpoints ─────────────────────────────────────────────────────────

appointmentsRouter.get('/', authorize('ADMIN'), validate(listAppointmentsValidator), listForAdmin);
appointmentsRouter.patch(
  '/:id/status',
  authorize('ADMIN'),
  validate(transitionStatusValidator),
  transition,
);
appointmentsRouter.patch(
  '/:id',
  authorize('ADMIN'),
  validate(updateAppointmentValidator),
  update,
);

appointmentsRouter.post('/:id/photos', validate(idParamValidator), multerMiddleware, uploadPhotos);

// ─── Generic by-id (must come last) ──────────────────────────────────────────

appointmentsRouter.get('/:id', validate(idParamValidator), getOne);
