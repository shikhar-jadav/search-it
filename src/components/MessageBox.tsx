'use client';

/* eslint-disable @next/next/no-img-element */
import React, { MutableRefObject, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  BookCopy,
  Volume2,
  StopCircle,
  Layers3,
  Plus,
  ChevronDown,
  ChevronUp,
  Share2,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import Markdown, { MarkdownToJSX, RuleType } from 'markdown-to-jsx';
import Copy from './MessageActions/Copy';
import MessageSources from './MessageSources';
import { useSpeech } from 'react-text-to-speech';
import { useChat, Section } from '@/lib/hooks/useChat';
import Citation from './MessageRenderer/Citation';
import AssistantSteps from './AssistantSteps';
import { ResearchBlock } from '@/lib/types';
import Renderer from './Widgets/Renderer';
import CodeBlock from './MessageRenderer/CodeBlock';
import { toast } from 'sonner';

const MessageBox = ({
  section,
  sectionIndex,
  dividerRef,
  isLast,
}: {
  section: Section;
  sectionIndex: number;
  dividerRef?: MutableRefObject<HTMLDivElement | null>;
  isLast: boolean;
}) => {
  const {
    loading,
    sendMessage,
    rewrite,
    messages,
    researchEnded,
    chatHistory,
  } = useChat();

  const [isQueryExpanded, setIsQueryExpanded] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const parsedMessage = section.parsedTextBlocks.join('\n\n');
  const speechMessage = section.speechMessage || '';
  const thinkingEnded = section.thinkingEnded;

  const sourceBlocks = section.message.responseBlocks.filter(
    (block): block is typeof block & { type: 'source' } =>
      block.type === 'source',
  );

  const sources = sourceBlocks.flatMap((block) => block.data);

  const researchBlock = section.message.responseBlocks.find(
    (block): block is ResearchBlock =>
      block.type === 'research' && block.data.subSteps.length > 0,
  );

  const hasResearchSteps =
    Boolean(researchBlock && researchBlock.data.subSteps.length > 0) ||
    Boolean(
      section.thinkingContent && section.thinkingContent.trim().length > 0,
    );

  const hasContent = section.parsedTextBlocks.some(
    (t) => t.trim().length > 0,
  );

  const { speechStatus, start, stop } = useSpeech({ text: speechMessage });

  const markdownOverrides: MarkdownToJSX.Options = {
    renderRule(next, node, renderChildren, state) {
      if (node.type === RuleType.codeInline) {
        return `\`${node.text}\``;
      }

      if (node.type === RuleType.codeBlock) {
        return (
          <CodeBlock key={state.key} language={node.lang || ''}>
            {node.text}
          </CodeBlock>
        );
      }

      return next();
    },
    overrides: {
      think: {
        component: () => null,
      },
      citation: {
        component: Citation,
      },
    },
  };

  const isQueryLong =
    section.message.query.length > 180 || section.message.query.includes('\n');

  return (
    <div className="space-y-4">
      {/* Perplexity-style User Query Bubble */}
      <div className="flex justify-end w-full pt-4 mb-2">
        <div className="w-fit max-w-[85%] sm:max-w-[80%] bg-light-200/90 dark:bg-[#202222] text-black dark:text-white rounded-[20px] px-4 py-2 sm:px-4 sm:py-2.5 shadow-none">
          <div
            className={cn(
              'text-[14px] sm:text-[15px] leading-relaxed break-words whitespace-pre-wrap font-normal',
              !isQueryExpanded && isQueryLong && 'line-clamp-3',
            )}
          >
            {section.message.query}
          </div>
          {isQueryLong && (
            <button
              onClick={() => setIsQueryExpanded(!isQueryExpanded)}
              className="text-xs font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white mt-1.5 flex items-center gap-1 transition cursor-pointer"
            >
              {isQueryExpanded ? (
                <>
                  <span>Read less</span>
                  <ChevronUp size={13} />
                </>
              ) : (
                <>
                  <span>Read more</span>
                  <ChevronDown size={13} />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="w-full">
        <div
          ref={dividerRef}
          className="flex flex-col space-y-4 w-full"
        >
          {/* Unified Research & Thinking Steps (Perplexity style at the top) */}
          {hasResearchSteps && (
            <div className="w-full">
              <AssistantSteps
                block={researchBlock}
                status={section.message.status}
                isLast={isLast}
                thinkingContent={section.thinkingContent}
                thinkingEnded={section.thinkingEnded}
              />
            </div>
          )}

          {/* Sources Section (Fallback if no research steps exist) */}
          {!hasResearchSteps && sources.length > 0 && (
            <div className="flex flex-col space-y-2 mb-1">
              <div className="flex items-center gap-2 text-xs font-medium text-black/60 dark:text-white/60">
                <BookCopy size={15} />
                <span>Sources ({sources.length})</span>
              </div>
              <MessageSources sources={sources} />
            </div>
          )}

          {/* Widgets */}
          {section.widgets.length > 0 && <Renderer widgets={section.widgets} />}

          {/* Answer Section */}
          <div className="flex flex-col space-y-2 pt-1">
            {hasContent && (
              <>
                <Markdown
                  className={cn(
                    'prose prose-h1:mb-3 prose-h1:font-serif prose-h2:mb-2 prose-h2:mt-6 prose-h2:font-serif prose-h2:font-[600] prose-h3:mt-4 prose-h3:mb-1.5 prose-h3:font-[600] dark:prose-invert prose-p:leading-[1.75] prose-pre:p-0 font-serif',
                    'max-w-none break-words text-black dark:text-[#ececec] text-[15px] sm:text-[16px]',
                  )}
                  options={markdownOverrides}
                >
                  {parsedMessage}
                </Markdown>

                {/* Perplexity Bottom Action Toolbar */}
                {hasContent && (
                  <div className="flex flex-row items-center justify-between w-full text-black/50 dark:text-white/40 pt-2.5 mt-2">
                    {/* Left Actions */}
                    <div className="flex items-center space-x-1">
                      <Copy initialMessage={parsedMessage} section={section} />
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            navigator.clipboard.writeText(window.location.href);
                            setCopiedLink(true);
                            toast.success('Link copied to clipboard');
                            setTimeout(() => setCopiedLink(false), 1500);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-light-200 dark:hover:bg-[#202222] hover:text-black dark:hover:text-white transition cursor-pointer"
                        title="Share chat"
                      >
                        {copiedLink ? (
                          <Check size={16} className="text-[#20B8CD]" />
                        ) : (
                          <Share2 size={16} />
                        )}
                      </button>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setFeedback(feedback === 'like' ? null : 'like');
                          toast.success('Feedback recorded');
                        }}
                        className={cn(
                          'p-1.5 rounded-lg hover:bg-light-200 dark:hover:bg-[#202222] transition cursor-pointer',
                          feedback === 'like'
                            ? 'text-[#20B8CD]'
                            : 'hover:text-black dark:hover:text-white',
                        )}
                        title="Helpful"
                      >
                        <ThumbsUp size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setFeedback(feedback === 'dislike' ? null : 'dislike');
                          toast.success('Feedback recorded');
                        }}
                        className={cn(
                          'p-1.5 rounded-lg hover:bg-light-200 dark:hover:bg-[#202222] transition cursor-pointer',
                          feedback === 'dislike'
                            ? 'text-red-400'
                            : 'hover:text-black dark:hover:text-white',
                        )}
                        title="Not helpful"
                      >
                        <ThumbsDown size={16} />
                      </button>

                      {/* More Menu (...) with Rewrite & Read aloud */}
                      <Menu as="div" className="relative inline-block text-left">
                        <MenuButton
                          className="p-1.5 rounded-lg hover:bg-light-200 dark:hover:bg-[#202222] hover:text-black dark:hover:text-white transition cursor-pointer flex items-center"
                          title="More options"
                        >
                          <MoreHorizontal size={16} />
                        </MenuButton>
                        <MenuItems
                          transition
                          className="absolute right-0 bottom-full mb-1.5 w-40 origin-bottom-right rounded-xl bg-white dark:bg-[#202222] p-1 text-sm shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none z-50 transition data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                        >
                          <MenuItem>
                            {({ focus }) => (
                              <button
                                onClick={() => rewrite(section.message.messageId)}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-black/80 dark:text-white/80 transition cursor-pointer',
                                  focus && 'bg-light-200 dark:bg-[#2a2c2c] text-black dark:text-white',
                                )}
                              >
                                <RefreshCw size={14} className="shrink-0" />
                                <span>Rewrite</span>
                              </button>
                            )}
                          </MenuItem>
                          <MenuItem>
                            {({ focus }) => (
                              <button
                                onClick={() => {
                                  if (speechStatus === 'started') {
                                    stop();
                                  } else {
                                    start();
                                  }
                                }}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-black/80 dark:text-white/80 transition cursor-pointer',
                                  focus && 'bg-light-200 dark:bg-[#2a2c2c] text-black dark:text-white',
                                )}
                              >
                                {speechStatus === 'started' ? (
                                  <>
                                    <StopCircle size={14} className="shrink-0" />
                                    <span>Stop reading</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 size={14} className="shrink-0" />
                                    <span>Read aloud</span>
                                  </>
                                )}
                              </button>
                            )}
                          </MenuItem>
                        </MenuItems>
                      </Menu>
                    </div>
                  </div>
                )}

                {/* Follow-up / Suggestions Section */}
                {isLast &&
                  section.suggestions &&
                  section.suggestions.length > 0 &&
                  hasContent &&
                  !loading && (
                    <div className="mt-8 pt-4 border-t border-light-200 dark:border-white/5">
                      <div className="flex flex-row items-center space-x-2 mb-3">
                        <Layers3
                          className="text-black/60 dark:text-white/60"
                          size={16}
                        />
                        <h3 className="text-black dark:text-white font-medium text-sm">
                          Related
                        </h3>
                      </div>
                      <div className="divide-y divide-light-200 dark:divide-white/5">
                        {section.suggestions.map(
                          (suggestion: string, i: number) => (
                            <button
                              key={i}
                              onClick={() => sendMessage(suggestion)}
                              className="group w-full py-2.5 px-1 hover:bg-light-200/50 dark:hover:bg-[#1e1f1f]/50 text-left transition duration-200 flex items-center justify-between gap-3 cursor-pointer"
                            >
                              <p className="text-xs sm:text-[13px] text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white leading-relaxed truncate">
                                {suggestion}
                              </p>
                              <Plus
                                size={14}
                                className="text-black/40 dark:text-white/40 group-hover:text-[#20B8CD] shrink-0"
                              />
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBox;
