import { getSearxngURL } from './config/serverRegistry';

export interface SearxngSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
  safesearch?: number;
}

export interface SearxngSearchResult {
  title: string;
  url: string;
  img_src?: string;
  thumbnail_src?: string;
  thumbnail?: string;
  content?: string;
  author?: string;
  iframe_src?: string;
}

const DEFAULT_FALLBACK_INSTANCES = [
  'https://sx.xo.st',
  'https://etsi.me',
  'https://search.mectov.my.id',
  'https://searx.perennialte.ch',
];

const fetchWithTimeout = async (
  targetUrl: string,
  timeoutMs: number = 7000,
  extraHeaders?: Record<string, string>,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(extraHeaders || {}),
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const executeQuery = async (
  baseURL: string,
  query: string,
  opts?: SearxngSearchOptions,
): Promise<{ results: SearxngSearchResult[]; suggestions: string[] } | null> => {
  try {
    const cleanBase = baseURL.replace(/\/+$/, '');
    const url = new URL(`${cleanBase}/search?format=json`);
    url.searchParams.append('q', query);

    const extraHeaders: Record<string, string> = {};

    if (opts) {
      Object.keys(opts).forEach((key) => {
        const value = opts[key as keyof SearxngSearchOptions];
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            url.searchParams.append(key, value.join(','));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });

      if (opts.safesearch !== undefined) {
        extraHeaders['Cookie'] = `safesearch=${opts.safesearch}`;
      }
    }

    const res = await fetchWithTimeout(url.toString(), 7000, extraHeaders);

    if (res.status === 429) {
      console.warn(`SearXNG instance ${cleanBase} rate-limited (429).`);
      return null;
    }

    if (!res.ok) {
      console.warn(
        `SearXNG instance ${cleanBase} returned status ${res.status}: ${res.statusText}`,
      );
      return null;
    }

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn(`SearXNG instance ${cleanBase} returned non-JSON response.`);
      return null;
    }

    if (!data || !Array.isArray(data.results)) {
      return null;
    }

    return {
      results: data.results || [],
      suggestions: data.suggestions || [],
    };
  } catch (err: any) {
    console.warn(`Error querying SearXNG at ${baseURL}:`, err.message || err);
    return null;
  }
};

export const searchSearxng = async (
  query: string,
  opts?: SearxngSearchOptions,
): Promise<{ results: SearxngSearchResult[]; suggestions: string[] }> => {
  const configuredURL = getSearxngURL()?.trim();

  const candidateURLs: string[] = [];
  if (configuredURL) {
    candidateURLs.push(configuredURL);
  }
  for (const fallback of DEFAULT_FALLBACK_INSTANCES) {
    if (fallback !== configuredURL && !candidateURLs.includes(fallback)) {
      candidateURLs.push(fallback);
    }
  }

  // Try instances sequentially
  for (let i = 0; i < candidateURLs.length; i++) {
    const candidate = candidateURLs[i];
    let outcome = await executeQuery(candidate, query, opts);

    // If rate-limited on primary configured instance, wait a moment and retry once
    if (!outcome && i === 0 && candidateURLs.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      outcome = await executeQuery(candidate, query, opts);
    }

    if (outcome && outcome.results.length > 0) {
      return outcome;
    }

    if (outcome && outcome.results.length === 0 && i === 0) {
      continue;
    }
  }

  // Return empty list safely instead of crashing caller with an unhandled exception
  console.warn(
    `All SearXNG instances failed or were rate-limited for query: "${query}". Returning empty results gracefully.`,
  );
  return { results: [], suggestions: [] };
};
