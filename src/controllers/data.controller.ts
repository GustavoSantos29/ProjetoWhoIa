// src/controllers/data.controller.ts
import { Request, Response } from 'express';
import { DataService } from '../services/data.service';
import { CompanyService } from '../services/company.service'; 

const dataService = new DataService();
const companyService = new CompanyService(); 

export class DataController {
  
  /**
   * Rota para disparar a atualização de dados da empresa do usuário
   */
  async refreshData(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      // 1. Descobre qual empresa o usuário logado gerencia
      const company = await companyService.getByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ error: 'Nenhuma empresa associada a este usuário.' });
      }

      // 2. Dispara a tarefa de atualização (agora com scraper)
      console.log(`Controlador: Disparando atualização para ${company.name}...`);
      const result = await dataService.refreshDataForCompany(company.id);
      
      return res.status(200).json(result);

    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno ao atualizar dados.' });
    }
  }
}