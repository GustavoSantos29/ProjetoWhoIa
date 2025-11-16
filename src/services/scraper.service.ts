// src/services/scraper.service.ts
import { chromium, Browser, Page, BrowserContext } from 'playwright';

export interface IScrapedData {
  source: string;
  url: string;
  author: string;
  content: string;
}

export class ScraperService {
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;
    // O Bing funciona bem no modo 'headless: true'
    this.browser = await chromium.launch({
      headless: true, 
      timeout: 60000,
    });
    return this.browser;
  }

  async scrapePage(urlToScrape: string): Promise<IScrapedData[]> {
    let context: BrowserContext | null = null;
    const results: IScrapedData[] = [];

    try {
      const browser = await this.getBrowser();
      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      });
      const page = await context.newPage();

      await page.goto(urlToScrape, { waitUntil: 'domcontentloaded' });

      // O Bing não tem o pop-up de cookies chato do Google,
      // então podemos ir direto para os resultados.

      // ⭐ 1. MUDANÇA: Seletor de resultados do Bing
      const resultBlockSelector = 'li.b_algo'; 
      
      // Vamos dar 10 segundos para o Bing carregar
    await page.waitForSelector(resultBlockSelector, { state: 'attached', timeout: 10000 });
      
      const resultBlocks = await page.locator(resultBlockSelector).all();

      for (const block of resultBlocks) {
        // 'evaluate' roda no navegador
        const data = await block.evaluate((el) => {
          
          // ⭐ 2. MUDANÇA: Seletores de Título e Snippet do Bing
          
          const linkElement = el.querySelector('a');
          const url = linkElement ? linkElement.href : '';
          
          const titleElement = el.querySelector('h2');
          const title = titleElement ? titleElement.textContent : '';
          
          // O snippet do Bing fica dentro de 'div.b_caption p'
          const snippetElement = el.querySelector('.b_caption p'); 
          const snippet = snippetElement ? snippetElement.textContent : '';
          
          // Filtra propagandas da Microsoft e resultados vazios
          if (!url || !title || !snippet || url.startsWith('http://go.microsoft.com')) {
            return null;
          }
          return { url, title, snippet };
        });

        // Formata os dados
        if (data) {
          results.push({
            source: new URL(data.url).hostname,
            url: data.url,
            author: new URL(data.url).hostname,
            content: `${data.title}. ${data.snippet}`,
          });
        }
      }

      return results;

    } catch (error: any) {
      console.error(`Erro no scraping da URL ${urlToScrape}:`, error.message);
      return [];
    } finally {
      if (context) {
        await context.close();
      }
    }
  }
}