'use client';

import { cn } from '@/lib/utils';
import {
  Home,
  BookOpen,
  Plus,
  History,
  ChevronDown,
  Bell,
  PanelLeftClose,
  PanelLeft,
  Search,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react';
import { SiPerplexity } from '@icons-pack/react-simple-icons';
import Link from 'next/link';
import { usePathname, useRouter, useSelectedLayoutSegments } from 'next/navigation';
import React, { useState, useEffect, Fragment } from 'react';
import Layout from './Layout';
import SettingsDialogue from './Settings/SettingsDialogue';
import { AnimatePresence } from 'framer-motion';
import { useSidebar } from '@/lib/hooks/useSidebar';
import { useChat } from '@/lib/hooks/useChat';
import {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { toast } from 'sonner';

const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const segments = useSelectedLayoutSegments();
  const pathname = usePathname();
  const router = useRouter();
  const { resetChat, loadChat } = useChat();
  const { isExpanded, toggleSidebar, recentChats, refreshRecentChats } = useSidebar();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(true);
  const [sessionSearch, setSessionSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateScreenSize = () => setIsLargeScreen(mediaQuery.matches);

    updateScreenSize();
    mediaQuery.addEventListener('change', updateScreenSize);
    return () => mediaQuery.removeEventListener('change', updateScreenSize);
  }, []);

  useEffect(() => {
    const handleOpenSettings = () => {
      setIsSettingsOpen(true);
    };

    window.addEventListener('open-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('open-settings', handleOpenSettings);
    };
  }, []);

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingChat, setDeletingChat] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStartRename = (e: React.MouseEvent, chat: { id: string; title: string }) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleSaveRename = async (chatId: string) => {
    if (!editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    const newTitle = editingTitle.trim();
    setEditingChatId(null);

    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error('Failed to rename chat');
      await refreshRecentChats();
      toast.success('Chat renamed');
    } catch (err: any) {
      toast.error(err.message || 'Error renaming chat');
    }
  };

  const handleDeleteChat = async () => {
    if (!deletingChat) return;
    setIsDeleting(true);
    const targetId = deletingChat.id;

    try {
      const res = await fetch(`/api/chats/${targetId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to delete chat');

      setDeletingChat(null);
      await refreshRecentChats();
      toast.success('Chat deleted');

      if (pathname === `/c/${targetId}`) {
        resetChat();
        router.push('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting chat');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNewChat = (e: React.MouseEvent) => {
    e.preventDefault();
    resetChat();
    router.push('/');
  };

  const handleSelectChat = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    loadChat(id);
    router.push(`/c/${id}`);
  };

  const navLinks = [
    {
      icon: Home,
      href: '/',
      active: pathname === '/' || (segments.length === 0 && !segments.includes('library')),
      label: 'Home',
    },
    {
      icon: BookOpen,
      href: '/library',
      active: segments.includes('library'),
      label: 'Library',
    },
  ];

  const filteredChats = sessionSearch.trim()
    ? recentChats.filter((c) =>
        c.title.toLowerCase().includes(sessionSearch.toLowerCase()),
      )
    : recentChats;
  const sidebarExpanded = isExpanded && isLargeScreen;

  return (
    <div>
      {/* Side Navigation */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-light-200/60 dark:border-[#242525] bg-light-primary dark:bg-[#191a1a] transition-[width] duration-300 ease-in-out select-none',
          sidebarExpanded ? 'w-[240px]' : 'w-[50px]',
        )}
      >
        {sidebarExpanded ? (
          /* ================= EXPANDED SIDEBAR ================= */
          <div className="flex flex-col h-full overflow-hidden px-3 py-3.5">
            {/* Header: Logo, Search, Toggle */}
            <div className="flex items-center justify-between mb-3 px-1">
              <Link
                href="/"
                onClick={handleNewChat}
                className="text-black dark:text-white hover:opacity-80 transition"
                title="Perplexity Home"
              >
                <SiPerplexity size={19} />
              </Link>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="p-1.5 rounded-lg text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-[#242525] transition"
                  title="Search threads"
                >
                  <Search size={15} />
                </button>
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-lg text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-[#242525] transition"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose size={15} />
                </button>
              </div>
            </div>

            {/* + New Button */}
            <Link
              href="/"
              onClick={handleNewChat}
              className="flex items-center justify-between px-3 py-1.5 mb-3 rounded-lg bg-light-200/80 dark:bg-[#202121] hover:bg-light-300 dark:hover:bg-[#262727] text-black dark:text-white text-xs font-medium transition active:scale-[0.98] border border-transparent dark:border-[#282929]"
            >
              <div className="flex items-center gap-2">
                <Plus size={14} className="text-black/70 dark:text-white/70" />
                <span>New</span>
              </div>
              <kbd className="text-[10px] text-black/40 dark:text-white/40 font-sans px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                Ctrl K
              </kbd>
            </Link>

            {/* Quick Session Search Input (if toggled) */}
            {isSearchOpen && (
              <div className="relative mb-3">
                <Search
                  size={14}
                  className="absolute left-2.5 top-2.5 text-black/40 dark:text-white/40"
                />
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-light-200 dark:bg-[#242525] border border-light-300 dark:border-[#333434] text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-cyan-500"
                />
                {sessionSearch && (
                  <button
                    onClick={() => setSessionSearch('')}
                    className="absolute right-2 top-2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {/* Primary Nav Links */}
            <div className="space-y-0.5 mb-3">
              {navLinks.map((link, idx) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={idx}
                    href={link.href}
                    onClick={link.href === '/' ? handleNewChat : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors duration-150',
                      link.active
                        ? 'bg-light-200 dark:bg-[#222323] text-black dark:text-white font-medium'
                        : 'text-black/60 dark:text-white/60 hover:bg-light-200/60 dark:hover:bg-[#202121] hover:text-black dark:hover:text-white',
                    )}
                  >
                    <Icon size={15} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Scrollable Center: Sessions */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1 text-xs">
              <div>
                <div
                  onClick={() => setIsSessionsOpen(!isSessionsOpen)}
                  className="flex items-center justify-between px-2 py-1 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white cursor-pointer font-medium select-none"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Sessions</span>
                  <ChevronDown
                    size={13}
                    className={cn(
                      'transition-transform duration-200',
                      !isSessionsOpen && '-rotate-90',
                    )}
                  />
                </div>
                {isSessionsOpen && (
                  <div className="mt-1 space-y-0.5">
                    {filteredChats.length === 0 ? (
                      <p className="px-2.5 py-2 text-[11px] text-black/40 dark:text-white/40 italic">
                        {sessionSearch ? 'No matching chats' : 'No past sessions yet'}
                      </p>
                    ) : (
                      filteredChats.slice(0, 40).map((chat) => {
                        const isChatActive = pathname === `/c/${chat.id}`;
                        const isEditing = editingChatId === chat.id;

                        if (isEditing) {
                          return (
                            <div
                              key={chat.id}
                              className="flex items-center gap-1 w-full px-2 py-1 bg-light-200 dark:bg-[#252626] rounded-lg border border-[#20B8CD]/60 my-0.5"
                            >
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(chat.id);
                                  if (e.key === 'Escape') setEditingChatId(null);
                                }}
                                autoFocus
                                className="w-full bg-transparent text-xs text-black dark:text-white focus:outline-none"
                              />
                              <button
                                onClick={() => handleSaveRename(chat.id)}
                                className="text-[#20B8CD] hover:text-[#1ca5b8] p-0.5 transition"
                                title="Save"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={() => setEditingChatId(null)}
                                className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white p-0.5 transition"
                                title="Cancel"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={chat.id}
                            className={cn(
                              'group relative flex items-center justify-between rounded-lg transition-colors duration-150',
                              isChatActive
                                ? 'bg-light-200 dark:bg-[#242525] text-black dark:text-white font-medium'
                                : 'text-black/60 dark:text-white/60 hover:bg-light-200/60 dark:hover:bg-[#202121] hover:text-black dark:hover:text-white',
                            )}
                          >
                            <Link
                              href={`/c/${chat.id}`}
                              onClick={(e) => handleSelectChat(e, chat.id)}
                              className="flex-1 truncate px-2.5 py-1.5 text-xs select-none"
                              title={chat.title}
                            >
                              {chat.title}
                            </Link>

                            {/* 3-Dots Menu Button */}
                            <Menu as="div" className="relative shrink-0 pr-1">
                              {({ open }) => (
                                <>
                                  <MenuButton
                                    onClick={(e) => e.stopPropagation()}
                                    className={cn(
                                      'p-1 rounded-md transition text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-light-300 dark:hover:bg-[#2c2d2d]',
                                      open
                                        ? 'opacity-100 bg-light-300 dark:bg-[#2c2d2d] text-black dark:text-white'
                                        : 'opacity-0 group-hover:opacity-100',
                                    )}
                                    title="More options"
                                  >
                                    <MoreHorizontal size={13} />
                                  </MenuButton>

                                  <MenuItems
                                    anchor="right start"
                                    className="z-50 min-w-[150px] rounded-xl bg-light-primary dark:bg-[#1e1f1f] border border-light-200 dark:border-[#323434] p-1.5 shadow-xl shadow-black/40 focus:outline-none text-xs space-y-0.5"
                                  >
                                    <MenuItem>
                                      {({ focus }) => (
                                        <button
                                          onClick={(e) => handleStartRename(e, chat)}
                                          className={cn(
                                            'flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs transition duration-100 text-black/80 dark:text-white/80',
                                            focus && 'bg-light-200 dark:bg-[#282929] text-black dark:text-white',
                                          )}
                                        >
                                          <Pencil size={13} className="text-black/50 dark:text-white/50" />
                                          <span>Rename</span>
                                        </button>
                                      )}
                                    </MenuItem>
                                    <MenuItem>
                                      {({ focus }) => (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingChat(chat);
                                          }}
                                          className={cn(
                                            'flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs transition duration-100 text-red-400',
                                            focus && 'bg-red-500/10 text-red-400',
                                          )}
                                        >
                                          <Trash2 size={13} className="text-red-400" />
                                          <span>Delete</span>
                                        </button>
                                      )}
                                    </MenuItem>
                                  </MenuItems>
                                </>
                              )}
                            </Menu>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Footer Actions */}
            <div className="pt-2.5 border-t border-light-200/60 dark:border-[#242525]">
              {/* User Profile Bar */}
              <div
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center justify-between px-1.5 py-1 rounded-lg hover:bg-light-200/60 dark:hover:bg-[#202121] cursor-pointer transition group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-medium flex items-center justify-center text-[11px] shadow-xs">
                    s
                  </div>
                  <span className="text-xs font-normal text-black/80 dark:text-white/80">
                    shikhar
                  </span>
                </div>
                <div className="relative p-1 text-black/50 dark:text-white/50 group-hover:text-black dark:group-hover:text-white transition">
                  <Bell size={15} />
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#20B8CD]" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================= COLLAPSED SIDEBAR ================= */
          <div className="flex flex-col items-center justify-between h-full py-3.5 px-1.5">
            {/* Top Group */}
            <div className="flex flex-col items-center space-y-2.5 w-full">
              {/* Top Logo / Expand on Hover */}
              <div
                onClick={toggleSidebar}
                className="relative group w-8 h-8 flex items-center justify-center rounded-lg hover:bg-light-200 dark:hover:bg-[#252626] cursor-pointer transition-colors duration-150"
                title="Expand sidebar"
              >
                {/* Default Asterisk Logo */}
                <div className="transition-opacity duration-150 group-hover:opacity-0 flex items-center justify-center text-black dark:text-white">
                  <SiPerplexity size={18} />
                </div>

                {/* Hover Expand Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-black/80 dark:text-white/80">
                  <PanelLeft size={16} strokeWidth={2} />
                </div>
              </div>

              {/* + Circular Button */}
              <button
                onClick={handleNewChat}
                className="w-7 h-7 rounded-full bg-light-200 dark:bg-[#252626] text-black/70 dark:text-white/80 flex items-center justify-center hover:bg-light-300 dark:hover:bg-[#303232] hover:text-black dark:hover:text-white transition-all duration-150 shadow-xs active:scale-95"
                title="New Thread"
              >
                <Plus size={14} strokeWidth={2.2} />
              </button>

              {/* Primary Icon Links */}
              <div className="flex flex-col items-center space-y-1 w-full pt-0.5">
                {navLinks.map((link, idx) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={idx}
                      href={link.href}
                      onClick={link.href === '/' ? handleNewChat : undefined}
                      className={cn(
                        'w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150',
                        link.active
                          ? 'bg-light-200 dark:bg-[#252626] text-black dark:text-white'
                          : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-200/60 dark:hover:bg-[#202121]',
                      )}
                      title={link.label}
                    >
                      <Icon size={16} strokeWidth={1.8} />
                    </Link>
                  );
                })}

                {/* Sessions / History Icon */}
                <button
                  onClick={toggleSidebar}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-200/60 dark:hover:bg-[#202121] transition-colors duration-150"
                  title="Sessions"
                >
                  <History size={16} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {/* Bottom Group */}
            <div className="flex flex-col items-center space-y-2.5 w-full pb-0.5">
              {/* Bell Icon with Cyan Dot */}
              <div
                onClick={() => setIsSettingsOpen(true)}
                className="relative w-8 h-8 flex items-center justify-center text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-200/60 dark:hover:bg-[#202121] rounded-lg transition cursor-pointer"
                title="Notifications"
              >
                <Bell size={16} strokeWidth={1.8} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#20B8CD]" />
              </div>

              {/* Purple S Avatar */}
              <div
                onClick={() => setIsSettingsOpen(true)}
                className="w-6 h-6 rounded-full bg-purple-600 text-white font-medium flex items-center justify-center text-[11px] cursor-pointer hover:opacity-90 transition shadow-xs"
                title="shikhar"
              >
                s
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsDialogue
            isOpen={isSettingsOpen}
            setIsOpen={setIsSettingsOpen}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <Transition appear show={!!deletingChat} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => {
            if (!isDeleting) setDeletingChat(null);
          }}
        >
          <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-100"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-sm transform rounded-2xl bg-light-primary dark:bg-[#1e1f1f] border border-light-200 dark:border-[#323434] p-5 text-left align-middle shadow-2xl transition-all">
                  <DialogTitle className="text-base font-medium text-black dark:text-white">
                    Delete Thread?
                  </DialogTitle>
                  <p className="mt-2 text-xs text-black/60 dark:text-white/60 leading-relaxed">
                    This will permanently delete &ldquo;{deletingChat?.title}&rdquo; and its entire conversation history. This action cannot be undone.
                  </p>
                  <div className="flex items-center justify-end gap-2 mt-5">
                    <button
                      disabled={isDeleting}
                      onClick={() => setDeletingChat(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-black/60 dark:text-white/60 hover:bg-light-200 dark:hover:bg-[#282929] hover:text-black dark:hover:text-white transition"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isDeleting}
                      onClick={handleDeleteChat}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Layout>{children}</Layout>
    </div>
  );
};

export default Sidebar;
