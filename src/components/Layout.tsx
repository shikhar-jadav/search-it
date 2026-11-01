'use client';

import { useSidebar } from '@/lib/hooks/useSidebar';
import { cn } from '@/lib/utils';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { isExpanded } = useSidebar();

  return (
    <main
      className={cn(
        'bg-light-primary dark:bg-dark-primary min-h-screen transition-[padding] duration-300 ease-in-out',
        isExpanded ? 'pl-[50px] lg:pl-[240px]' : 'pl-[50px]',
      )}
    >
      <div className="max-w-screen-lg lg:mx-auto mx-4">{children}</div>
    </main>
  );
};

export default Layout;
