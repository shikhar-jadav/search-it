import { getSearxngURL, getSearchProvider, getTavilyApiKey, getExaApiKey } from '@/lib/config/serverRegistry';
import { searchSearxng, SearxngSearchOptions, SearxngSearchResult } from '@/lib/searxng';
import { nativeSearch, NativeSearchResult } from '@/lib/search/native';

export interface UnifiedSearchResult {
  title: string;
  url: string;
  content?: string;
  score?: number;
}

export interface UnifiedSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
  safesearch?: number;
}

/**
 * Searches using Tavily AI Search API (https://api.tavily.com/search)
 */
export async function searchTavily(
  query: string,
  apiKey: string,
  maxResults: number = 8,
): Promise<UnifiedSearchResult[]> {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        include_answer: false,
        max_results: maxResults,
        include_images: false,
      }),
    });

    if (!res.ok) {
      console.warn(`Tavily search API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const results: UnifiedSearchResult[] = (data.results || []).map((r: any) => ({
      title: r.title || 'Untitled',
      url: r.url || '',
      content: r.content || r.raw_content || '',
      score: r.score,
    }));

    return results;
  } catch (err) {
    console.error('Failed to search with Tavily:', err);
    return [];
  }
}

/**
 * Searches using Exa AI Neural Search API (https://api.exa.ai/search)
 */
export async function searchExa(
  query: string,
  apiKey: string,
  numResults: number = 8,
): Promise<UnifiedSearchResult[]> {
  try {
    const res = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query,
        type: 'neural',
        useAutoprompt: true,
        numResults,
        contents: {
          text: {
            maxCharacters: 1500,
          },
          highlights: true,
        },
      }),
    });

    if (!res.ok) {
      console.warn(`Exa search API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const results: UnifiedSearchResult[] = (data.results || []).map((r: any) => ({
      title: r.title || 'Untitled',
      url: r.url || '',
      content:
        (Array.isArray(r.highlights) && r.highlights.length > 0
          ? r.highlights.join(' ')
          : r.text) || '',
      score: r.score,
    }));

    return results;
  } catch (err) {
    console.error('Failed to search with Exa:', err);
    return [];
  }
}

/**
 * Unified Search Dispatcher:
 * Dynamically routes to the chosen search provider (SearxNG, Tavily, or Exa),
 * with graceful fallback to SearxNG if credentials are missing or fail.
 */
export async function performWebSearch(
  query: string,
  options?: UnifiedSearchOptions,
): Promise<UnifiedSearchResult[]> {
  const provider = (getSearchProvider() || 'searxng').toLowerCase();

  if (provider === 'tavily') {
    const apiKey = getTavilyApiKey();
    if (apiKey && apiKey.trim().length > 0) {
      const results = await searchTavily(query, apiKey.trim());
      if (results.length > 0) return results;
    } else {
      console.warn('Tavily search provider chosen but no Tavily API key configured. Falling back to SearXNG.');
    }
  } else if (provider === 'exa') {
    const apiKey = getExaApiKey();
    if (apiKey && apiKey.trim().length > 0) {
      const results = await searchExa(query, apiKey.trim());
      if (results.length > 0) return results;
    } else {
      console.warn('Exa search provider chosen but no Exa API key configured. Falling back to SearXNG.');
    }
  }

  // Default / Fallback: SearXNG (and native fallback if SearXNG rate-limits)
  try {
    const searxRes = await searchSearxng(query, options as SearxngSearchOptions);
    if (searxRes && searxRes.results && searxRes.results.length > 0) {
      return searxRes.results.map((r: SearxngSearchResult) => ({
        title: r.title || '',
        url: r.url || '',
        content: r.content || '',
      }));
    }
  } catch (err) {
    console.error('SearXNG search error:', err);
  }

  // Fallback to Native search (DuckDuckGo engine)
  try {
    const nativeRes = await nativeSearch(query);
    if (nativeRes && nativeRes.results && nativeRes.results.length > 0) {
      return nativeRes.results.map((r: NativeSearchResult) => ({
        title: r.title || '',
        url: r.url || '',
        content: r.content || '',
      }));
    }
  } catch (err) {
    console.error('Native search fallback error:', err);
  }

  return [];
}
