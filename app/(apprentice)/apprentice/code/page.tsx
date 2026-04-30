'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic_import from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ThreeColumnWorkSurface from '@/components/shared/ThreeColumnWorkSurface';
import FileTree from '@/components/apprentice/code/FileTree';
import TeachGuideChat from '@/components/apprentice/code/TeachGuideChat';
import { useSandboxFiles } from '@/hooks/useSandboxFiles';

// Monaco dynamically imported — it's a large bundle
const MonacoEditor = dynamic_import(
  () => import('@monaco-editor/react').then(m => m.default),
  { ssr: false, loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: 13 }}>
      Loading editor…
    </div>
  )}
);

// Whitelisted CDNs for sandbox
const ALLOWED_CDNS = ['cdnjs.cloudflare.com', 'esm.sh', 'cdn.jsdelivr.net', 'unpkg.com'];

function buildSandboxSrcdoc(files: { name: string; content: string }[], entryFile: string): string {
  const entry = files.find(f => f.name === entryFile);
  if (!entry) return '<p style="padding:16px;color:#64748B">No file selected</p>';

  const ext = entryFile.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'html') {
    // Inline CSS and JS from sibling files referenced in the HTML
    let html = entry.content;
    files.forEach(f => {
      const cssExt = f.name.endsWith('.css');
      const jsExt = f.name.endsWith('.js') || f.name.endsWith('.ts');
      if (cssExt) {
        html = html.replace(
          new RegExp(`<link[^>]*href=["']${f.name}["'][^>]*>`, 'gi'),
          `<style>${f.content}</style>`
        );
      }
      if (jsExt) {
        html = html.replace(
          new RegExp(`<script[^>]*src=["']${f.name}["'][^>]*></script>`, 'gi'),
          `<script>${f.content}</script>`
        );
      }
    });
    return html;
  }

  if (ext === 'css') {
    return `<!DOCTYPE html><html><head><style>${entry.content}</style></head><body><div id="preview">CSS preview — add HTML to see styled content</div></body></html>`;
  }

  if (ext === 'js' || ext === 'ts') {
    // Check for JSX/React
    const isReact = entry.content.includes('React') || entry.content.includes('jsx') || entry.content.includes('tsx');
    if (isReact) {
      return `<!DOCTYPE html><html><head>
<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head><body><div id="root"></div>
<script type="text/babel">
${entry.content}
</script></body></html>`;
    }
    return `<!DOCTYPE html><html><body><script>${entry.content}</script></body></html>`;
  }

  // Default: show as text
  return `<!DOCTYPE html><html><body><pre style="padding:16px;font-family:monospace;white-space:pre-wrap">${entry.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></body></html>`;
}

type Mode = 'teach' | 'generate';

export default function ApprenticeCodePage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('teach');
  const [showPreview, setShowPreview] = useState(false);
  const [sandboxSrc, setSandboxSrc] = useState('');
  const [runCount, setRunCount] = useState(0);

  const { files, activeFile, currentFile, updateFile, addFile, deleteFile, switchFile } = useSandboxFiles(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);
    });
  }, []);

  function runSandbox() {
    setSandboxSrc(buildSandboxSrcdoc(files, activeFile));
    setShowPreview(true);
    setRunCount(c => c + 1);
  }

  function applyCode(code: string) {
    updateFile(activeFile, code);
  }

  // ─── Toolbar ─────────────────────────────────────────────────────────────────
  const toolbar = (
    <div style={{ padding: '0 16px', height: 44, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Code</span>
      <span style={{ color: '#CBD5E1', fontSize: 12 }}>/</span>
      <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{activeFile}</span>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Mode indicator */}
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
          background: mode === 'teach' ? 'rgba(184,148,31,0.1)' : 'rgba(29,78,216,0.08)',
          color: mode === 'teach' ? '#B8941F' : '#1D4ED8',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {mode === 'teach' ? 'Teach' : 'Generate'}
        </span>

        {/* Preview toggle */}
        <button
          onClick={() => setShowPreview(v => !v)}
          style={{
            padding: '5px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
            background: showPreview ? '#EFF6FF' : 'white',
            border: `1px solid ${showPreview ? '#1D4ED8' : '#E2E8F0'}`,
            color: showPreview ? '#1D4ED8' : '#64748B', fontWeight: 600,
          }}
        >
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>

        {/* Run */}
        <button
          onClick={runSandbox}
          style={{
            padding: '5px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6,
            background: '#1B4332', color: 'white', border: 'none', cursor: 'pointer',
          }}
        >
          Run ▶
        </button>
      </div>
    </div>
  );

  // ─── Left rail: file tree ─────────────────────────────────────────────────────
  const leftRail = (
    <FileTree
      files={files}
      activeFile={activeFile}
      onSelect={switchFile}
      onAdd={addFile}
      onDelete={deleteFile}
    />
  );

  // ─── Centre: Monaco editor + optional preview ─────────────────────────────────
  const centre = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Editor pane */}
      <div style={{ flex: showPreview ? '0 0 55%' : '1', minHeight: 0, overflow: 'hidden' }}>
        <MonacoEditor
          key={activeFile}
          language={currentFile?.language ?? 'javascript'}
          value={currentFile?.content ?? ''}
          onChange={v => { if (v !== undefined) updateFile(activeFile, v); }}
          theme="vs-light"
          options={{
            fontSize: 13,
            lineHeight: 22,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 },
            fontFamily: "'Courier Prime', 'Fira Code', 'Courier New', monospace",
            fontLigatures: true,
            renderLineHighlight: 'line',
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { vertical: 'auto', horizontal: 'auto' },
          }}
        />
      </div>

      {/* Sandbox preview pane */}
      {showPreview && (
        <>
          <div style={{ height: 1, background: '#E2E8F0', flexShrink: 0 }} />
          <div style={{ flex: 1, minHeight: 0, position: 'relative', background: 'white' }}>
            <div style={{
              position: 'absolute', top: 8, left: 12, zIndex: 5,
              fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              Preview
            </div>
            {sandboxSrc ? (
              <iframe
                key={runCount}
                srcDoc={sandboxSrc}
                sandbox="allow-scripts allow-modals"
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                title="Sandbox preview"
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: 13 }}>
                Press Run to execute
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  // ─── Right panel: Teach/Generate guide chat ───────────────────────────────────
  const rightPanel = (
    <TeachGuideChat
      mode={mode}
      onModeChange={setMode}
      userId={userId}
      activeFileName={activeFile}
      activeFileContent={currentFile?.content ?? ''}
      onApplyCode={applyCode}
    />
  );

  return (
    <ThreeColumnWorkSurface
      leftRail={leftRail}
      centre={centre}
      rightPanel={rightPanel}
      leftDefaultWidth={220}
      rightDefaultWidth={360}
      storageKey="apprentice-code"
      topToolbar={toolbar}
      leftBg="white"
      centreBg="#F8FAFC"
    />
  );
}
