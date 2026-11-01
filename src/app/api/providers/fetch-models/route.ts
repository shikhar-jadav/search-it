import { NextRequest, NextResponse } from 'next/server';
import { Model } from '@/lib/models/types';

interface FetchModelsBody {
  type?: string;
  baseURL?: string;
  apiKey?: string;
}

export const POST = async (req: NextRequest) => {
  try {
    const body: FetchModelsBody = await req.json();
    const { type, apiKey } = body;
    let baseURL = (body.baseURL || '').trim().replace(/\/+$/, '');

    // 1. Anthropic Claude Preset
    if (type === 'anthropic') {
      const anthropicModels: Model[] = [
        { key: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
        { key: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { key: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
        { key: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      ];
      return NextResponse.json({
        success: true,
        models: { chat: anthropicModels, embedding: [] },
      });
    }

    // 2. Google Gemini Preset
    if (type === 'gemini') {
      if (apiKey) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            { signal: AbortSignal.timeout(6000) },
          );
          if (res.ok) {
            const data = await res.json();
            const chat: Model[] = [];
            const embedding: Model[] = [];

            (data.models || []).forEach((m: any) => {
              const name = m.name?.replace(/^models\//, '');
              const displayName = m.displayName || name;
              if (!name) return;
              if (name.includes('embed')) {
                embedding.push({ key: name, name: displayName });
              } else if (
                m.supportedGenerationMethods?.includes('generateContent')
              ) {
                chat.push({ key: name, name: displayName });
              }
            });

            if (chat.length > 0 || embedding.length > 0) {
              return NextResponse.json({
                success: true,
                models: { chat, embedding },
              });
            }
          }
        } catch {
          // Fall through to fallback
        }
      }

      // Default Gemini models
      return NextResponse.json({
        success: true,
        models: {
          chat: [
            { key: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
            { key: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
            { key: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
            { key: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
            { key: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
          ],
          embedding: [
            { key: 'text-embedding-004', name: 'Text Embedding 004' },
          ],
        },
      });
    }

    // 3. Transformers (Local, Built-in)
    if (type === 'transformers') {
      return NextResponse.json({
        success: true,
        models: {
          chat: [],
          embedding: [
            {
              key: 'Xenova/all-MiniLM-L6-v2',
              name: 'all-MiniLM-L6-v2 (Local, Fast)',
            },
            {
              key: 'mixedbread-ai/mxbai-embed-large-v1',
              name: 'mxbai-embed-large-v1 (Local, Quality)',
            },
            {
              key: 'Xenova/nomic-embed-text-v1',
              name: 'nomic-embed-text-v1 (Local)',
            },
          ],
        },
      });
    }

    // 4. OpenAI-Compatible endpoints (Groq, OpenAI, DeepSeek, OpenRouter, Ollama, LM Studio, Together, Voyage, Custom)
    if (!baseURL) {
      baseURL = 'https://api.openai.com/v1';
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    let modelsEndpoint = `${baseURL}/models`;
    let response = await fetch(modelsEndpoint, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(7000),
    });

    // If /v1/models returned 404, try /models or Ollama /api/tags
    if (!response.ok && baseURL.includes('11434')) {
      const ollamaTags = await fetch(`${baseURL.replace(/\/v1$/, '')}/api/tags`, {
        signal: AbortSignal.timeout(4000),
      });
      if (ollamaTags.ok) {
        const odata = await ollamaTags.json();
        const chat: Model[] = [];
        const embedding: Model[] = [];
        (odata.models || []).forEach((m: any) => {
          const key = m.name || m.model;
          if (!key) return;
          if (key.includes('embed') || key.includes('bge')) {
            embedding.push({ key, name: key });
          } else {
            chat.push({ key, name: key });
          }
        });
        return NextResponse.json({
          success: true,
          models: { chat, embedding },
        });
      }
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return NextResponse.json(
        {
          success: false,
          error: `HTTP ${response.status}: ${errText.slice(0, 150) || response.statusText}`,
          models: { chat: [], embedding: [] },
        },
        { status: 200 },
      );
    }

    const json = await response.json();
    const rawList: any[] = Array.isArray(json)
      ? json
      : Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.models)
          ? json.models
          : [];

    const chat: Model[] = [];
    const embedding: Model[] = [];

    rawList.forEach((m: any) => {
      const key = m.id || m.name || m.model;
      if (!key || typeof key !== 'string') return;
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.includes('embed') ||
        lowerKey.includes('bge') ||
        lowerKey.includes('voyage')
      ) {
        embedding.push({ key, name: key });
      } else {
        chat.push({ key, name: key });
      }
    });

    return NextResponse.json({
      success: true,
      models: { chat, embedding },
    });
  } catch (err: any) {
    console.error('Error fetching models:', err);
    return NextResponse.json({
      success: false,
      error: err.name === 'TimeoutError' ? 'Connection timed out' : err.message,
      models: { chat: [], embedding: [] },
    });
  }
};
