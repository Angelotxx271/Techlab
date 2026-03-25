import ReactMarkdown from 'react-markdown';

interface MarkdownProps {
  children: string;
}

export default function Markdown({ children }: MarkdownProps) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="text-xl font-bold text-lc-text mt-4 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold text-lc-text mt-3 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold text-lc-text mt-3 mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-3 leading-relaxed text-lc-text/90">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-lc-accent">{children}</strong>,
        em: ({ children }) => <em className="italic text-lc-text/80">{children}</em>,
        ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-lc-text/90 leading-relaxed">{children}</li>,
        code: ({ children, node }) => {
          const isBlock = node?.position && node.position.start.line !== node.position.end.line;
          if (isBlock) {
            return (
              <pre className="mb-3 overflow-x-auto rounded-lg bg-lc-code p-4 text-sm">
                <code className="font-mono text-lc-text/90">{children}</code>
              </pre>
            );
          }
          return (
            <code className="rounded bg-lc-code px-1.5 py-0.5 font-mono text-sm text-lc-accent">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-2 border-lc-accent/50 pl-4 italic text-lc-muted">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-lc-border" />,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-lc-accent underline hover:opacity-80">
            {children}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
