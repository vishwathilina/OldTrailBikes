import { Router } from 'express';
import { authenticate, authorize, requireApprovedShop } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { create, getOne, listAll, listMine, shopSales } from './orders.controller';
import { createOrderValidator, idParamValidator, listOrdersValidator } from './orders.validator';

export const ordersRouter = Router();

ordersRouter.use(authenticate);

// Concrete prefix routes BEFORE /:id
ordersRouter.post('/', validate(createOrderValidator), create);
ordersRouter.get('/mine', validate(listOrdersValidator), listMine);
ordersRouter.get('/shop/sales', requireApprovedShop, validate(listOrdersValidator), shopSales);
ordersRouter.get('/', authorize('ADMIN'), validate(listOrdersValidator), listAll);
ordersRouter.get('/:id', validate(idParamValidator), getOne);
