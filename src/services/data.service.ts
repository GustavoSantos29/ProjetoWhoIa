import { prisma } from '../lib/prisma';
import { CompanyService } from './company.service';
import { SearchService, AnalysisResult, FeedbackItem } from './search.service'; // Importar FeedbackItem
import { Sentiment } from '@prisma/client';

export class DataService {
  private companyService: CompanyService;
  private searchService: SearchService;

  constructor() {
    this.companyService = new CompanyService();
    this.searchService = new SearchService();
  }

  async refreshDataForCompany(companyId: string) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new Error('Empresa não encontrada.');

    console.log(`Iniciando Busca Inteligente para: ${company.name}`);

    // 1. Busca os dados (agora vem como lista de items)
    const result: AnalysisResult = await this.searchService.fetchCompanyReputation(company.name);

    console.log(`Análise concluída. Sentimento: ${result.overallSentiment}`);
    console.log(`Itens encontrados: ${result.items.length}`);

    let savedCount = 0;
    const promises = [];
    
    // Pega uma fonte aleatória para usar (já que os items podem não ter URL individual confiável vindo do JSON)
    const randomSource = result.sources.length > 0 ? result.sources[0].uri : 'Google Search';

    // 2. Processa a lista de ITENS
    for (const item of result.items) {
      // Define sentimento baseado no tipo
      const itemSentiment = item.type === 'PRAISE' ? Sentiment.POSITIVE : Sentiment.NEGATIVE;

      promises.push(prisma.dataPoint.create({
        data: {
          companyId: companyId,
          source: item.source || 'Google Search',
          originalUrl: randomSource,
          author: 'Anônimo',
          content: item.text, // Texto real
          sentiment: itemSentiment,
          topics: [], // Opcional: A IA nessa versão não categorizou tópicos, podemos deixar vazio ou pedir no futuro
          createdAt: new Date(),
        }
      }));
      savedCount++;
    }

    // Executa tudo de uma vez
    if (promises.length > 0) {
      await prisma.$transaction(promises);
    }

    // 3. Salva o Relatório (Textos de Inteligência)
    await prisma.report.create({
      data: {
        companyId: companyId,
        periodDays: 30,
        summary: {
          totalCount: savedCount,
          sentiment: result.overallSentiment,
          // Contagem simples baseada no tipo
          complaintsCount: result.items.filter(i => i.type === 'COMPLAINT').length,
          praisesCount: result.items.filter(i => i.type === 'PRAISE').length
        },
        analysis: result.analysisText,
        suggestion: result.suggestionText,
      }
    });

    return {
      totalSaved: savedCount,
      overallSentiment: result.overallSentiment,
      analysis: result.analysisText,
      suggestion: result.suggestionText
    };
  }
}