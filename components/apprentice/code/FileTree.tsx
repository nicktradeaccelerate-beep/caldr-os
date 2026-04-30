'use client';

import { useState } from 'react';
import type { SandboxFile } from '@/hooks/useSandboxFiles';

interface Props {
  files: SandboxFile[];
  activeFile: string;
  onSelect: (name: string) => void;
  onAdd: (name: string) => void;
  onDelete: (name: string) => void;
}

const FILE_ICONS: Record<string, string> = {
  html: '🌐', css: '🎨', js: '⚡', ts: '🔷', tsx: '🔷', jsx: '⚡',
  json: '{}', md: '📝',
};

function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICONS[ext] ?? '📄';
}

export default function FileTree({ files, activeFile, onSelect, onAdd, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [hovering, setHovering] = useState<string | null>(null);

  function commitAdd() {
    if (newName.trim()) onAdd(newName.trim());
    setNewName('');
    setAdding(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Sandbox
        </span>
        <button
          onClick={() => setAdding(true)}
          title="New file"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: '#94A3B8', fontSize: 14, lineHeight: 1 }}
        >
          +
        </button>
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {files.map(f => (
          <div
            key={f.name}
            onClick={() => onSelect(f.name)}
            onMouseEnter={() => setHovering(f.name)}
            onMouseLeave={() => setHovering(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 14px',
              cursor: 'pointer',
              background: f.name === activeFile ? '#EFF6FF' : hovering === f.name ? '#F8FAFC' : 'transparent',
              borderLeft: `2px solid ${f.name === activeFile ? '#1D4ED8' : 'transparent'}`,
              transition: 'all 0.1s',
            }}
          >
            <span style={{ fontSize: 11, flexShrink: 0 }}>{fileIcon(f.name)}</span>
            <span style={{
              fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: f.name === activeFile ? '#1D4ED8' : '#334155',
              fontWeight: f.name === activeFile ? 600 : 400,
            }}>
              {f.name}
            </span>
            {files.length > 1 && hovering === f.name && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(f.name); }}
                title="Delete file"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px',
                  color: '#94A3B8', fontSize: 11, flexShrink: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}

        {/* New file input */}
        {adding && (
          <div style={{ padding: '4px 14px' }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitAdd();
                if (e.key === 'Escape') { setAdding(false); setNewName(''); }
              }}
              onBlur={commitAdd}
              placeholder="filename.js"
              style={{
                width: '100%', fontSize: 12, padding: '4px 8px',
                border: '1px solid #1D4ED8', borderRadius: 4, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
