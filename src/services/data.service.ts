// src/services/data.service.ts
import { prisma } from '../lib/prisma';
import { AIService, IAnalysisResult } from './ai.service';
import { CompanyService } from './company.service';
// 1. Importamos o ScraperService
import { ScraperService, IScrapedData } from './scraper.service'; 

export class DataService {
  private aiService: AIService;
  private companyService: CompanyService;
  private scraperService: ScraperService; // 2. Declaramos o scraper

  constructor() {
    this.aiService = new AIService();
    this.companyService = new CompanyService();
    this.scraperService = new ScraperService(); // 3. Instanciamos o scraper
  }

  async refreshDataForCompany(companyId: string) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new Error('Empresa não encontrada.');
    }

    // --- 1. COLETA DE DADOS (COM SCRAPER) ---
    console.log(`Iniciando scraping para: ${company.name}`);

    // Define a URL de busca. Vamos buscar no Google por reclamações
const scrapeUrl = `https://www.bing.com/search?q=reclamação+${encodeURI(company.name)}`;    
    // Chama o serviço de scraping
    const allRawData = await this.scraperService.scrapePage(scrapeUrl);

    if (allRawData.length === 0) {
      console.log('Nenhum dado encontrado no scraping.');
      return { totalFound: 0, totalSaved: 0 };
    }
    
    console.log(`Coleta finalizada. ${allRawData.length} itens encontrados.`);
    
    // --- 2. ANÁLISE E SALVAMENTO (Esta parte não muda) ---
    let successCount = 0;
    for (const data of allRawData) {
      // Chama a IA para cada item
      const analysis = await this.aiService.analyzeText(data.content);

      if (analysis) {
        // Salva no banco
        await this.saveDataPoint(companyId, data, analysis);
        successCount++;
      }
    }

    console.log(`Processo finalizado. ${successCount} pontos de dados salvos.`);
    return {
      totalFound: allRawData.length,
      totalSaved: successCount,
    };
  }

  /**
   * Salva um DataPoint analisado no banco de dados.
   * (Este método não muda)
   */
  private async saveDataPoint(companyId: string, data: IScrapedData, analysis: IAnalysisResult) {
    return prisma.dataPoint.create({
      data: {
        companyId: companyId,
        source: data.source,
        content: data.content,
        author: data.author,
        originalUrl: data.url,
        sentiment: analysis.sentiment,
        topics: analysis.topics,
      },
    });
  }

  // O método 'fetchFromReclameAquiAPI' foi removido.
}