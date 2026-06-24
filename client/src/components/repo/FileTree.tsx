import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode2, File, Check } from 'lucide-react';
import type { TreeNode } from '../../lib/github';

interface FileTreeProps {
  nodes: TreeNode[];
  activePath: string | null;
  stagedPaths: Set<string>;
  onSelect: (path: string) => void;
}

interface DirItem {
  kind: 'dir';
  name: string;
  path: string;
  children: TreeItem[];
}

interface FileItem {
  kind: 'file';
  name: string;
  path: string;
  documentable: boolean;
}

type TreeItem = DirItem | FileItem;

function buildTree(nodes: TreeNode[]): TreeItem[] {
  const dirMap = new Map<string, DirItem>();
  const root: TreeItem[] = [];

  const sorted = [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const node of sorted) {
    const parts = node.path.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    const item: TreeItem =
      node.type === 'dir'
        ? { kind: 'dir', name, path: node.path, children: [] }
        : { kind: 'file', name, path: node.path, documentable: node.documentable };

    if (item.kind === 'dir') dirMap.set(node.path, item);

    const parent = parentPath ? dirMap.get(parentPath) : undefined;
    if (parent) parent.children.push(item);
    else root.push(item);
  }

  return root;
}

function DirEntry({
  node, depth, activePath, stagedPaths, onSelect,
}: { node: DirItem; depth: number; activePath: string | null; stagedPaths: Set<string>; onSelect: (p: string) => void }) {
  const [open, setOpen] = useState(true);
  const indent = 8 + depth * 14;

  return (
    <>
      <button className="filetree__node" style={{ paddingLeft: indent }} onClick={() => setOpen((o) => !o)}>
        <span className="filetree__icon">{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
        <span className="filetree__icon">{open ? <FolderOpen size={14} /> : <Folder size={14} />}</span>
        {node.name}
      </button>
      {open && node.children.map((child) =>
        child.kind === 'dir' ? (
          <DirEntry key={child.path} node={child} depth={depth + 1} activePath={activePath} stagedPaths={stagedPaths} onSelect={onSelect} />
        ) : (
          <FileEntry key={child.path} node={child} depth={depth + 1} activePath={activePath} stagedPaths={stagedPaths} onSelect={onSelect} />
        ),
      )}
    </>
  );
}

function FileEntry({
  node, depth, activePath, stagedPaths, onSelect,
}: { node: FileItem; depth: number; activePath: string | null; stagedPaths: Set<string>; onSelect: (p: string) => void }) {
  const isActive = node.path === activePath;
  const isStaged = stagedPaths.has(node.path);
  const indent = 8 + depth * 14;

  return (
    <button
      className={`filetree__node${isActive ? ' filetree__node--active' : ''}${!node.documentable ? ' filetree__node--dim' : ''}`}
      style={{ paddingLeft: indent }}
      onClick={() => { if (node.documentable) onSelect(node.path); }}
    >
      <span className="filetree__icon">
        {node.documentable ? <FileCode2 size={14} /> : <File size={14} />}
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
      {isStaged && <Check size={12} className="filetree__check" />}
    </button>
  );
}

export function FileTree({ nodes, activePath, stagedPaths, onSelect }: FileTreeProps) {
  const tree = buildTree(nodes);

  if (tree.length === 0) {
    return (
      <div className="filetree">
        <span className="muted" style={{ display: 'block', padding: 'var(--sp-3)', fontSize: 'var(--text-sm)' }}>
          No files found.
        </span>
      </div>
    );
  }

  return (
    <div className="filetree">
      {tree.map((item) =>
        item.kind === 'dir' ? (
          <DirEntry key={item.path} node={item} depth={0} activePath={activePath} stagedPaths={stagedPaths} onSelect={onSelect} />
        ) : (
          <FileEntry key={item.path} node={item} depth={0} activePath={activePath} stagedPaths={stagedPaths} onSelect={onSelect} />
        ),
      )}
    </div>
  );
}
