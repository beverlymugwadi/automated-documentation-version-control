import { Github } from 'lucide-react';
import { Badge } from './ui';
import type { Version } from '../lib/versions';
import { relativeTime } from '../lib/time';

export function CommitRail({
  versions,
  activeVersion,
  highlightVersion,
  onSelect,
}: {
  versions: Version[];
  activeVersion: number;
  highlightVersion?: number;
  onSelect: (versionNo: number) => void;
}) {
  return (
    <div className="rail" role="list" aria-label="Version history">
      {versions.map((v) => {
        const active = v.versionNo === activeVersion;
        const highlight = v.versionNo === highlightVersion;
        return (
          <button
            key={v.versionId}
            className={`rail__node ${active ? 'rail__node--active' : ''} ${highlight ? 'rail__node--new' : ''}`}
            onClick={() => onSelect(v.versionNo)}
            role="listitem"
            aria-current={active}
          >
            <span className="rail__dot" />
            <span className="rail__body">
              <span className="rail__top">
                <Badge tone={active ? 'signal' : 'neutral'} mono>v{v.versionNo}</Badge>
                {v.commitHash && <span className="tag-mono">{v.commitHash.slice(0, 7)}</span>}
                {v.externalCommit && (
                  
                    href={v.externalCommit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rail__published"
                    title={`Published to GitHub @ ${v.externalCommit.sha?.slice(0, 7)}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Github size={12} /> {v.externalCommit.sha?.slice(0, 7)}
                  </a>
                )}
              </span>
              <span className="rail__msg">{v.message || 'Version'}</span>
              <span className="rail__meta">
                {v.author?.avatarUrl && <img src={v.author.avatarUrl} alt="" className="rail__avatar" />}
                {v.author?.login ? `committed by @${v.author.login} · ` : ''}
                {relativeTime(v.createdAt)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}