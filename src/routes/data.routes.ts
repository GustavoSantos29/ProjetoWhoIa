// src/routes/data.routes.ts
import { Router } from 'express';
import { DataController } from '../controllers/data.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const dataController = new DataController();
const dataRouter = Router();

// Protege todas as rotas de dados
dataRouter.use(authMiddleware);

// Rota POST /data/refresh
dataRouter.post('/refresh', dataController.refreshData);

export { dataRouter };