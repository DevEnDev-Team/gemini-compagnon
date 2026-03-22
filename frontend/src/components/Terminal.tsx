import { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, ChevronUp, ChevronDown } from 'lucide-react';

interface TerminalProps {
  output: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function Terminal({ output, isOpen, onToggle }: TerminalProps) {
  const scrollRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className={`terminal-container ${isOpen ? 'open' : 'closed'}`}>
      <div className="terminal-header" onClick={onToggle}>
        <div className="terminal-title">
          <TerminalIcon size={16} />
          <span>Terminal de sortie</span>
        </div>
        <div className="terminal-controls">
          {isOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </div>
      </div>
      
      <pre className="terminal-output" ref={scrollRef}>
        {output || '$ Attente d\'activité...'}
      </pre>
    </div>
  );
}
