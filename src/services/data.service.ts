// src/services/data.service.ts
import { prisma } from "../lib/prisma";
import { CompanyService } from "./company.service";
// Importamos o novo serviço
import {
  SearchService,
  AnalysisResult,
  FeedbackCategory,
} from "./search.service";
import { Sentiment } from "@prisma/client";

export class DataService {
  private companyService: CompanyService;
  private searchService: SearchService;

  constructor() {
    this.companyService = new CompanyService();
    this.searchService = new SearchService();
  }

  /**
   * Busca dados usando o Google Search do Gemini e popula o banco.
   */
  async refreshDataForCompany(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new Error("Empresa não encontrada.");
    }

    console.log(`Iniciando Busca Inteligente para: ${company.name}`);

    // 1. Chama o Gemini com Google Search
    const result: AnalysisResult =
      await this.searchService.fetchCompanyReputation(company.name);

    console.log(
      `Análise concluída. Sentimento Geral: ${result.overallSentiment}`
    );
    console.log(
      `Encontrado: ${result.complaints.length} categorias de reclamação e ${result.praises.length} de elogios.`
    );

    let savedCount = 0;

    // 2. Processa RECLAMAÇÕES
    for (const item of result.complaints) {
      await this.createDataPointsFromCategory(
        companyId,
        item,
        Sentiment.NEGATIVE,
        result.sources
      );
      savedCount += item.count;
    }

    // 3. Processa ELOGIOS
    for (const item of result.praises) {
      await this.createDataPointsFromCategory(
        companyId,
        item,
        Sentiment.POSITIVE,
        result.sources
      );
      savedCount += item.count;
    }

    return {
      totalSaved: savedCount,
      overallSentiment: result.overallSentiment,
    };
  }

  /**
   * Método auxiliar que "explode" a categoria em vários DataPoints
   * para que o Dashboard de estatísticas funcione corretamente.
   */
  private async createDataPointsFromCategory(
    companyId: string,
    category: FeedbackCategory,
    sentiment: Sentiment,
    sources: { uri: string }[]
  ) {
    // Para evitar flood no banco em testes, limitamos a 10 itens por categoria no máximo
    // Se a IA disser "100 reclamações", criamos 10 representantes.
    const loopCount = Math.min(category.count, 10);

    // Pega uma fonte aleatória da lista para parecer real
    const randomSource = sources.length > 0 ? sources[0].uri : "Google Search";

    const promises = [];

    for (let i = 0; i < loopCount; i++) {
      promises.push(
        prisma.dataPoint.create({
          data: {
            companyId: companyId,
            source: "Google Search Analysis", // Fonte genérica
            originalUrl: randomSource,
            author: "Anônimo (Agregado por IA)",
            // O conteúdo é o resumo da categoria
            // content: `${category.category}: ${category.summary}`,
            sentiment: sentiment,
            // ⭐ MUDANÇA 1: Usar a categoria como Título
            title: category.category,

            // ⭐ MUDANÇA 2: Limpar o conteúdo (tirar a repetição da categoria)
            content: category.summary,
            // Salvamos a categoria como um tópico
            topics: [category.category],
            createdAt: new Date(), // Poderíamos variar a data se o JSON trouxesse datas
          },
        })
      );
    }

    await prisma.$transaction(promises);
  }
}
