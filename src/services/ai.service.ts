// src/services/ai.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

// Interface para o formato de resposta que esperamos da IA
export interface IAnalysisResult {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  topics: string[];
  summary: string;
}

export class AIService {
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    // Inicializa o cliente com a chave da API do .env
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chave da API do Gemini (GEMINI_API_KEY) não encontrada no .env');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Analisa um texto e retorna sentimento, tópicos e resumo.
   */
  async analyzeText(text: string): Promise<IAnalysisResult | null> {
    
    // Pega o modelo (flash é rápido e eficiente para isso)
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // O prompt é a parte mais importante.
    // Damos a ele o texto e o formato exato que queremos de volta.
    const prompt = `
      Analise o seguinte feedback de cliente.
      Responda APENAS com um objeto JSON válido (sem markdown '\`\`\`json' ou qualquer outro texto).
      O JSON deve ter o seguinte formato:
      {
        "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
        "topics": string[] (array de 1 a 3 tópicos/palavras-chave em português. Ex: ["entrega", "atendimento"]),
        "summary": string (um resumo curto do feedback em uma frase)
      }

      Feedback para analisar: "${text}"
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      
      // 1. Pega o texto da resposta
      let jsonText = response.text();
      
      // 2. ⭐ A CORREÇÃO IMPORTANTE ESTÁ AQUI ⭐
      // Limpa o markdown (```json) e outros lixos que a IA pode mandar
      jsonText = jsonText
        .replace(/```json/g, '') // Remove o marcador de início
        .replace(/```/g, '')       // Remove o marcador de fim
        .trim();                   // Remove espaços em branco

      // 3. Tenta fazer o parse do JSON limpo
      const parsedResult: IAnalysisResult = JSON.parse(jsonText);
      
      // 4. Validação rápida do schema
      if (!parsedResult.sentiment || !parsedResult.topics || !parsedResult.summary) {
        console.error('Resposta da IA com formato inválido (faltando chaves):', jsonText);
        throw new Error('Formato de resposta da IA inválido.');
      }
      
      return parsedResult;

    } catch (error: any) {
      console.error(`Erro ao analisar texto. Erro: ${error.message}`);
      return null;
    }
  }

  
}