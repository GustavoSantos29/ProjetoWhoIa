// src/routes/company.routes.ts
import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const companyController = new CompanyController();
const companyRouter = Router();

// *IMPORTANT: Todas as rotas neste arquivo vão exigir autenticação.
// Aplica o middleware para todas de uma vez:
companyRouter.use(authMiddleware);


// --- Rotas Protegidas ---

// * Important Os caminho serão '/company/...' por causa do prefixo no index.ts

// Criar uma nova empresa
companyRouter.post('/', companyController.createCompany);

// Buscar a empresa do usuário logado
companyRouter.get('/me', companyController.getMyCompany);

export { companyRouter };