import { Check, Copy as CopyIcon } from 'lucide-react';
import { Message } from '../ChatWindow';
import { useState } from 'react';
import { Section } from '@/lib/hooks/useChat';
import { SourceBlock } from '@/lib/types';

const Copy = ({
  section,
  initialMessage,
}: {
  section: Section;
  initialMessage: string;
}) => {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        const sources = section.message.responseBlocks.filter(
          (b) => b.type === 'source' && b.data.length > 0,
        ) as SourceBlock[];

        const contentToCopy = `${initialMessage}${
          sources.length > 0
            ? `\n\nCitations:\n${sources
                .map((source) => source.data)
                .flat()
                .map(
                  (s, i) =>
                    `[${i + 1}] ${s.metadata.url.startsWith('file_id://') ? s.metadata.fileName || 'Uploaded File' : s.metadata.url}`,
                )
                .join(`\n`)}`
            : ''
        }`;

        navigator.clipboard.writeText(contentToCopy);

        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="p-1.5 text-black/50 dark:text-white/40 rounded-lg hover:bg-light-200 dark:hover:bg-[#202222] transition duration-200 hover:text-black dark:hover:text-white flex items-center justify-center"
      title="Copy answer"
    >
      {copied ? <Check size={16} className="text-[#20B8CD]" /> : <CopyIcon size={16} />}
    </button>
  );
};

export default Copy;
