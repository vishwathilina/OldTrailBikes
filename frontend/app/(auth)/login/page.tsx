'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ApiClientError } from '@/lib/api';

type FormData = { email: string; password: string };

const inputCls = 'w-full bg-otb-page border border-otb-border px-4 py-3 text-sm text-otb-text placeholder:text-otb-text/25 focus:outline-none focus:border-[#e51b23]/70 transition-colors';
const labelCls = 'text-[10px] font-medium text-otb-text/40 uppercase tracking-[0.2em] block mb-2';
const errCls   = 'text-[#e51b23] text-xs mt-1';

export default function LoginPage() {
  const { login }   = useAuth();
  const { t }       = useLanguage();
  const router      = useRouter();
  const [showPwd, setShowPwd] = useState(false);

  const schema = useMemo(() => z.object({
    email:    z.string().email(t('auth.validation.email')),
    password: z.string().min(1, t('auth.validation.passwordRequired')),
  }), [t]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      await login(data.email, data.password);
      toast.success(t('auth.login.welcomeToast'));
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('auth.error.generic'));
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Header accent */}
      <div className="flex items-center gap-3 mb-6">
        <span className="h-px flex-1 bg-otb-border" />
        <span className="text-[10px] font-medium text-[#e51b23] uppercase tracking-[0.3em]">{t('auth.login.memberEyebrow')}</span>
        <span className="h-px flex-1 bg-otb-border" />
      </div>

      <div className="bg-otb-surface border border-otb-border relative overflow-hidden">
        {/* Red top accent */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#e51b23]" />

        {/* Ghost text */}
        <span aria-hidden className="absolute -right-3 bottom-0 text-[110px] font-black text-otb-text/[0.04] leading-none select-none uppercase">
          {t('auth.ghost.login')}
        </span>

        <div className="p-6 sm:p-8 relative z-10">
          <h1 className="font-display text-3xl font-black text-otb-text uppercase tracking-tight mb-1">
            {t('auth.login.title')}
          </h1>
          <p className="text-otb-text/40 text-xs mb-8">{t('auth.login.sub')}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className={labelCls}>{t('auth.login.email')}</label>
              <input type="email" autoComplete="email" placeholder={t('auth.placeholder.email')}
                {...register('email')} className={inputCls} />
              {errors.email && <p className={errCls}>{errors.email.message}</p>}
            </div>

            <div>
              <label className={labelCls}>{t('auth.login.password')}</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} autoComplete="current-password"
                  placeholder={t('auth.placeholder.passwordDots')} {...register('password')}
                  className={`${inputCls} pr-10`} />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-otb-text/30 hover:text-otb-text/70 transition-colors">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className={errCls}>{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#e51b23] hover:bg-[#ff1f28] text-white text-xs font-bold uppercase tracking-[0.25em] transition-colors disabled:opacity-50 mt-2">
              {isSubmitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('auth.login.signingIn')}</>
                : <><LogIn className="h-4 w-4" /> {t('auth.login.submit')}</>
              }
            </button>
          </form>
        </div>
      </div>

      <p className="text-center text-otb-text/30 text-sm mt-6">
        {t('auth.login.noAccount')}{' '}
        <Link href="/register" className="text-[#e51b23] font-bold hover:text-[#ff1f28] transition-colors">
          {t('auth.login.register')}
        </Link>
      </p>
    </div>
  );
}
