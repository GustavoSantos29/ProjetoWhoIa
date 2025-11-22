// src/services/search.service.ts
import { GoogleGenAI } from "@google/genai";

export interface FeedbackCategory {
  category: string;
  count: number;
  summary: string;
  dates?: string[];
}

export interface AnalysisResult {
  praises: FeedbackCategory[];
  complaints: FeedbackCategory[];
  overallSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  sources: { uri: string; title: string }[];
}

const filterMap: { [key: string]: string } = {
  all_time: "todos os tempos",
  last_6_months: "últimos 6 meses",
  last_30_days: "últimos 30 dias",
  last_7_days: "última semana"
};

export class SearchService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não configurada.");
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey });
  }

  async fetchCompanyReputation(companyName: string, filter: string = 'last_30_days'): Promise<AnalysisResult> {
    const timePeriod = filterMap[filter] || "últimos 30 dias";

    const prompt = `
      Você é um analista de dados especialista em reputação corporativa.
      
      OBJETIVO:
      Realize uma pesquisa no Google usando a ferramenta disponível sobre a empresa "${companyName}", focando em reclamações (Reclame Aqui) e feedbacks recentes no período de "${timePeriod}".

      SAÍDA OBRIGATÓRIA:
      Retorne APENAS um objeto JSON válido. Não inclua markdown, não inclua explicações antes ou depois. Apenas o JSON cru.
      
      ESTRUTURA DO JSON:
      {
        "praises": [
          { "category": "Resumo curto da categoria", "count": (estimativa numérica), "summary": "Resumo do elogio." }
        ],
        "complaints": [
          { "category": "Resumo curto da categoria", "count": (estimativa numérica), "summary": "Resumo da reclamação.", "dates": ["Mês/Ano"] }
        ],
        "overallSentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE"
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-pro', // Ou 'gemini-1.5-pro-002' se este falhar
        contents: { role: 'user', parts: [{ text: prompt }] },
        config: {
          tools: [{ googleSearch: {} }], // Mantemos a ferramenta de busca
          // responseMimeType: 'application/json', // <--- REMOVIDO (Causava o erro)
        },
      });

      // 1. Pegamos o texto da resposta
      let jsonText = response.text || "{}";
      
      // 2. LIMPEZA MANUAL: Removemos blocos de código markdown (```json ... ```)
      // O modelo costuma mandar isso quando usa ferramentas.
      jsonText = jsonText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      // 3. Parse do JSON
      const parsedData = JSON.parse(jsonText);
      
      // 4. Extração das Fontes (Grounding)
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .map((chunk: any) => ({
          uri: chunk.web?.uri || '',
          title: chunk.web?.title || 'Fonte Google'
        }))
        .filter((s: any) => s.uri);

      // Remove duplicatas
      const uniqueSources = Array.from(new Map(sources.map((item: any) => [item.uri, item])).values());
      
      return {
        praises: parsedData.praises || [],
        complaints: parsedData.complaints || [],
        overallSentiment: parsedData.overallSentiment || 'NEUTRAL',
        sources: uniqueSources as any
      };

    } catch (error) {
      console.error("Erro na busca com Gemini:", error);
      // Dica: Se der erro de JSON parse, verifique o console para ver o que a IA retornou
      throw new Error("Falha ao buscar reputação com IA.");
    }
  }
}