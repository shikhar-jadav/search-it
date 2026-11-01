'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface SidebarChat {
  id: string;
  title: string;
  createdAt: string;
}

interface SidebarContextType {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  toggleSidebar: () => void;
  recentChats: SidebarChat[];
  refreshRecentChats: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isExpanded: true,
  setIsExpanded: () => {},
  toggleSidebar: () => {},
  recentChats: [],
  refreshRecentChats: async () => {},
  searchQuery: '',
  setSearchQuery: () => {},
});

export const SidebarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isExpanded, setIsExpandedState] = useState<boolean>(true);
  const [recentChats, setRecentChats] = useState<SidebarChat[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_expanded');
    if (saved !== null) {
      setIsExpandedState(saved === 'true');
    }
  }, []);

  const setIsExpanded = (expanded: boolean) => {
    setIsExpandedState(expanded);
    localStorage.setItem('sidebar_expanded', String(expanded));
  };

  const toggleSidebar = () => {
    setIsExpandedState((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_expanded', String(next));
      return next;
    });
  };

  const refreshRecentChats = async () => {
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        setRecentChats(data.chats || []);
      }
    } catch (err) {
      console.error('Failed to fetch recent chats for sidebar:', err);
    }
  };

  useEffect(() => {
    refreshRecentChats();

    const handleChatUpdated = () => {
      refreshRecentChats();
    };

    window.addEventListener('chat-updated', handleChatUpdated);
    return () => {
      window.removeEventListener('chat-updated', handleChatUpdated);
    };
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isExpanded,
        setIsExpanded,
        toggleSidebar,
        recentChats,
        refreshRecentChats,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);
