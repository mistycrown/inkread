import React from 'react';

// Common classes
const BASE_BORDER = "border-2 border-zinc-800 rounded-sm";
const WOBBLY_SHADOW = "shadow-[3px_3px_0px_0px_rgba(40,40,40,1)] hover:shadow-[1px_1px_0px_0px_rgba(40,40,40,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all active:shadow-none active:translate-x-[3px] active:translate-y-[3px]";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const SketchButton: React.FC<ButtonProps> = ({ children, className, variant = 'primary', ...props }) => {
  const bg = variant === 'primary' ? 'bg-[#FFDE59]' : variant === 'danger' ? 'bg-[#FF5757]' : 'bg-white';
  const text = variant === 'danger' ? 'text-white' : 'text-zinc-900';

  return (
    <button 
      className={`font-hand text-lg px-4 py-2 ${BASE_BORDER} ${WOBBLY_SHADOW} ${bg} ${text} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const SketchInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => {
  return (
    <input 
      className={`bg-transparent border-b-2 border-zinc-800 focus:outline-none focus:border-zinc-500 py-2 px-1 font-serif text-lg w-full ${className || ''}`}
      {...props}
    />
  );
};

export const SketchTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, ...props }) => {
  return (
    <textarea 
      className={`bg-white/50 border-2 border-zinc-800 focus:outline-none focus:border-zinc-500 p-3 font-serif text-lg w-full resize-none rounded-sm ${className || ''}`}
      {...props}
    />
  );
};

export const SketchSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...props }) => {
  return (
    <div className="relative">
      <select
        className={`appearance-none bg-white border-2 border-zinc-800 rounded-sm py-2 px-4 pr-8 font-hand text-lg w-full focus:outline-none focus:border-zinc-500 ${className || ''}`}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-800">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  );
};

export const SketchCard: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-4 ${BASE_BORDER} ${onClick ? 'cursor-pointer hover:bg-zinc-50 transition-colors' : ''} ${className || ''}`}
    >
      {children}
    </div>
  );
};

export const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-800"></div>
  </div>
);

// Lightweight Markdown Renderer
export const SketchMarkdown: React.FC<{ content: string }> = ({ content }) => {
    if (!content) return null;

    const renderLine = (line: string, index: number) => {
        // Headers
        if (line.startsWith('# ')) return <h1 key={index} className="text-2xl font-bold font-serif my-3 pb-1 border-b-2 border-zinc-200">{line.slice(2)}</h1>;
        if (line.startsWith('## ')) return <h2 key={index} className="text-xl font-bold font-serif my-2 text-zinc-800">{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={index} className="text-lg font-bold font-serif my-2 text-zinc-700">{line.slice(4)}</h3>;
        
        // Lists (unordered)
        if (line.match(/^[-*] /)) {
            return (
                <div key={index} className="flex gap-2 ml-4 my-1">
                    <span className="text-zinc-500 font-bold">•</span>
                    <span dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />
                </div>
            );
        }

        // Blockquotes
        if (line.startsWith('> ')) {
            return <div key={index} className="border-l-4 border-[#FFDE59] pl-3 italic text-zinc-600 my-2">{line.slice(2)}</div>;
        }

        // Empty line
        if (line.trim() === '') return <br key={index} />;

        // Paragraph
        return <div key={index} className="mb-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />;
    };

    // Helper for Bold, Italic, Link, Code
    const formatInline = (text: string) => {
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/`([^`]+)`/g, '<code class="bg-zinc-200 px-1 rounded font-mono text-sm text-red-700">$1</code>'); // Code
        
        // Links: [text](url)
        formatted = formatted.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g, 
            '<a href="$2" target="_blank" class="text-blue-700 underline decoration-wavy decoration-1 underline-offset-2 hover:text-blue-900">$1</a>'
        );
        
        // Auto-link raw URLs if not already linked (simple fallback)
        formatted = formatted.replace(
            /(?<!href="|">)(https?:\/\/[^\s<]+)/g,
            '<a href="$1" target="_blank" class="text-blue-700 underline decoration-wavy decoration-1 underline-offset-2 break-all">$1</a>'
        );

        return formatted;
    };

    return (
        <div className="font-serif text-lg text-zinc-800">
            {content.split('\n').map((line, i) => renderLine(line, i))}
        </div>
    );
};