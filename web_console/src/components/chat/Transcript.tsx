import { MessageCard } from './MessageCard';

export interface TranscriptItem {
  role: 'user' | 'assistant' | 'tool' | 'system';
  title: string;
  content: string;
  isStreaming?: boolean;
}

interface TranscriptProps {
  items: TranscriptItem[];
}

export function Transcript({ items }: TranscriptProps) {
  return (
    <section className="chat-panel" aria-label="Transcript">
      <div className="transcript-list">
        {items.map((item, index) => (
          <MessageCard key={`${item.role}-${index}-${item.title}`} role={item.role} title={item.title} content={item.content} isStreaming={item.isStreaming} />
        ))}
      </div>
    </section>
  );
}
