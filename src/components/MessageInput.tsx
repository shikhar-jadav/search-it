import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Sources from './MessageInputActions/Sources';
import Optimization from './MessageInputActions/Optimization';
import Attach from './MessageInputActions/Attach';
import { useChat } from '@/lib/hooks/useChat';
import ModelSelector from './MessageInputActions/ChatModelSelector';

const MessageInput = () => {
  const { loading, sendMessage } = useChat();
  const [message, setMessage] = useState('');

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;

      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable');

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <form
      onSubmit={(e) => {
        if (loading) return;
        e.preventDefault();
        sendMessage(message);
        setMessage('');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey && !loading) {
          e.preventDefault();
          sendMessage(message);
          setMessage('');
        }
      }}
      className="w-full"
    >
      <div className="relative z-10 flex flex-col bg-white dark:bg-[#202222] px-4 pt-3.5 pb-3.5 rounded-2xl w-full border border-light-300/80 dark:border-white/15 shadow-xl shadow-black/5 dark:shadow-[0_8px_32px_rgba(0,0,0,0.65)] transition-all duration-200 focus-within:border-[#20B8CD]/60 dark:focus-within:border-white/30">
        <TextareaAutosize
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minRows={2}
          className="px-1 bg-transparent placeholder:text-[15px] placeholder:text-black/40 dark:placeholder:text-white/40 text-[15px] text-black dark:text-white resize-none focus:outline-none w-full max-h-24 lg:max-h-36 xl:max-h-48 leading-relaxed"
          placeholder="Ask a follow-up..."
        />
        <div className="flex flex-row items-center justify-between mt-4">
          <Optimization placement="top" />
          <div className="flex flex-row items-center space-x-2">
            <div className="flex flex-row items-center space-x-1">
              <Sources placement="top" />
              <ModelSelector placement="top" />
              <Attach placement="top" />
            </div>
            <button
              disabled={message.trim().length === 0 || loading}
              className="bg-[#20B8CD] text-black font-semibold disabled:text-black/30 dark:disabled:text-white/30 disabled:bg-[#e0e0dc] dark:disabled:bg-[#2e3030] hover:bg-[#1ca5b8] transition duration-150 rounded-full p-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default MessageInput;
