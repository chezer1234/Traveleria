import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

function Swatch({ colors }) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {colors.map((c) => (
        <span
          key={c}
          className="w-2.5 h-2.5 rounded-full border border-ink/20"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  );
}

// Style picker for the three design directions (issue #60).
// variant="dropdown" (desktop nav) or variant="list" (mobile menu / auth pages).
export default function ThemeSwitcher({ variant = 'dropdown' }) {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (variant === 'list') {
    return (
      <div role="radiogroup" aria-label="App style">
        {themes.map((t) => (
          <button
            key={t.id}
            role="radio"
            aria-checked={theme === t.id}
            onClick={() => setTheme(t.id)}
            className={`w-full flex items-center justify-between gap-3 py-3 border-b border-hairline/60 text-left ${
              theme === t.id ? 'text-ink' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <span>
              <span className="smallcaps block">{t.name}</span>
              <span className="block text-xs text-ink-soft/80 normal-case">{t.tagline}</span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <Swatch colors={t.swatch} />
              {theme === t.id && <span className="smallcaps text-compass">On</span>}
            </span>
          </button>
        ))}
      </div>
    );
  }

  const active = themes.find((t) => t.id === theme) || themes[0];

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="smallcaps flex items-center gap-2 py-1 text-ink-soft hover:text-ink transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`App style: ${active.name}`}
        title={`Style: ${active.name}`}
      >
        <Swatch colors={active.swatch} />
        Style
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="App style"
          className="absolute right-0 top-full mt-2 w-64 plate z-50 p-2"
        >
          {themes.map((t) => (
            <button
              key={t.id}
              role="option"
              aria-selected={theme === t.id}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left rounded-md transition-colors ${
                theme === t.id ? 'bg-parchment/60 text-ink' : 'text-ink-soft hover:bg-paper hover:text-ink'
              }`}
            >
              <span>
                <span className="smallcaps block">{t.name}</span>
                <span className="block text-xs text-ink-soft/80">{t.tagline}</span>
              </span>
              <Swatch colors={t.swatch} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
