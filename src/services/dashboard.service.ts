// src/services/dashboard.service.ts
import { prisma } from "../lib/prisma";
import { CompanyService } from "./company.service";
import { Sentiment } from "@prisma/client"; // Importa o Enum do Prisma

export class DashboardService {
  private companyService: CompanyService;

  constructor() {
    this.companyService = new CompanyService();
  }

  /**
   * Busca as estatísticas principais do dashboard (KPIs).
   * @param userId - O ID do usuário logado
   * @param periodDays - O período em dias (ex: 30, 90)
   */
  async getDashboardStats(userId: string, periodDays: number = 30) {
    // 1. Encontra a empresa do usuário
    const company = await this.companyService.getByUserId(userId);
    if (!company) {
      throw new Error("Nenhuma empresa associada a este usuário.");
    }

    // 2. Define o filtro de data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // 3. Usa o Prisma para fazer agregações (contagens)

    // Contagem total
    const total = await prisma.dataPoint.count({
      where: {
        companyId: company.id,
        createdAt: { gte: startDate }, // 'gte' = greater than or equal
      },
    });

    // Contagem de Positivos
    const positive = await prisma.dataPoint.count({
      where: {
        companyId: company.id,
        createdAt: { gte: startDate },
        sentiment: Sentiment.POSITIVE, // Usando o Enum
      },
    });

    // Contagem de Negativos
    const negative = await prisma.dataPoint.count({
      where: {
        companyId: company.id,
        createdAt: { gte: startDate },
        sentiment: Sentiment.NEGATIVE,
      },
    });

    // Contagem de Neutros
    const neutral = await prisma.dataPoint.count({
      where: {
        companyId: company.id,
        createdAt: { gte: startDate },
        sentiment: Sentiment.NEUTRAL,
      },
    });

    // 4. Retorna o objeto formatado
    return {
      period: `${periodDays} dias`,
      total,
      positive,
      negative,
      neutral,
    };
  }

  /**
   * Busca os tópicos mais mencionados em um período.
   * @param userId - O ID do usuário logado
   * @param periodDays - O período em dias (ex: 30, 90)
   */
  async getTopTopics(userId: string, periodDays: number = 30) {
    // 1. Encontra a empresa do usuário
    const company = await this.companyService.getByUserId(userId);
    if (!company) {
      throw new Error("Nenhuma empresa associada a este usuário.");
    }

    // 2. Define o filtro de data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // 3. Busca APENAS a coluna de tópicos dos DataPoints
    const dataPoints = await prisma.dataPoint.findMany({
      where: {
        companyId: company.id,
        createdAt: { gte: startDate },
      },
      select: {
        topics: true, // Seleciona apenas a coluna 'topics'
      },
    });

    // 4. Processa os dados no TypeScript
    const topicCounts = new Map<string, number>();

    for (const dp of dataPoints) {
      // O 'topics' vem do Prisma como 'JsonValue'.
      // Precisamos garantir que é um array de strings.
      if (Array.isArray(dp.topics)) {
        const topics = dp.topics as string[];

        for (const topic of topics) {
          // Adiciona +1 ao tópico no nosso Map
          const currentCount = topicCounts.get(topic) || 0;
          topicCounts.set(topic, currentCount + 1);
        }
      }
    }

    // 5. Converte o Map em um objeto para a resposta JSON
    const topicsObject = Object.fromEntries(topicCounts);

    return {
      period: `${periodDays} dias`,
      totalMentions: dataPoints.length,
      topics: topicsObject, // Ex: { "entrega": 10, "atendimento": 5 }
    };
  }
}
