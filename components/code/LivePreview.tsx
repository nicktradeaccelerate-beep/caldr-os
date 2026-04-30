'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  content: string;
  language: string;
  debounceMs?: number;
}

function mdToHtml(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^(#{6}) (.+)$/gm, '<h6>$2</h6>')
    .replace(/^(#{5}) (.+)$/gm, '<h5>$2</h5>')
    .replace(/^(#{4}) (.+)$/gm, '<h4>$2</h4>')
    .replace(/^(#{3}) (.+)$/gm, '<h3>$2</h3>')
    .replace(/^(#{2}) (.+)$/gm, '<h2>$2</h2>')
    .replace(/^(#) (.+)$/gm, '<h1>$2</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[h|u|o|l|p])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}

function buildSrcdoc(content: string, language: string): string {
  let body: string;

  if (language === 'html') {
    // If it already has <html> tag, render as-is
    if (/<html/i.test(content)) return content;
    body = content;
  } else if (language === 'markdown') {
    body = `<div class="md">${mdToHtml(content)}</div>`;
  } else {
    body = `<pre>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, 'DM Sans', sans-serif;
    font-size: 14px; line-height: 1.7;
    color: #1A1918; background: #FAFAF8;
    padding: 24px 28px; margin: 0;
  }
  h1,h2,h3,h4 { color: #1B4332; font-weight: 700; margin: 1.2em 0 0.4em; line-height: 1.2; }
  h1 { font-size: 22px; } h2 { font-size: 18px; } h3 { font-size: 15px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 4px; }
  code { background: #F0F0EC; padding: 1px 5px; border-radius: 4px; font-family: 'DM Mono', monospace; font-size: 12px; }
  pre { background: #1A1918; color: #E8E6DF; padding: 14px 16px; border-radius: 8px; overflow-x: auto; font-family: 'DM Mono', monospace; font-size: 12px; line-height: 1.6; }
  strong { font-weight: 700; }
  p { margin: 0 0 0.8em; }
  a { color: #1B4332; }
  hr { border: none; border-top: 1px solid #E8E6DF; margin: 1.5em 0; }
</style>
</head>
<body>${body}</body>
</html>`;
}

export default function LivePreview({ content, language, debounceMs = 400 }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [srcdoc, setSrcdoc] = useState(() => buildSrcdoc(content, language));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSrcdoc(buildSrcdoc(content, language));
    }, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [content, language, debounceMs]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      title="Live preview"
      style={{ width: '100%', height: '100%', border: 'none', background: '#FAFAF8' }}
    />
  );
}
