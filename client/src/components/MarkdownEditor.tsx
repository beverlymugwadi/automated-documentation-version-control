import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { useThemeStore } from '../store/themeStore';

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const theme = useThemeStore((s) => s.theme);

  const editorTheme = EditorView.theme(
    {
      '&': { backgroundColor: cssVar('--surface-2'), color: cssVar('--text'), fontSize: '13px' },
      '.cm-content': { fontFamily: cssVar('--font-mono'), caretColor: cssVar('--signal') },
      '.cm-gutters': { backgroundColor: 'transparent', color: cssVar('--faint'), border: 'none' },
      '.cm-activeLine': { backgroundColor: 'transparent' },
      '.cm-activeLineGutter': { backgroundColor: 'transparent', color: cssVar('--muted') },
      '&.cm-focused': { outline: 'none' },
      '.cm-selectionBackground, ::selection': { backgroundColor: cssVar('--signal-soft') },
    },
    { dark: theme === 'dark' },
  );

  return (
    <div className="cm-wrap">
      <CodeMirror
        value={value}
        height="58vh"
        theme={theme === 'dark' ? 'dark' : 'light'}
        extensions={[markdown(), editorTheme, EditorView.lineWrapping]}
        onChange={onChange}
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
      />
    </div>
  );
}