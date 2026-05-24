interface HighlightProps {
  text: string;
  query?: string;
  className?: string;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function Highlight({ text, query, className }: HighlightProps) {
  const q = (query ?? "").trim();
  if (!q) return <span className={className}>{text}</span>;
  const tokens = Array.from(new Set(q.split(/\s+/).filter((t) => t.length > 1)));
  if (tokens.length === 0) return <span className={className}>{text}</span>;
  const re = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        re.test(part) ? (
          <mark
            key={i}
            className="bg-saffron/30 text-foreground rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
