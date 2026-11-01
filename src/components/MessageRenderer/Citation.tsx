'use client';

import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface CitationProps {
  href: string;
  children: React.ReactNode;
}

const Citation = ({ href, children }: CitationProps) => {
  let domain = '';
  let isFile = false;

  try {
    if (href && !href.startsWith('file_id://')) {
      domain = new URL(href).hostname.replace(/^www\./, '');
    } else if (href && href.startsWith('file_id://')) {
      isFile = true;
      domain = 'Uploaded Document';
    }
  } catch {
    domain = '';
  }

  const rawLabel = String(children || '').trim();
  // If the label is a number like 1 or [1], keep it clean as [1]
  const isNumberOnly = /^[\[\(\{]?\d+[\]\)\}]?$/.test(rawLabel);
  const displayNumber = isNumberOnly ? rawLabel.replace(/[\D]/g, '') : null;

  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center align-baseline mx-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-semibold text-[#189bb0] dark:text-[#20B8CD] bg-[#20B8CD]/10 hover:bg-[#20B8CD]/20 border border-[#20B8CD]/20 dark:border-[#20B8CD]/30 transition-all duration-150 no-underline cursor-pointer select-none hover:scale-105 active:scale-95"
          >
            {displayNumber ? (
              <span>{displayNumber}</span>
            ) : (
              <span className="truncate max-w-[100px]">{rawLabel || domain || 'source'}</span>
            )}
          </a>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="center"
            sideOffset={4}
            className="z-50 max-w-xs rounded-xl bg-white dark:bg-[#1f2223] p-2.5 text-xs text-black dark:text-white shadow-xl shadow-black/15 border border-light-300 dark:border-white/10 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          >
            <div className="flex items-center space-x-2 mb-1">
              {!isFile && domain ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${href}&sz=32`}
                  alt="favicon"
                  className="w-3.5 h-3.5 rounded shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : null}
              <span className="font-semibold text-xs text-black/85 dark:text-white/90 truncate">
                {domain || 'Source Reference'}
              </span>
            </div>
            <p className="text-[11px] text-black/60 dark:text-white/60 truncate break-all">
              {href}
            </p>
            <Tooltip.Arrow className="fill-white dark:fill-[#1f2223]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

export default Citation;
