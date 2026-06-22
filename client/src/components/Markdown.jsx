import CodeBlock from './CodeBlock';

function parseInline(text) {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return text;
}

export default function Markdown({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const language = line.slice(3).trim() || 'javascript';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <CodeBlock key={i} code={codeLines.join('\n')} language={language} />
      );
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('#### ')) {
      elements.push(<h4 key={i} dangerouslySetInnerHTML={{ __html: parseInline(line.slice(5)) }} />);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} dangerouslySetInnerHTML={{ __html: parseInline(line.slice(4)) }} />);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} dangerouslySetInnerHTML={{ __html: parseInline(line.slice(3)) }} />);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} dangerouslySetInnerHTML={{ __html: parseInline(line.slice(2)) }} />);

    // Blockquote
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i}>{line.slice(2)}</blockquote>);

    // Bullet list
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={i} dangerouslySetInnerHTML={{ __html: parseInline(line.slice(2)) }} />
      );

    // Horizontal rule
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} />);

    // Empty line
    } else if (line.trim() === '') {
      elements.push(<br key={i} />);

    // Normal paragraph
    } else {
      elements.push(
        <p key={i} dangerouslySetInnerHTML={{ __html: parseInline(line) }} />
      );
    }

    i++;
  }

  return <div className="markdown-body">{elements}</div>;
}