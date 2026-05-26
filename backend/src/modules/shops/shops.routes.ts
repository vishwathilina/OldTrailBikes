import { Router } from 'express';
import { authenticate, authorize, requireApprovedShop } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  applyValidator,
  commissionValidator,
  idParamValidator,
  listShopsValidator,
  slugParamValidator,
  updateShopValidator,
} from './shops.validator';
import {
  approve,
  apply,
  dashboard,
  getBySlug,
  getMe,
  list,
  listPending,
  suspend,
  updateCommission,
  updateMe,
} from './shops.controller';

export const shopsRouter = Router();

// ─── Public ──────────────────────────────────────────────────────────────────
// NOTE: concrete prefixes must come before /:slug to avoid mismatches
shopsRouter.get('/', validate(listShopsValidator), list);
shopsRouter.post('/apply', authenticate, validate(applyValidator), apply);
shopsRouter.get('/me', authenticate, authorize('SHOP'), getMe);
shopsRouter.patch('/me', authenticate, requireApprovedShop, validate(updateShopValidator), updateMe);
shopsRouter.get('/me/dashboard', authenticate, requireApprovedShop, dashboard);

// ─── Admin ────────────────────────────────────────────────────────────────────
shopsRouter.get('/admin/pending', authenticate, authorize('ADMIN'), listPending);
shopsRouter.post('/:id/approve', authenticate, authorize('ADMIN'), validate(idParamValidator), approve);
shopsRouter.post('/:id/suspend', authenticate, authorize('ADMIN'), validate(idParamValidator), suspend);
shopsRouter.patch('/:id/commission', authenticate, authorize('ADMIN'), validate(commissionValidator), updateCommission);

// ─── Public slug lookup (last, to avoid swallowing the fixed routes above) ───
shopsRouter.get('/:slug', validate(slugParamValidator), getBySlug);
