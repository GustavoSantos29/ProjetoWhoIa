import { Router } from 'express';
import { SampleController } from '../controllers/sample.controller';

const sampleController = new SampleController();
const sampleRouter = Router();

// Rota Pública (Sem Auth Middleware)
// GET /sample?company=NomeDaEmpresa
sampleRouter.get('/', sampleController.getSample);

export { sampleRouter };