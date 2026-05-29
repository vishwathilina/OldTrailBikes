'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span
        className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center border border-otb-border', className)}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center border border-otb-border text-otb-text',
        'hover:border-[#e51b23]/50 hover:text-[#e51b23] transition-colors',
        className,
      )}
      aria-label={isDark ? t('common.themeLight') : t('common.themeDark')}
    >
      {isDark ? <Sun className="h-4 w-4" strokeWidth={2.5} /> : <Moon className="h-4 w-4" strokeWidth={2.5} />}
    </button>
  );
}
