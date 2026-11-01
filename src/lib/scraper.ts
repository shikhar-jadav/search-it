import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

class Scraper {
  static async scrape(
    url: string,
  ): Promise<{ content: string; title: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP status ${res.status}`);
      }

      const html = await res.text();
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      const title = dom.window.document.title || article?.title || 'Web Page';

      const text = article?.textContent?.trim() || dom.window.document.body?.textContent?.trim() || '';

      return {
        title,
        content: `# ${title} - ${url}\n\n${text.slice(0, 8000)}`,
      };
    } catch (err: any) {
      console.warn(`Scrape error on ${url}:`, err.message || err);
      return {
        title: 'Failed to scrape',
        content: `# ${url}\n\nCould not fetch full content.`,
      };
    }
  }
}

export default Scraper;
