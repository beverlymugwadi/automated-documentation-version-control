import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';

const ALIAS: Record<string, string> = {
  js: 'javascript', ts: 'typescript', mjs: 'javascript', cjs: 'javascript',
  jsx: 'jsx', tsx: 'tsx', md: 'markdown', mdx: 'markdown', sh: 'bash', shell: 'bash',
};

export function langFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return ALIAS[ext] ?? 'typescript';
}

interface CodeBlockProps {
  code: string;
  lang?: string;
  filename?: string;
  showLineNumbers?: boolean;
  bar?: boolean;
}

export function CodeBlock({ code, lang = 'typescript', filename, showLineNumbers = false, bar = true }: CodeBlockProps) {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const language = ALIAS[lang] ?? lang;

  useEffect(() => {
    if (ref.current) Prism.highlightElement(ref.current);
  }, [code, language]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const lines = code.split('\n');

  return (
    <div className="codeblock">
      {bar && (
        <div className="codeblock__bar">
          <span className="mono">{filename ?? language}</span>
          <button className="codeblock__copy" onClick={copy} aria-label="Copy code">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      <div className="codeblock__scroll">
        {showLineNumbers && (
          <div className="codeblock__gutter" aria-hidden>
            {lines.map((_, i) => <span key={i}>{i + 1}</span>)}
          </div>
        )}
        <pre className={`language-${language}`}>
          <code ref={ref} className={`language-${language}`}>{code}</code>
        </pre>
      </div>
    </div>
  );
}