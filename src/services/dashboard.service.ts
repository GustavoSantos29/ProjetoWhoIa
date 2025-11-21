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

  /**
   * Busca o feed de dados paginado.
   * @param userId - ID do usuário
   * @param page - Número da página (começa em 1)
   * @param limit - Quantos itens por página
   * @param sentimentFilter - (Opcional) Filtrar por POSITIVE, NEGATIVE, etc.
   */
  async getFeed(userId: string, page: number = 1, limit: number = 10, sentimentFilter?: Sentiment) {
    // 1. Verifica empresa
    const company = await this.companyService.getByUserId(userId);
    if (!company) {
      throw new Error('Nenhuma empresa associada a este usuário.');
    }

    // 2. Calcula o "pulo" (offset) para a paginação
    const skip = (page - 1) * limit;

    // 3. Monta o filtro (where)
    const whereClause = {
      companyId: company.id,
      ...(sentimentFilter ? { sentiment: sentimentFilter } : {}), // Se tiver filtro, adiciona
    };

    // 4. Executa duas queries em paralelo (performance)
    const [data, total] = await prisma.$transaction([
      // Query A: Busca os dados
      prisma.dataPoint.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }, // Mais recentes primeiro
        skip: skip,
        take: limit,
      }),
      // Query B: Conta o total (para saber quantas páginas tem)
      prisma.dataPoint.count({
        where: whereClause,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        limit,
      },
    };
  }
}
