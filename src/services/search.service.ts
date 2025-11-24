// src/services/search.service.ts
import { GoogleGenAI } from "@google/genai";

// Nova interface focada em ITENS individuais, não categorias
export interface FeedbackItem {
  text: string;
  source: string;
  date?: string;
  type: "COMPLAINT" | "PRAISE";
}

export interface AnalysisResult {
  items: FeedbackItem[];
  overallSentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
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
      ATENÇÃO: Você é um robô de extração de dados. Você NÃO conversa. Você apenas cospe JSON.
      
      TAREFA:
      Pesquise no Google sobre a empresa "${companyName}" no período de "${timePeriod}".
      Procure especificamente por títulos de reclamações no Reclame Aqui, tweets, comentários ou reviews reais.
      
      OBJETIVO:
      Extraia o máximo possível de itens individuais e distintos. Tente encontrar entre 15 a 30 itens reais.
      NÃO AGRUPE. NÃO RESUMA. Se encontrar 10 reclamações sobre entrega, liste as 10 separadamente com seus textos originais.

      SAÍDA JSON OBRIGATÓRIA:
      {
        "items": [
          { 
            "text": "Texto real da reclamação ou elogio...", 
            "source": "Nome do site...",
            "type": "COMPLAINT" ou "PRAISE"
          }
        ],
        "overallSentiment": "POSITIVE", "NEGATIVE" ou "NEUTRAL"
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-pro", // Mantido o modelo que você pediu
        contents: { role: "user", parts: [{ text: prompt }] },
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      // 1. Pega o texto bruto (que pode vir com conversa da IA)
      const rawText = response.text || "{}";

      // 2. ⭐ A CORREÇÃO (Pinça Cirúrgica) ⭐
      // Em vez de só limpar markdown, procuramos onde o JSON começa e termina.
      const firstBrace = rawText.indexOf("{");
      const lastBrace = rawText.lastIndexOf("}");

      // Se não achar chaves, significa que a IA não mandou JSON nenhum
      if (firstBrace === -1 || lastBrace === -1) {
        console.warn(
          "A IA não retornou um JSON válido. Resposta bruta:",
          rawText.substring(0, 100)
        );
        // Retornamos vazio para não quebrar o backend
        return { items: [], overallSentiment: "NEUTRAL" };
      }

      // Corta exatamente do primeiro '{' até o último '}'
      const jsonClean = rawText.substring(firstBrace, lastBrace + 1);

      // Agora o parse é seguro
      const parsedData = JSON.parse(jsonClean);

      return {
        items: parsedData.items || [],
        overallSentiment: parsedData.overallSentiment || "NEUTRAL",
      };
    } catch (error: any) {
      console.error("Erro na busca com Gemini:", error.message);
      // Retorna vazio em caso de erro grave para manter o sistema de pé
      return { items: [], overallSentiment: "NEUTRAL" };
    }
  }
}
