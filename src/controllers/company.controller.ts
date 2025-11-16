// src/controllers/company.controller.ts
import { Request, Response } from "express";
import { CompanyService } from "../services/company.service";

const companyService = new CompanyService();

export class CompanyController {
  //Rota para criar uma nova empresa
  async createCompany(req: Request, res: Response) {
    try {
      const { name } = req.body;
      const userId = req.user?.id; // O 'req.user' vem do authMiddleware

      if (!name) {
        return res
          .status(400)
          .json({ error: "O nome da empresa é obrigatório." });
      }

      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado." });
      }

      const newCompany = await companyService.create(name, userId);

      return res.status(201).json(newCompany);
    } catch (error: any) {
      if (error.message === "Este usuário já está associado a uma empresa.") {
        return res.status(409).json({ error: error.message }); // 409 Conflict
      }
      console.error(error);
      return res.status(500).json({ error: "Erro interno ao criar empresa." });
    }
  }

  //Rota para buscar a empresa do usuário logado
  async getMyCompany(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado." });
      }

      const company = await companyService.getByUserId(userId);

      if (!company) {
        return res
          .status(404)
          .json({ error: "Nenhuma empresa associada a este usuário." });
      }

      return res.status(200).json(company);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno ao buscar empresa." });
    }
  }
}
