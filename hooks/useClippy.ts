import { useState, useCallback, useRef } from 'react';

const MIN_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes between appearances

export function useClippy(businessId: string) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'clippy'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const lastShownRef = useRef<number>(0);

  const show = useCallback(() => {
    const now = Date.now();
    if (now - lastShownRef.current < MIN_INTERVAL_MS) return;
    lastShownRef.current = now;
    setOpen(true);
  }, []);

  const hide = useCallback(() => setOpen(false), []);

  const sendMessage = useCallback(async (text: string, currentTask: string | null, aiUsage: { claude: number; gpt: number; gemini: number }) => {
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/clippy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: { currentTask, aiUsage },
          businessId,
        }),
      });
      const { reply } = await res.json();
      setMessages(prev => [...prev, { role: 'clippy', text: reply ?? 'Something went wrong 😅' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'clippy', text: "I'm having a moment — try again in a sec! 🤖" }]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  return { open, show, hide, messages, loading, sendMessage };
}
