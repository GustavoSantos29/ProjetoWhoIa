// src/controllers/dashboard.controller.ts
import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

const dashboardService = new DashboardService();

export class DashboardController {

  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      // 1. Pega o filtro de período da URL (ex: /dashboard/stats?period=30)
      // O '|| 30' define 30 dias como padrão
      const periodDays = parseInt(req.query.period as string) || 30;

      // 2. Chama o serviço
      const stats = await dashboardService.getDashboardStats(userId, periodDays);

      return res.status(200).json(stats);

    } catch (error: any) {
      if (error.message === 'Nenhuma empresa associada a este usuário.') {
        return res.status(404).json({ error: error.message });
      }
      console.error(error);
      return res.status(500).json({ error: 'Erro interno ao buscar estatísticas.' });
    }
  }

  /**
   * Rota para buscar os tópicos em alta
   */
  async getTopics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      // Pega o filtro de período da URL (ex: /dashboard/topics?period=30)
      const periodDays = parseInt(req.query.period as string) || 30;

      // Chama o novo serviço
      const topics = await dashboardService.getTopTopics(userId, periodDays);

      return res.status(200).json(topics);

    } catch (error: any) {
      if (error.message === 'Nenhuma empresa associada a este usuário.') {
        return res.status(404).json({ error: error.message });
      }
      console.error(error);
      return res.status(500).json({ error: 'Erro interno ao buscar tópicos.' });
    }
  }
}