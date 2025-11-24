// src/services/data.service.ts
import { prisma } from "../lib/prisma";
import { CompanyService } from "./company.service";
import { SearchService, AnalysisResult, FeedbackItem } from "./search.service"; // Importar novas interfaces
import { Sentiment } from "@prisma/client";

export class DataService {
  private companyService: CompanyService;
  private searchService: SearchService;

  constructor() {
    this.companyService = new CompanyService();
    this.searchService = new SearchService();
  }

  async refreshDataForCompany(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new Error("Empresa não encontrada.");

    console.log(`Iniciando Busca Real para: ${company.name}`);

    // 1. Busca os dados reais (sem agrupamento)
    const result: AnalysisResult =
      await this.searchService.fetchCompanyReputation(company.name);

    console.log(`Encontrados ${result.items.length} reviews reais.`);

    let savedCount = 0;

    // 2. Salva cada item real no banco (SEM LOOP DE MULTIPLICAÇÃO)
    for (const item of result.items) {
      // Define sentimento baseado no tipo que a IA retornou
      let sentiment: Sentiment = Sentiment.NEUTRAL;
      if (item.type === "COMPLAINT") sentiment = Sentiment.NEGATIVE;
      if (item.type === "PRAISE") sentiment = Sentiment.POSITIVE;

      // Define título (pegamos os primeiros 40 caracteres ou o texto todo)
      const title =
        item.text.length > 50 ? item.text.substring(0, 47) + "..." : item.text;

      // Salva 1 pra 1
      await prisma.dataPoint.create({
        data: {
          companyId: companyId,
          source: item.source || "Google Search",
          originalUrl: "https://google.com", // A IA nem sempre retorna URL exata pra cada item, usamos genérico ou tentamos extrair
          author: "Usuário da Web",
          title: title,
          content: item.text, // O texto real da reclamação
          sentiment: sentiment,
          topics: [], // Podemos deixar vazio ou pedir pra IA extrair tópicos depois
          createdAt: new Date(),
        },
      });

      savedCount++;
    }

    return {
      totalSaved: savedCount,
      overallSentiment: result.overallSentiment,
    };
  }
}
