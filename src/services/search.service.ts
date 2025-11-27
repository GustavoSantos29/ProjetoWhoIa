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

  overallSentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
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
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
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
      ATENÇÃO: Você NÃO é um jornalista. Você é um EXTRATOR DE CITAÇÕES.
      
      TAREFA:
      Encontre opiniões PESSOAIS (em primeira pessoa) de usuários reais sobre a empresa "${companyName}" no período de "${timePeriod}".
      
      FONTES ALVO: Reclame Aqui, Consumidor.gov, Twitter (X), Comentários do Google Maps, Trustpilot, Reddit.
      
      REGRAS DE EXCLUSÃO (O QUE IGNORAR):
      - IGNORE notícias de jornais ou sites de tecnologia (Ex: "Ubisoft anuncia...", "Ações sobem...").
      - IGNORE relatórios financeiros.
      - IGNORE artigos escritos por redatores.
      
      REGRAS DE INCLUSÃO (O QUE PEGAR):
      - Pegue apenas textos onde o usuário fala da própria experiência (Ex: "Eu comprei e não chegou", "Odiei o atendimento", "Meu app travou").
      - Tente encontrar entre 10 a 15 itens REAIS e DISTINTOS.

      SAÍDA OBRIGATÓRIA (JSON ÚNICO):
      {
        "items": [
          { 
            "text": "Citação direta do usuário (Ex: 'Fui mal atendido no chat ontem')", 
            "source": "Fonte (Ex: Reclame Aqui)",
            "type": "COMPLAINT" ou "PRAISE"
          }
        ],
        "overallSentiment": "NEGATIVE",
        "analysisText": "Resumo técnico dos problemas relatados pelos usuários (aprox 100 palavras).",
        "suggestionText": "Ação corretiva sugerida para a empresa (aprox 80 palavras)."
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
      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .map((chunk: any) => ({
          uri: chunk.web?.uri || "",
          title: chunk.web?.title || "Fonte Google",
        }))
        .filter((s: any) => s.uri);

      const uniqueSources = Array.from(
        new Map(sources.map((item: any) => [item.uri, item])).values()
      );

      return {
        items: parsedData.items || [],
        overallSentiment: parsedData.overallSentiment || "NEUTRAL",
        analysisText: parsedData.analysisText || "Análise indisponível.",
        suggestionText: parsedData.suggestionText || "Sem sugestões.",
        sources: uniqueSources as any,
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
        model: "gemini-2.5-flash",
        contents: { role: "user", parts: [{ text: prompt }] },
        config: { tools: [{ googleSearch: {} }] },
      });

      let jsonText = response.text || "[]";
      jsonText = jsonText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const reviews = JSON.parse(jsonText);
      return Array.isArray(reviews) ? reviews : [];
    } catch (error) {
      return [];
    }
  }
}
