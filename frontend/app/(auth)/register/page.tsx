'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ApiClientError } from '@/lib/api';
import { cn } from '@/lib/utils';

type FormData = {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  preferredLanguage: 'EN' | 'SI';
};

const inputCls = 'w-full bg-otb-page border border-otb-border px-4 py-3 text-sm text-otb-text placeholder:text-otb-text/25 focus:outline-none focus:border-[#e51b23]/70 transition-colors';
const labelCls = 'text-[10px] font-medium text-otb-text/40 uppercase tracking-[0.2em] block mb-2';
const errCls   = 'text-[#e51b23] text-xs mt-1';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const { t }   = useLanguage();
  const router  = useRouter();
  const [showPwd, setShowPwd] = useState(false);

  const schema = useMemo(() => z.object({
    fullName: z.string().min(2, t('auth.validation.nameMin')),
    email:    z.string().email(t('auth.validation.email')),
    phone:    z.string().optional(),
    password: z.string()
      .min(8, t('auth.validation.passwordMin'))
      .regex(/[A-Za-z]/, t('auth.validation.passwordLetter'))
      .regex(/[0-9]/, t('auth.validation.passwordNumber')),
    preferredLanguage: z.enum(['EN', 'SI']),
  }), [t]);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { preferredLanguage: 'EN' } });

  const lang = watch('preferredLanguage');

  async function onSubmit(data: FormData) {
    try {
      await registerUser({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        preferredLanguage: data.preferredLanguage,
      });
      toast.success(t('auth.register.successToast'));
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof ApiClientError
        ? err.status === 409 ? t('auth.error.duplicateEmail') : err.message
        : t('auth.error.generic');
      toast.error(message);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Header accent */}
      <div className="flex items-center gap-3 mb-6">
        <span className="h-px flex-1 bg-otb-border" />
        <span className="text-[10px] font-medium text-[#f59e0b] uppercase tracking-[0.3em]">{t('auth.register.createEyebrow')}</span>
        <span className="h-px flex-1 bg-otb-border" />
      </div>

      <div className="bg-otb-surface border border-otb-border relative overflow-hidden">
        {/* Orange top accent */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f59e0b]" />

        {/* Ghost text */}
        <span aria-hidden className="absolute -right-3 bottom-0 text-[100px] font-black text-otb-text/[0.04] leading-none select-none uppercase">
          {t('auth.ghost.register')}
        </span>

        <div className="p-6 sm:p-8 relative z-10">
          <h1 className="font-display text-3xl font-black text-otb-text uppercase tracking-tight mb-1">
            {t('auth.register.title')}
          </h1>
          <p className="text-otb-text/40 text-xs mb-8">{t('auth.register.sub')}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className={labelCls}>{t('auth.register.name')} *</label>
              <input autoComplete="name" placeholder={t('auth.placeholder.name')}
                {...register('fullName')} className={inputCls} />
              {errors.fullName && <p className={errCls}>{errors.fullName.message}</p>}
            </div>

            <div>
              <label className={labelCls}>{t('auth.register.email')} *</label>
              <input type="email" autoComplete="email" placeholder={t('auth.placeholder.email')}
                {...register('email')} className={inputCls} />
              {errors.email && <p className={errCls}>{errors.email.message}</p>}
            </div>

            <div>
              <label className={labelCls}>{t('auth.register.phone')}</label>
              <input type="tel" autoComplete="tel" placeholder={t('auth.placeholder.phone')}
                {...register('phone')} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>{t('auth.register.password')} *</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} autoComplete="new-password"
                  placeholder={t('auth.placeholder.passwordHint')}
                  {...register('password')} className={`${inputCls} pr-10`} />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-otb-text/30 hover:text-otb-text/70 transition-colors">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className={errCls}>{errors.password.message}</p>}
            </div>

            {/* Language preference */}
            <div>
              <label className={labelCls}>{t('auth.register.language')}</label>
              <div className="flex gap-px">
                {(['EN', 'SI'] as const).map(l => (
                  <button key={l} type="button" onClick={() => setValue('preferredLanguage', l)}
                    className={cn(
                      'flex-1 py-2.5 text-xs font-bold uppercase tracking-[0.15em] transition-colors',
                      lang === l ? 'bg-[#e51b23] text-white' : 'bg-otb-page text-otb-text/40 hover:text-otb-text hover:bg-otb-text/5',
                    )}>
                    {l === 'EN' ? t('common.languageEnglish') : t('common.languageSinhala')}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#e51b23] hover:bg-[#ff1f28] text-white text-xs font-bold uppercase tracking-[0.25em] transition-colors disabled:opacity-50 mt-2">
              {isSubmitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('auth.register.creating')}</>
                : <><UserPlus className="h-4 w-4" /> {t('auth.register.submit')}</>
              }
            </button>
          </form>
        </div>
      </div>

      <p className="text-center text-otb-text/30 text-sm mt-6">
        {t('auth.register.hasAccount')}{' '}
        <Link href="/login" className="text-[#e51b23] font-bold hover:text-[#ff1f28] transition-colors">
          {t('auth.register.login')}
        </Link>
      </p>
    </div>
  );
}
