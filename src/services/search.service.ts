// src/services/search.service.ts
import { GoogleGenAI } from "@google/genai";

// Interface para um item individual (Reclamação ou Elogio real)
export interface FeedbackItem {
  text: string;
  source: string;
  type: "COMPLAINT" | "PRAISE";
  date?: string;
}

// Interface do Resultado da Análise
export interface AnalysisResult {
  // AQUI MUDOU: Em vez de categorias agrupadas, temos uma lista de itens reais
  items: FeedbackItem[]; 
  
  overallSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  sources: { uri: string; title: string }[];
  
  // Mantemos os campos de inteligência que você pediu
  analysisText: string;
  suggestionText: string;
}

// Interface simplificada só para a amostra grátis
export interface FreeSampleReview {
  source: string;
  author: string;
  content: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

const filterMap: { [key: string]: string } = {
  all_time: "todos os tempos",
  last_6_months: "últimos 6 meses",
  last_30_days: "últimos 30 dias",
  last_7_days: "última semana",
};

export class SearchService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");
    this.ai = new GoogleGenAI({ apiKey: apiKey });
  }

  async fetchCompanyReputation(
    companyName: string,
    filter: string = "last_30_days"
  ): Promise<AnalysisResult> {
    const timePeriod = filterMap[filter] || "últimos 30 dias";

    const prompt = `
      Você é um especialista em reputação corporativa.
      
      TAREFA:
      Pesquise no Google sobre a empresa "${companyName}" no período de "${timePeriod}".
      Foco em: Reclame Aqui, redes sociais e reviews.
      
      SAÍDA OBRIGATÓRIA (JSON ÚNICO):
      Retorne APENAS um objeto JSON válido contendo:
      1. Uma lista de itens reais (reclamações ou elogios) encontrados (tente achar entre 10 a 20 itens).
      2. Um sentimento geral.
      3. Um texto de análise de erros/acertos (aprox 100 palavras).
      4. Um texto de sugestão estratégica (aprox 80 palavras).

      ESTRUTURA DO JSON:
      {
        "items": [
          { 
            "text": "Texto original da reclamação...", 
            "source": "Fonte (ex: Reclame Aqui)",
            "type": "COMPLAINT" (ou "PRAISE")
          }
        ],
        "overallSentiment": "NEGATIVE",
        "analysisText": "Resumo dos erros e acertos...",
        "suggestionText": "O WhoIA sugere..."
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash", // Usando 1.5-pro (mais estável que 2.5/experimental)
        contents: { role: "user", parts: [{ text: prompt }] },
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      // 1. Pega o texto bruto
      const rawText = response.text || "{}";

      // 2. Limpeza Cirúrgica de JSON
      let jsonClean = rawText;
      const firstBrace = rawText.indexOf("{");
      const lastBrace = rawText.lastIndexOf("}");

      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonClean = rawText.substring(firstBrace, lastBrace + 1);
      }

      const parsedData = JSON.parse(jsonClean);

      // 3. Extração de Fontes (Grounding)
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .map((chunk: any) => ({
          uri: chunk.web?.uri || '',
          title: chunk.web?.title || 'Fonte Google'
        }))
        .filter((s: any) => s.uri);
      
      const uniqueSources = Array.from(new Map(sources.map((item: any) => [item.uri, item])).values());

      return {
        items: parsedData.items || [],
        overallSentiment: parsedData.overallSentiment || "NEUTRAL",
        analysisText: parsedData.analysisText || "Análise indisponível.",
        suggestionText: parsedData.suggestionText || "Sem sugestões.",
        sources: uniqueSources as any
      };

    } catch (error: any) {
      console.error("Erro na busca com Gemini:", error.message);
      throw new Error("Falha ao buscar reputação.");
    }
  }

  // ... (método getFreeSample continua igual, sem alterações) ...
  async getFreeSample(companyName: string): Promise<FreeSampleReview[]> {
    const prompt = `
      Atue como um motor de busca de reputação.
      Encontre exatamente 10 avaliações ou reclamações recentes em português e relevantes sobre a empresa "${companyName}".

      SAÍDA OBRIGATÓRIA:
      Retorne APENAS um array JSON válido.
      [
        {
          "source": "Fonte",
          "author": "Nome",
          "content": "Texto",
          "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL"
        }
      ]
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { role: 'user', parts: [{ text: prompt }] },
        config: { tools: [{ googleSearch: {} }] },
      });

      let jsonText = response.text || "[]";
      jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

      const reviews = JSON.parse(jsonText);
      return Array.isArray(reviews) ? reviews : [];
    } catch (error) {
      return [];
    }
  }
}