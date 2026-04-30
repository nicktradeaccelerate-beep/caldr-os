'use client';

import { useState, useCallback, useEffect } from 'react';

export interface SandboxFile {
  name: string;
  content: string;
  language: string;
}

const DEFAULT_FILES: SandboxFile[] = [
  {
    name: 'index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sandbox</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello</h1>
  <script src="script.js"></script>
</body>
</html>`,
  },
  {
    name: 'style.css',
    language: 'css',
    content: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  color: #1a1a1a;
}

h1 {
  font-size: 24px;
  font-weight: 600;
}`,
  },
  {
    name: 'script.js',
    language: 'javascript',
    content: `// Your JavaScript here
console.log('Sandbox ready');`,
  },
];

function extToLanguage(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    html: 'html', css: 'css', json: 'json', md: 'markdown',
  };
  return map[ext] ?? 'plaintext';
}

function storageKey(userId: string) {
  return `caldr:sandbox:${userId}`;
}

export function useSandboxFiles(userId: string | null) {
  const [files, setFiles] = useState<SandboxFile[]>(DEFAULT_FILES);
  const [activeFile, setActiveFile] = useState<string>('index.html');

  // Load from localStorage on mount
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as { files: SandboxFile[]; active: string };
        if (parsed.files?.length) {
          setFiles(parsed.files);
          setActiveFile(parsed.active ?? parsed.files[0].name);
        }
      }
    } catch { /* use defaults */ }
  }, [userId]);

  // Persist to localStorage on change
  function persist(nextFiles: SandboxFile[], nextActive: string) {
    if (!userId) return;
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify({ files: nextFiles, active: nextActive }));
    } catch { /* quota exceeded, ignore */ }
  }

  const updateFile = useCallback((name: string, content: string) => {
    setFiles(prev => {
      const next = prev.map(f => f.name === name ? { ...f, content } : f);
      persist(next, activeFile);
      return next;
    });
  }, [activeFile, userId]);

  const addFile = useCallback((name: string) => {
    if (!name.trim()) return;
    const clean = name.trim();
    setFiles(prev => {
      if (prev.find(f => f.name === clean)) return prev;
      const next = [...prev, { name: clean, content: '', language: extToLanguage(clean) }];
      setActiveFile(clean);
      persist(next, clean);
      return next;
    });
  }, [userId]);

  const deleteFile = useCallback((name: string) => {
    setFiles(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(f => f.name !== name);
      const nextActive = name === activeFile ? next[0].name : activeFile;
      setActiveFile(nextActive);
      persist(next, nextActive);
      return next;
    });
  }, [activeFile, userId]);

  const switchFile = useCallback((name: string) => {
    setActiveFile(name);
    if (userId) {
      try {
        const raw = localStorage.getItem(storageKey(userId));
        if (raw) {
          const parsed = JSON.parse(raw) as { files: SandboxFile[]; active: string };
          localStorage.setItem(storageKey(userId), JSON.stringify({ ...parsed, active: name }));
        }
      } catch { /* ignore */ }
    }
  }, [userId]);

  const currentFile = files.find(f => f.name === activeFile) ?? files[0];

  return { files, activeFile, currentFile, updateFile, addFile, deleteFile, switchFile };
}
