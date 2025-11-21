// src/routes/dashboard.routes.ts
import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';


const dashboardController = new DashboardController();
const dashboardRouter = Router();

// Protege todas as rotas do dashboard
dashboardRouter.use(authMiddleware);

// GET /dashboard/stats?period=30
dashboardRouter.get('/stats', dashboardController.getStats);

// GET /dashboard/topics?period=30
dashboardRouter.get('/topics', dashboardController.getTopics);

// GET /dashboard/feed ( essa rota pode conter paginação "feed?page=1&limit=5" ou filtro "feed?sentiment=NEGATIVE")
dashboardRouter.get('/feed', dashboardController.getFeed);

export { dashboardRouter };