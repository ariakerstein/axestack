import { useState, useEffect } from 'react';

export function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('navis-theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('navis-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <footer className="mt-16 pt-6 pb-8 flex items-center justify-center gap-4" style={{ borderTop: '1px solid var(--p-border)' }}>
      <span className="text-sm" style={{ color: 'var(--p-text-faint)' }}>Navis Design System</span>
      <button
        onClick={() => setDark(!dark)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg min-h-[44px] text-sm font-medium transition-colors duration-[50ms]"
        style={{
          backgroundColor: 'var(--p-surface-alt)',
          color: 'var(--p-text-body)',
          border: '1px solid var(--p-border)',
        }}
      >
        {dark ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        )}
        {dark ? 'Light mode' : 'Dark mode'}
      </button>
    </footer>
  );
}
