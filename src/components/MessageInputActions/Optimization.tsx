import { BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/lib/hooks/useChat';

interface OptimizationProps {
  placement?: 'top' | 'bottom';
}

const Optimization = ({ placement = 'bottom' }: OptimizationProps) => {
  const { optimizationMode, setOptimizationMode } = useChat();

  const isDeep = optimizationMode === 'deep';

  const toggleDeepResearch = () => {
    // If currently deep, toggle back to speed (quick search), otherwise enable deep
    setOptimizationMode(isDeep ? 'speed' : 'deep');
  };

  return (
    <button
      type="button"
      onClick={toggleDeepResearch}
      title={
        isDeep
          ? 'Deep Research enabled (multi-turn autonomous investigation)'
          : 'Enable Deep Research mode'
      }
      className={cn(
        'flex flex-row items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition duration-200 cursor-pointer active:scale-95 border',
        isDeep
          ? 'bg-[#20B8CD]/15 border-[#20B8CD]/50 text-[#20B8CD] dark:bg-[#20B8CD]/20 dark:border-[#20B8CD]/60 dark:text-[#20B8CD]'
          : 'bg-light-secondary/60 dark:bg-dark-secondary/60 border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-secondary dark:hover:bg-dark-secondary',
      )}
    >
      <BrainCircuit
        size={15}
        className={cn(
          'transition duration-200',
          isDeep ? 'text-[#20B8CD]' : 'text-black/50 dark:text-white/50',
        )}
      />
      <span>Deep Research</span>
    </button>
  );
};

export default Optimization;
