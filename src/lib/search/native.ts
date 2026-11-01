import { JSDOM } from 'jsdom';

export interface NativeSearchResult {
  title: string;
  url: string;
  content?: string;
  img_src?: string;
  thumbnail_src?: string;
  thumbnail?: string;
  author?: string;
  iframe_src?: string;
}

export interface NativeSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function getVQD(query: string): Promise<string | null> {
  try {
    const res = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
    const text = await res.text();
    const vqdMatch = text.match(/vqd=([0-9-]+)/) || text.match(/vqd=['"]([0-9-]+)['"]/);
    return vqdMatch ? vqdMatch[1] : null;
  } catch (err) {
    console.error('Failed to get VQD token:', err);
    return null;
  }
}

function cleanDDGUrl(rawUrl: string): string {
  if (rawUrl.includes('uddg=')) {
    try {
      const parsed = new URL(
        rawUrl.startsWith('//')
          ? 'https:' + rawUrl
          : rawUrl.startsWith('http')
          ? rawUrl
          : `https://duckduckgo.com${rawUrl}`,
      );
      const target = parsed.searchParams.get('uddg');
      if (target) return decodeURIComponent(target);
    } catch {
      // Return raw URL if decode fails
    }
  }
  return rawUrl;
}

async function searchWeb(query: string): Promise<NativeSearchResult[]> {
  try {
    const res = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: new URLSearchParams({ q: query }).toString(),
    });

    if (!res.ok) {
      throw new Error(`DuckDuckGo HTML returned HTTP ${res.status}`);
    }

    const html = await res.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const results: NativeSearchResult[] = [];
    const elements = doc.querySelectorAll('.result');

    elements.forEach((el) => {
      const titleEl = el.querySelector('.result__title a');
      const snippetEl = el.querySelector('.result__snippet');
      if (titleEl) {
        const rawUrl = titleEl.getAttribute('href') || '';
        const cleanUrl = cleanDDGUrl(rawUrl);
        const title = titleEl.textContent?.trim() || '';
        const snippet = snippetEl?.textContent?.trim() || '';

        if (cleanUrl && title) {
          results.push({
            title,
            url: cleanUrl,
            content: snippet,
          });
        }
      }
    });

    return results;
  } catch (err) {
    console.error('Native web search error:', err);
    return [];
  }
}

async function searchImages(query: string): Promise<NativeSearchResult[]> {
  try {
    const vqd = await getVQD(query);
    if (!vqd) return [];

    const res = await fetch(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: 'https://duckduckgo.com/',
        },
      },
    );

    if (!res.ok) return [];

    const data = await res.json();
    const results: NativeSearchResult[] = [];

    (data.results || []).forEach((item: any) => {
      if (item.image && item.title) {
        results.push({
          title: item.title,
          url: item.url || item.image,
          img_src: item.image,
          thumbnail: item.thumbnail || item.image,
          thumbnail_src: item.thumbnail || item.image,
        });
      }
    });

    return results;
  } catch (err) {
    console.error('Native image search error:', err);
    return [];
  }
}

async function searchVideos(query: string): Promise<NativeSearchResult[]> {
  try {
    const vqd = await getVQD(query);
    if (!vqd) return [];

    const res = await fetch(
      `https://duckduckgo.com/v.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: 'https://duckduckgo.com/',
        },
      },
    );

    if (!res.ok) return [];

    const data = await res.json();
    const results: NativeSearchResult[] = [];

    (data.results || []).forEach((item: any) => {
      const thumbnail =
        item.images?.large ||
        item.images?.medium ||
        item.images?.small ||
        '';

      if (item.content && item.title) {
        results.push({
          title: item.title,
          url: item.content,
          thumbnail,
          iframe_src: item.embed_url || '',
          content: item.description || '',
        });
      }
    });

    return results;
  } catch (err) {
    console.error('Native video search error:', err);
    return [];
  }
}

async function searchNews(query: string): Promise<NativeSearchResult[]> {
  try {
    const vqd = await getVQD(query);
    if (vqd) {
      const res = await fetch(
        `https://duckduckgo.com/news.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`,
        {
          headers: {
            'User-Agent': USER_AGENT,
            Referer: 'https://duckduckgo.com/',
          },
        },
      );

      if (res.ok) {
        const data = await res.json();
        const results: NativeSearchResult[] = [];

        (data.results || []).forEach((item: any) => {
          if (item.title && item.url) {
            results.push({
              title: item.title,
              url: item.url,
              content: item.excerpt || '',
              thumbnail: item.image || '',
              author: item.source || '',
            });
          }
        });

        if (results.length > 0) {
          return results;
        }
      }
    }
  } catch (err) {
    console.error('Native news search error:', err);
  }

  return await searchWeb(query);
}

export const nativeSearch = async (
  query: string,
  opts?: NativeSearchOptions,
): Promise<{ results: NativeSearchResult[]; suggestions: string[] }> => {
  const categories = opts?.categories || [];
  const engines = opts?.engines || [];

  let results: NativeSearchResult[] = [];

  if (categories.includes('images') || engines.some((e) => e.includes('images'))) {
    results = await searchImages(query);
  } else if (
    categories.includes('videos') ||
    engines.some((e) => e.includes('youtube') || e.includes('videos'))
  ) {
    results = await searchVideos(query);
  } else if (
    categories.includes('news') ||
    engines.some((e) => e.includes('news'))
  ) {
    results = await searchNews(query);
  } else {
    results = await searchWeb(query);
  }

  return {
    results,
    suggestions: [],
  };
};
