'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ThinkBoxProps {
  content?: string;
  children?: React.ReactNode;
  thinkingEnded: boolean;
}

const ThinkBox = ({ content, children, thinkingEnded }: ThinkBoxProps) => {
  const [isExpanded, setIsExpanded] = useState(!thinkingEnded);
  const [isDetailOpen, setIsDetailOpen] = useState(!thinkingEnded);

  useEffect(() => {
    if (thinkingEnded) {
      setIsExpanded(false);
      setIsDetailOpen(false);
    } else {
      setIsExpanded(true);
      setIsDetailOpen(true);
    }
  }, [thinkingEnded]);

  if (!content && !children) return null;

  return (
    <div className="w-full my-2">
      {/* Minimal Perplexity Header */}
      <button
        onClick={() => {
          const next = !isExpanded;
          setIsExpanded(next);
          if (next) setIsDetailOpen(true);
        }}
        className="flex items-center gap-1.5 text-[13px] sm:text-sm font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition py-1 cursor-pointer select-none"
      >
        <span>{thinkingEnded ? 'Finished thinking' : 'Thinking...'}</span>
        <ChevronDown
          size={14}
          className={cn(
            'transition-transform duration-200 opacity-60',
            isExpanded && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-1.5 space-y-1"
          >
            <div className="rounded-lg">
              {/* Step Header */}
              <div
                onClick={() => setIsDetailOpen(!isDetailOpen)}
                className={cn(
                  'flex items-center justify-between text-xs sm:text-[13px] py-1.5 px-2 rounded-lg transition cursor-pointer select-none group',
                  isDetailOpen
                    ? 'bg-light-200/60 dark:bg-[#1e1f1f] text-black dark:text-white'
                    : 'text-black/80 dark:text-white/80 hover:bg-light-200/40 dark:hover:bg-[#1b1c1c]',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="text-black/50 dark:text-white/50 shrink-0">
                    <Brain className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate font-normal">
                    {thinkingEnded
                      ? 'Reasoning through response'
                      : 'Formulating answer...'}
                  </span>
                </div>
                {isDetailOpen ? (
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

              {/* Step Details (Indented Reasoning) */}
              <AnimatePresence>
                {isDetailOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden pl-7 pr-2 py-1.5 border-l border-light-200 dark:border-white/10 ml-3.5 my-1"
                  >
                    <div className="text-xs text-black/75 dark:text-white/75 leading-relaxed whitespace-pre-wrap font-sans">
                      {children || content}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThinkBox;
