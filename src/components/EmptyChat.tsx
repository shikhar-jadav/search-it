'use client';

import { useEffect, useState } from 'react';
import { Settings, Sparkles, Compass, Lightbulb, Code2 } from 'lucide-react';
import EmptyChatMessageInput from './EmptyChatMessageInput';
import WeatherWidget from './WeatherWidget';
import NewsArticleWidget from './NewsArticleWidget';
import SettingsButtonMobile from '@/components/Settings/SettingsButtonMobile';
import { useChat } from '@/lib/hooks/useChat';
import {
  getShowNewsWidget,
  getShowWeatherWidget,
} from '@/lib/config/clientRegistry';

const SUGGESTED_PROMPTS = [
  {
    icon: Sparkles,
    title: 'Deep Research',
    query: 'What are the most promising breakthroughs in quantum computing this year?',
  },
  {
    icon: Compass,
    title: 'Technology Trends',
    query: 'Compare Next.js App Router vs standard React SPA architecture in 2026',
  },
  {
    icon: Code2,
    title: 'Code Synthesis',
    query: 'Explain how search engines implement vector and lexical hybrid search algorithms',
  },
  {
    icon: Lightbulb,
    title: 'Market Analysis',
    query: 'Analyze the current state and market share of generative search engines',
  },
];

const EmptyChat = () => {
  const { chatModelProvider, isConfigReady, sendMessage } = useChat();
  const [showWeather, setShowWeather] = useState(() =>
    typeof window !== 'undefined' ? getShowWeatherWidget() : true,
  );
  const [showNews, setShowNews] = useState(() =>
    typeof window !== 'undefined' ? getShowNewsWidget() : true,
  );

  useEffect(() => {
    const updateWidgetVisibility = () => {
      setShowWeather(getShowWeatherWidget());
      setShowNews(getShowNewsWidget());
    };

    updateWidgetVisibility();

    window.addEventListener('client-config-changed', updateWidgetVisibility);
    window.addEventListener('storage', updateWidgetVisibility);

    return () => {
      window.removeEventListener(
        'client-config-changed',
        updateWidgetVisibility,
      );
      window.removeEventListener('storage', updateWidgetVisibility);
    };
  }, []);

  return (
    <div className="relative w-full">
      <div className="absolute w-full flex flex-row items-center justify-end mr-5 mt-5">
        <SettingsButtonMobile />
      </div>
      <div className="flex flex-col items-center justify-center min-h-[85vh] max-w-screen-md mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col items-center justify-center w-full space-y-5">
          <div className="flex flex-col items-center space-y-2">
            <h2 className="text-black/90 dark:text-white/95 text-3xl sm:text-4xl md:text-5xl font-medium text-center tracking-tight font-serif select-none">
              Where knowledge begins
            </h2>
            <p className="text-sm text-black/50 dark:text-white/50 text-center font-normal">
              Ask any question, explore deep research, or synthesize multi-source answers
            </p>
          </div>

          {(!isConfigReady || !chatModelProvider?.key) && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open-settings'));
                }
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 text-amber-500 dark:text-amber-400 text-xs font-medium transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
            >
              <Settings size={13} />
              <span>No AI model configured — Click here to add your API key in Settings</span>
            </button>
          )}

          {/* Hero Input Pill */}
          <EmptyChatMessageInput />

          {/* Prompt Suggestion Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-1">
            {SUGGESTED_PROMPTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => sendMessage(item.query)}
                  className="flex items-start gap-3 p-3 text-left rounded-xl bg-white/60 dark:bg-[#1a1c1d]/60 hover:bg-white dark:hover:bg-[#202223] border border-light-300/80 dark:border-white/10 hover:border-[#20B8CD]/40 dark:hover:border-[#20B8CD]/40 shadow-sm transition-all duration-200 group cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-[#20B8CD]/10 text-[#20B8CD] shrink-0 group-hover:scale-105 transition-transform">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-black/85 dark:text-white/90 block truncate">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-black/50 dark:text-white/50 line-clamp-1 mt-0.5">
                      {item.query}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {(showWeather || showNews) && (
          <div className="flex flex-col w-full gap-4 mt-2 sm:flex-row sm:justify-center">
            {showWeather && (
              <div className="flex-1 w-full">
                <WeatherWidget />
              </div>
            )}
            {showNews && (
              <div className="flex-1 w-full">
                <NewsArticleWidget />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyChat;
