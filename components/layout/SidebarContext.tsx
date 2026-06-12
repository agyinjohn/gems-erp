'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'gems-sidebar-collapsed';

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

type SidebarContextValue = {
  open: boolean;
  collapsed: boolean;
  setOpen: (open: boolean) => void;
  toggleCollapsed: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ open, collapsed, setOpen, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
