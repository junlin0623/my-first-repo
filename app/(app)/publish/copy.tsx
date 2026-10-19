'use client';

import { useState } from 'react';

// Copies text, or HTML as rich text so the 公众号 editor keeps the formatting.
export function Copy({ text, html, label }: { text: string; html?: string; label: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    if (html && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) }),
      ]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }
  return <button type="button" onClick={copy}>{done ? '已复制' : label}</button>;
}
