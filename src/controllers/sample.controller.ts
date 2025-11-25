import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';

const searchService = new SearchService();

export class SampleController {

  /**
   * Rota Pública: Retorna 10 reviews de amostra
   */
  async getSample(req: Request, res: Response) {
    try {
      // Recebe o nome da empresa pela URL (ex: /sample?company=Nubank)
      const { company } = req.query;

      if (!company || typeof company !== 'string') {
        return res.status(400).json({ error: 'O parâmetro "company" é obrigatório.' });
      }

      console.log(`Gerando amostra grátis para: ${company}`);
      
      const reviews = await searchService.getFreeSample(company);

      return res.status(200).json({
        company: company,
        total: reviews.length,
        data: reviews
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar amostra.' });
    }
  }
}