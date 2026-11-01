'use client';

/* eslint-disable @next/next/no-img-element */
import {
  Brain,
  Search,
  ChevronDown,
  ChevronRight,
  Globe,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { Chunk, ResearchBlock, ResearchBlockSubStep } from '@/lib/types';
import { useChat } from '@/lib/hooks/useChat';
import { cn } from '@/lib/utils';

const getDomain = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/.+\/\/|www.|\..+/g, '');
  }
};

const ResearchIcon = ({ isSpinning }: { isSpinning?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(
      'w-4 h-4 text-black/60 dark:text-white/60 shrink-0',
      isSpinning && 'animate-spin',
    )}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6.5v11" />
    <path d="M6.5 12h11" />
    <path d="m8.1 8.1 7.8 7.8" />
    <path d="m8.1 15.9 7.8-7.8" />
  </svg>
);

interface GroupedStep {
  id: string;
  type: 'search' | 'reasoning' | 'upload';
  title: string;
  queries: string[];
  sources: Chunk[];
  reasoning?: string;
}

const GroupedStepItem = ({
  step,
  isStreaming,
  defaultOpen = false,
}: {
  step: GroupedStep;
  isStreaming: boolean;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showAllSources, setShowAllSources] = useState(false);

  const uniqueSources = Array.from(
    new Map(
      (step.sources || [])
        .filter((r) => r && r.metadata && r.metadata.url)
        .map((r) => [r.metadata.url, r]),
    ).values(),
  );

  const visibleSources = showAllSources
    ? uniqueSources
    : uniqueSources.slice(0, 3);
  const remainingSourcesCount = uniqueSources.length - 3;

  return (
    <div className="rounded-lg">
      {/* Step Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between text-xs sm:text-[13px] py-1.5 px-2 rounded-lg transition cursor-pointer select-none group',
          isOpen
            ? 'text-black dark:text-white'
            : 'text-black/80 dark:text-white/80 hover:bg-light-200/40 dark:hover:bg-[#1b1c1c]',
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <span className="text-black/50 dark:text-white/50 shrink-0">
            {step.type === 'reasoning' ? (
              <Brain className="w-3.5 h-3.5" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
          </span>
          <span className="truncate font-normal">{step.title}</span>
        </div>
        {isOpen ? (
          <ChevronDown
            size={13}
            className="text-black/40 dark:text-white/40 shrink-0"
          />
        ) : (
          <ChevronRight
            size={13}
            className="text-black/40 dark:text-white/40 shrink-0 group-hover:translate-x-0.5 transition-transform"
          />
        )}
      </div>

      {/* Step Details (indented with left border line) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden pl-7 pr-2 py-1 space-y-2 border-l border-light-200 dark:border-white/10 ml-3.5 my-1"
          >
            {/* Reasoning text */}
            {step.type === 'reasoning' && step.reasoning && (
              <div className="text-xs text-black/75 dark:text-white/75 leading-relaxed whitespace-pre-wrap font-sans">
                {step.reasoning}
              </div>
            )}

            {/* Queries List */}
            {step.queries.length > 0 && (
              <div className="space-y-1">
                {step.queries.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60 py-0.5"
                  >
                    <Search
                      size={12}
                      className="text-black/40 dark:text-white/40 shrink-0"
                    />
                    <span className="truncate">{q}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sources List */}
            {uniqueSources.length > 0 && (
              <div className="space-y-1 pt-0.5">
                {visibleSources.map((r, idx) => {
                  const domain = getDomain(r.metadata.url);
                  return (
                    <a
                      key={idx}
                      href={r.metadata.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 py-1 px-1.5 rounded hover:bg-light-200/50 dark:hover:bg-[#202222] transition group text-xs"
                    >
                      <img
                        src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${encodeURIComponent(r.metadata.url)}&sz=32`}
                        alt=""
                        className="w-3.5 h-3.5 rounded-full shrink-0 object-cover bg-light-300 dark:bg-[#333]"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display =
                            'none';
                        }}
                      />
                      <span className="text-xs text-black/85 dark:text-white/85 truncate max-w-[280px] sm:max-w-[420px] font-normal group-hover:underline">
                        {r.metadata.title || r.metadata.url}
                      </span>
                      <span className="text-[11px] text-black/40 dark:text-white/40 shrink-0 ml-auto mr-1">
                        {domain}
                      </span>
                      <ShieldCheck
                        size={12}
                        className="text-black/35 dark:text-white/35 shrink-0"
                      />
                    </a>
                  );
                })}

                {remainingSourcesCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllSources(!showAllSources);
                    }}
                    className="text-xs font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white pt-1 pl-1.5 flex items-center gap-1 transition cursor-pointer"
                  >
                    {showAllSources
                      ? 'Show less'
                      : `+${remainingSourcesCount} more`}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface AssistantStepsProps {
  block?: ResearchBlock;
  status: 'answering' | 'completed' | 'error';
  isLast: boolean;
  thinkingContent?: string;
  thinkingEnded?: boolean;
}

const AssistantSteps = ({
  block,
  status,
  isLast,
  thinkingContent,
  thinkingEnded,
}: AssistantStepsProps) => {
  const { researchEnded, loading } = useChat();

  const subSteps: ResearchBlockSubStep[] = [
    ...(block?.data?.subSteps || []),
  ];

  if (thinkingContent && thinkingContent.trim().length > 0) {
    subSteps.push({
      id: 'model-reasoning-step',
      type: 'reasoning',
      reasoning: thinkingContent,
    });
  }

  const hasSearchSteps = (block?.data?.subSteps?.length || 0) > 0;
  const hasThinking = Boolean(
    thinkingContent && thinkingContent.trim().length > 0,
  );

  const isCurrentlyThinking =
    status === 'answering' &&
    loading &&
    (!researchEnded || (hasThinking && !thinkingEnded));

  const [isExpanded, setIsExpanded] = useState(
    isLast && status === 'answering' && isCurrentlyThinking,
  );

  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isCurrentlyThinking) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      const interval = setInterval(() => {
        if (startTimeRef.current) {
          const secs = Math.max(
            1,
            Math.round((Date.now() - startTimeRef.current) / 1000),
          );
          setElapsedSeconds(secs);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      if (startTimeRef.current && elapsedSeconds === null) {
        setElapsedSeconds(
          Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)),
        );
      }
    }
  }, [isCurrentlyThinking, elapsedSeconds]);

  useEffect(() => {
    if (!isCurrentlyThinking && isLast) {
      setIsExpanded(false);
    } else if (isCurrentlyThinking && isLast) {
      setIsExpanded(true);
    }
  }, [isCurrentlyThinking, isLast]);

  // Group searching and search_results together into clean Perplexity-style steps
  const groupedSteps: GroupedStep[] = [];
  for (let i = 0; i < subSteps.length; i++) {
    const step = subSteps[i];

    if (step.type === 'searching') {
      const queries = Array.isArray(step.searching) ? step.searching : [];
      let sources: Chunk[] = [];

      if (
        i + 1 < subSteps.length &&
        subSteps[i + 1].type === 'search_results'
      ) {
        const nextStep = subSteps[i + 1] as { reading?: Chunk[] };
        sources = nextStep.reading || [];
        i++;
      }

      const q = queries[0] || 'the web';
      const cleanQ = q.replace(
        /^(what is|who is|definition of|details on)\s+/i,
        '',
      );
      const title = q.toLowerCase().includes('definition')
        ? `Looking up the definition of ${cleanQ}`
        : `Looking up ${cleanQ}`;

      groupedSteps.push({
        id: step.id,
        type: 'search',
        title,
        queries,
        sources,
      });
    } else if (step.type === 'search_results') {
      groupedSteps.push({
        id: step.id,
        type: 'search',
        title: `Gathered ${step.reading?.length || 0} sources`,
        queries: [],
        sources: step.reading || [],
      });
    } else if (step.type === 'reasoning') {
      groupedSteps.push({
        id: step.id,
        type: 'reasoning',
        title: 'Reasoning through response',
        queries: [],
        sources: [],
        reasoning: step.reasoning,
      });
    } else if (step.type === 'upload_searching') {
      const queries = Array.isArray(step.queries) ? step.queries : [];
      let sources: Chunk[] = [];

      if (
        i + 1 < subSteps.length &&
        subSteps[i + 1].type === 'upload_search_results'
      ) {
        const nextStep = subSteps[i + 1] as { results?: Chunk[] };
        sources = nextStep.results || [];
        i++;
      }

      groupedSteps.push({
        id: step.id,
        type: 'upload',
        title: 'Scanning uploaded files',
        queries,
        sources,
      });
    } else if (step.type === 'upload_search_results') {
      groupedSteps.push({
        id: step.id,
        type: 'upload',
        title: `Reading ${step.results?.length || 0} documents`,
        queries: [],
        sources: step.results || [],
      });
    } else if (step.type === 'reading') {
      groupedSteps.push({
        id: step.id,
        type: 'search',
        title: 'Fetching principle resources for the checks',
        queries: [],
        sources: step.reading || [],
      });
    }
  }

  // Duration label: Researched 1s / Researched 3s
  const displayDuration =
    elapsedSeconds !== null
      ? elapsedSeconds
      : Math.max(1, Math.min(8, Math.round(groupedSteps.length * 0.9)));

  const headerLabel = isCurrentlyThinking
    ? 'Researching...'
    : `Researched ${displayDuration}s`;

  return (
    <div className="w-full my-1">
      {/* Minimal Header */}
      <button
        onClick={() => {
          if (groupedSteps.length > 0) {
            setIsExpanded(!isExpanded);
          }
        }}
        className={cn(
          'flex items-center gap-2 text-[13px] sm:text-sm font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition py-1 select-none group',
          groupedSteps.length > 0 ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        <ResearchIcon isSpinning={isCurrentlyThinking} />
        <span>{headerLabel}</span>
        {groupedSteps.length > 0 && (
          <ChevronDown
            size={14}
            className={cn(
              'transition-transform duration-200 opacity-60 group-hover:opacity-100',
              isExpanded && 'rotate-180',
            )}
          />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && groupedSteps.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-1.5 space-y-1"
          >
            {groupedSteps.map((step, index) => {
              const isLastStep = index === groupedSteps.length - 1;
              const isStreaming = loading && isLastStep && isCurrentlyThinking;

              return (
                <GroupedStepItem
                  key={step.id}
                  step={step}
                  isStreaming={isStreaming}
                  defaultOpen={
                    index === 0 ||
                    (groupedSteps.length === 1 && step.type === 'reasoning')
                  }
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssistantSteps;
