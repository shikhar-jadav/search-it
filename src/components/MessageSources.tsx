/* eslint-disable @next/next/no-img-element */
'use client';

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { File, ExternalLink, Globe, X } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Chunk } from '@/lib/types';

const MessageSources = ({ sources }: { sources: Chunk[] }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const closeModal = () => {
    setIsDialogOpen(false);
    document.body.classList.remove('overflow-hidden-scrollable');
  };

  const openModal = () => {
    setIsDialogOpen(true);
    document.body.classList.add('overflow-hidden-scrollable');
  };

  if (!sources || sources.length === 0) return null;

  return (
    <div className="w-full">
      {/* Horizontal scrolling carousel for sources */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar snap-x">
        {sources.slice(0, 8).map((source, i) => {
          const isFile = source.metadata.url.includes('file_id://');
          let domain = '';
          try {
            domain = isFile
              ? 'Uploaded File'
              : new URL(source.metadata.url).hostname.replace(/^www\./, '');
          } catch {
            domain = 'Web Source';
          }

          return (
            <a
              key={i}
              href={source.metadata.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 w-44 sm:w-48 bg-white dark:bg-[#1a1c1d] hover:bg-light-200/60 dark:hover:bg-[#25282a] border border-light-300/80 dark:border-white/10 rounded-xl p-2.5 flex flex-col justify-between space-y-2 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 group snap-start"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 min-w-0">
                  {isFile ? (
                    <div className="bg-[#20B8CD]/10 p-1 rounded-md text-[#20B8CD]">
                      <File size={12} />
                    </div>
                  ) : (
                    <img
                      src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${source.metadata.url}&sz=32`}
                      width={14}
                      height={14}
                      alt="favicon"
                      className="rounded shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="text-[11px] font-medium text-black/60 dark:text-white/60 truncate">
                    {domain}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-black/40 dark:text-white/40 bg-light-200 dark:bg-white/5 px-1.5 py-0.5 rounded-full shrink-0">
                  {i + 1}
                </span>
              </div>
              <p className="text-xs text-black/85 dark:text-white/90 font-medium line-clamp-2 leading-snug group-hover:text-[#20B8CD] transition-colors">
                {source.metadata.title || domain}
              </p>
            </a>
          );
        })}

        {sources.length > 8 && (
          <button
            onClick={openModal}
            className="flex-shrink-0 w-32 bg-light-100 hover:bg-light-200 dark:bg-white/5 dark:hover:bg-white/10 border border-dashed border-light-300 dark:border-white/15 rounded-xl p-2.5 flex flex-col items-center justify-center space-y-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition duration-200 snap-start"
          >
            <span className="text-xs font-medium">+{sources.length - 8} more</span>
            <span className="text-[10px] text-black/40 dark:text-white/40">View all</span>
          </button>
        )}
      </div>

      {/* Sources modal to view all references */}
      <Transition appear show={isDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-[#1a1c1d] border border-light-300 dark:border-white/10 p-6 text-left align-middle shadow-2xl transition-all">
                  <div className="flex items-center justify-between pb-4 border-b border-light-200 dark:border-white/10">
                    <DialogTitle
                      as="h3"
                      className="text-base font-semibold text-black dark:text-white flex items-center space-x-2"
                    >
                      <Globe size={18} className="text-[#20B8CD]" />
                      <span>All Referenced Sources ({sources.length})</span>
                    </DialogTitle>
                    <button
                      onClick={closeModal}
                      className="p-1 rounded-lg text-black/50 dark:text-white/50 hover:bg-light-200 dark:hover:bg-white/10 transition"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1 space-y-2.5">
                    {sources.map((source, i) => {
                      const isFile = source.metadata.url.includes('file_id://');
                      let domain = '';
                      try {
                        domain = isFile
                          ? 'Uploaded File'
                          : new URL(source.metadata.url).hostname.replace(/^www\./, '');
                      } catch {
                        domain = 'Web Source';
                      }

                      return (
                        <a
                          key={i}
                          href={source.metadata.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start justify-between p-3 rounded-xl bg-light-100/60 dark:bg-white/5 hover:bg-light-200/80 dark:hover:bg-white/10 border border-transparent hover:border-light-300 dark:hover:border-white/10 transition-all group"
                        >
                          <div className="flex items-start space-x-3 min-w-0 pr-3">
                            <span className="text-xs font-semibold text-black/40 dark:text-white/40 mt-0.5">
                              {i + 1}.
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-black/90 dark:text-white/90 group-hover:text-[#20B8CD] transition-colors truncate">
                                {source.metadata.title || domain}
                              </h4>
                              <p className="text-[11px] text-black/50 dark:text-white/50 truncate mt-0.5">
                                {domain}
                              </p>
                              {source.content && (
                                <p className="text-xs text-black/70 dark:text-white/70 line-clamp-2 mt-1 leading-relaxed">
                                  {source.content}
                                </p>
                              )}
                            </div>
                          </div>
                          <ExternalLink
                            size={14}
                            className="text-black/30 dark:text-white/30 group-hover:text-[#20B8CD] shrink-0 mt-1 transition-colors"
                          />
                        </a>
                      );
                    })}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default MessageSources;
