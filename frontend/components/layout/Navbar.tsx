'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Bike,
  Wrench,
  ShoppingBag,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ShoppingCart,
  User,
  ChevronDown,
  Phone,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useCart } from '@/components/providers/CartProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/marketplace', labelKey: 'nav.marketplace' as const, icon: Bike },
  { href: '/workshop',    labelKey: 'nav.workshop'    as const, icon: Wrench },
  { href: '/parts',       labelKey: 'nav.parts'       as const, icon: ShoppingBag },
];

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { count } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="otb-nav-figtree sticky top-0 z-50 w-full bg-otb-surface border-b border-otb-border shadow-sm shadow-black/[0.03]">
      {/* Slim utility row — clean OEM-style secondary links */}
      <div className="hidden sm:block border-b border-otb-border/80 bg-otb-page/80">
        <div className="section-container flex h-9 items-center justify-end gap-x-6 text-[11px] font-normal text-otb-text">
          <Link href="/workshop" className="transition-opacity hover:opacity-70">
            {t('nav.workshop')}
          </Link>
          <Link href="/marketplace" className="transition-opacity hover:opacity-70">
            {t('nav.marketplace')}
          </Link>
          <Link href="/parts" className="transition-opacity hover:opacity-70">
            {t('nav.parts')}
          </Link>
        </div>
      </div>
      <div className="section-container flex h-14 md:h-[3.75rem] items-center justify-between">

        {/* Logo */}
        <Link href="/" data-navbar-brand className="flex items-center gap-3 text-otb-text font-normal tracking-tight text-[20px] leading-tight">
          <span className="flex h-9 w-9 items-center justify-center bg-[#e51b23] text-white font-normal text-[11px] leading-none shrink-0">
            OTB
          </span>
          <span className="hidden sm:block">OldTrailBikes</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0">
          {NAV_LINKS.map(({ href, labelKey }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative px-5 py-2 text-[20px] font-normal leading-tight transition-colors group',
                isActive(href) ? 'text-otb-text' : 'text-otb-text hover:opacity-80',
              )}
            >
              {t(labelKey)}
              <span
                className={cn(
                  'absolute bottom-0 left-5 right-5 h-px bg-otb-text transition-transform origin-left',
                  isActive(href) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                )}
              />
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === 'EN' ? 'SI' : 'EN')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-[20px] font-normal leading-tight border border-otb-text/20 text-otb-text/70 hover:text-otb-text hover:border-otb-text/25 transition-colors"
          >
            <span className={language === 'EN' ? 'text-otb-text' : 'text-otb-text/40'}>EN</span>
            <span className="text-otb-text/30 mx-0.5">|</span>
            <span className={language === 'SI' ? 'text-otb-text' : 'text-otb-text/40'}>සිං</span>
          </button>

          {/* Cart */}
          <Link href="/parts?cart=1" className="relative p-2 text-otb-text transition-opacity hover:opacity-70">
            <ShoppingCart className="h-6 w-6" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center bg-[#e51b23] text-white text-[10px] font-normal">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>

          {/* Auth */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-otb-text/10 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center bg-[#e51b23] text-white text-xs font-normal">
                    {user.fullName[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-[20px] font-normal text-otb-text max-w-[120px] truncate leading-tight">
                    {user.fullName.split(' ')[0]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-otb-text/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="otb-nav-figtree w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-normal">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />{t('nav.dashboard')}</Link>
                </DropdownMenuItem>
                {user.role === 'SHOP' ? (
                  <DropdownMenuItem asChild>
                    <Link href="/shop/dashboard"><Bike className="mr-2 h-4 w-4" />{t('nav.shopDashboard')}</Link>
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/marketplace/sell"><Bike className="mr-2 h-4 w-4" />{t('nav.sellBike')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/shop/apply"><Bike className="mr-2 h-4 w-4" />{t('nav.shopApply')}</Link>
                    </DropdownMenuItem>
                  </>
                )}
                {user.role === 'ADMIN' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin"><ShieldCheck className="mr-2 h-4 w-4" />{t('nav.admin')}</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void logout()}>
                  <LogOut className="mr-2 h-4 w-4" />{t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-2 text-[20px] font-normal leading-tight text-otb-text transition-opacity hover:opacity-80"
              >
                {t('nav.login')}
              </Link>
              <Link
                href="/workshop"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#e51b23] hover:bg-[#ff1f28] text-white text-[20px] font-normal leading-tight transition-colors"
              >
                <Phone className="h-5 w-5" />
                {t('nav.bookService')}
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <button className="p-2 text-otb-text/70 hover:text-otb-text transition-colors">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="otb-nav-figtree w-[300px] border-otb-border bg-otb-page p-0 race-stripes">
              <div className="flex flex-col h-full text-otb-text">
                {/* Sheet header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-otb-border bg-otb-surface">
                  <div className="flex items-center gap-2.5" data-navbar-brand>
                    <span className="flex h-7 w-7 items-center justify-center bg-[#e51b23] text-white font-normal text-xs">OTB</span>
                    <span className="font-normal tracking-tight text-[20px] leading-tight">OldTrailBikes</span>
                  </div>
                  <button onClick={() => setMobileOpen(false)} className="text-otb-text/40 hover:text-otb-text transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Nav links */}
                <nav className="flex-1 py-2">
                  {NAV_LINKS.map(({ href, labelKey, icon: Icon }) => (
                    <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-5 py-4 text-[20px] font-normal leading-tight transition-colors border-l-2',
                        isActive(href)
                          ? 'text-otb-text bg-otb-text/[0.06] border-otb-text'
                          : 'text-otb-text hover:bg-otb-text/[0.04] border-transparent',
                      )}>
                      <Icon className="h-6 w-6" />
                      {t(labelKey)}
                    </Link>
                  ))}
                  {isAuthenticated && (
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-5 py-4 text-[20px] font-normal leading-tight transition-colors border-l-2',
                        isActive('/dashboard')
                          ? 'text-otb-text bg-otb-text/[0.06] border-otb-text'
                          : 'text-otb-text hover:bg-otb-text/[0.04] border-transparent',
                      )}>
                      <User className="h-6 w-6" />
                      {t('nav.dashboard')}
                    </Link>
                  )}
                  {isAuthenticated && user?.role === 'SHOP' && (
                    <Link href="/shop/dashboard" onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-5 py-4 text-[20px] font-normal leading-tight transition-colors border-l-2',
                        isActive('/shop/dashboard')
                          ? 'text-otb-text bg-otb-text/[0.06] border-otb-text'
                          : 'text-otb-text hover:bg-otb-text/[0.04] border-transparent',
                      )}>
                      <Bike className="h-6 w-6" />
                      {t('nav.shopDashboard')}
                    </Link>
                  )}
                  {isAuthenticated && user?.role !== 'SHOP' && (
                    <Link href="/shop/apply" onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-5 py-4 text-[20px] font-normal leading-tight transition-colors border-l-2',
                        isActive('/shop/apply')
                          ? 'text-otb-text bg-otb-text/[0.06] border-otb-text'
                          : 'text-otb-text hover:bg-otb-text/[0.04] border-transparent',
                      )}>
                      <Bike className="h-6 w-6" />
                      {t('nav.shopApply')}
                    </Link>
                  )}
                  {isAuthenticated && user?.role === 'ADMIN' && (
                    <Link href="/admin" onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-5 py-4 text-[20px] font-normal leading-tight transition-colors border-l-2',
                        isActive('/admin')
                          ? 'text-otb-text bg-otb-text/[0.06] border-otb-text'
                          : 'text-otb-text hover:bg-otb-text/[0.04] border-transparent',
                      )}>
                      <ShieldCheck className="h-6 w-6" />
                      {t('nav.admin')}
                    </Link>
                  )}
                </nav>

                {/* Bottom actions */}
                <div className="px-5 py-5 border-t border-otb-border space-y-3 bg-otb-surface">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-normal text-otb-text/50">{t('common.theme')}</span>
                    <ThemeToggle />
                  </div>
                  {/* Language */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-normal text-otb-text/50">{t('common.language')}</span>
                    <div className="flex gap-px">
                      {(['EN', 'SI'] as const).map(l => (
                        <button key={l} onClick={() => setLanguage(l)}
                          className={cn(
                            'px-3 py-2 text-xs font-normal transition-colors',
                            language === l ? 'bg-otb-text text-white' : 'bg-otb-text/5 text-otb-text/60 hover:text-otb-text',
                          )}>
                          {l === 'EN' ? 'EN' : 'සිං'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isAuthenticated ? (
                    <button onClick={() => { void logout(); setMobileOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-3 border border-otb-text/20 text-otb-text text-[20px] font-normal leading-tight hover:bg-otb-text/5 transition-colors">
                      <LogOut className="h-4 w-4" />
                      {t('nav.logout')}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <Link href="/login" onClick={() => setMobileOpen(false)}
                        className="block w-full text-center px-4 py-3 border border-otb-text/20 text-otb-text text-[20px] font-normal leading-tight hover:border-otb-text/30 transition-colors">
                        {t('nav.login')}
                      </Link>
                      <Link href="/workshop" onClick={() => setMobileOpen(false)}
                        className="block w-full text-center px-4 py-3 bg-[#e51b23] hover:bg-[#ff1f28] text-white text-[20px] font-normal leading-tight transition-colors">
                        {t('nav.bookService')}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
