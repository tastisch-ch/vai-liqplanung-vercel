'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { formatCHF, parseCHF } from '@/lib/currency';
import logger from '@/lib/logger';
import { getCurrentBalance, setCurrentBalance } from '@/lib/services/daily-balance';
import { User } from '@supabase/supabase-js';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import Image from 'next/image';
import { upsertRevenueTarget } from '@/lib/services/revenue-target';
import { supabase } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isBalanceEditing, setIsBalanceEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // restore persisted collapsed state
  useEffect(() => {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem('sidebarCollapsed') : null;
      if (v === '1') setCollapsed(true);
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
        }
      } catch {}
      return next;
    });
  };
  const [tooltip, setTooltip] = useState<{x:number; y:number; name:string; desc:string; visible:boolean}>({x:0,y:0,name:'',desc:'',visible:false});
  
  // Use our logger hook
  const logError = (err: unknown, message?: string) => {
    logger.logError(err, message || 'Error in Sidebar', { 
      component: 'Sidebar' 
    });
  };
  
  // Access auth context
  const auth = useAuth();
  let isAuthenticated = false;
  let isAdmin = false;
  let isReadOnly = false;
  let user: User | null = null;
  
  try {
    isAuthenticated = auth.authState.isAuthenticated;
    isAdmin = !!auth.authState.isAdmin;
    isReadOnly = !!auth.authState.isReadOnly;
    user = auth.authState.user;
  } catch (error) {
    logError(error, 'Error accessing auth context');
  }

  // Define the type for navigation links
  type NavLink = {
    name: string;
    path: string;
    icon: 'dashboard' | 'calendar' | 'wallet' | 'users' | 'import' | 'settings';
    description: string;
  };

  // Smooth fade-in of balance content when expanding
  const [balanceOpacity, setBalanceOpacity] = useState(0);
  const [showExpandedContent, setShowExpandedContent] = useState(false);
  useEffect(() => {
    if (!collapsed) {
      // wait for width transition to finish then reveal content
      const t = setTimeout(() => {
        setShowExpandedContent(true);
        setBalanceOpacity(0);
        const r = requestAnimationFrame(() => setBalanceOpacity(1));
        return () => cancelAnimationFrame(r);
      }, 250);
      return () => clearTimeout(t);
    } else {
      setShowExpandedContent(false);
    }
  }, [collapsed]);

  // Core navigation links
  const navLinks: NavLink[] = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard', description: 'Übersicht' },
    { name: 'Planung', path: '/planung', icon: 'calendar', description: 'Finanzplanung' },
    { name: 'Fixkosten', path: '/fixkosten', icon: 'wallet', description: 'Fixkosten verwalten' },
    { name: 'Mitarbeiter', path: '/mitarbeiter', icon: 'users', description: 'Team verwalten' },
    { name: 'Datenimport', path: '/datenimport', icon: 'import', description: 'CSV/Excel importieren' },
  ];
  
  // Admin links removed

  // Kontostand functionality
  const [startBalance, setStartBalance] = useState(0);
  const [kontostandInput, setKontostandInput] = useState(formatCHF(0));
  const [kontostandError, setKontostandError] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Revenue goal (Ertragsziel)
  const currentYear = new Date().getFullYear();
  const [revLoading, setRevLoading] = useState(false);
  const [revTarget, setRevTarget] = useState(0);
  const [revAchieved, setRevAchieved] = useState(0);
  const [revRemaining, setRevRemaining] = useState(0);
  const [revProgress, setRevProgress] = useState(0);
  const [isRevEditing, setIsRevEditing] = useState(false);
  const [revInput, setRevInput] = useState('');

  // Load global balance
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoadingBalance(true);
        
        // Get the current global balance
        const currentBalance = await getCurrentBalance();
        setStartBalance(currentBalance.balance);
        setKontostandInput(formatCHF(currentBalance.balance));
        setLastUpdated(currentBalance.updated_at);
      } catch (error) {
        logError(error, 'Error loading global balance');
      } finally {
        setIsLoadingBalance(false);
      }
    }
    
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  // Load revenue progress
  useEffect(() => {
    async function loadRevenue() {
      console.log('[Revenue] load start for year', currentYear);
      try {
        setRevLoading(true);

        const res = await fetch(`/api/revenue/progress?year=${currentYear}`, { cache: 'no-store' });
        const json = await res.json();
        console.log('[Revenue] api result:', json);
        if (!res.ok) throw new Error(json?.error || 'API error');

        setRevTarget(Number(json.target || 0));
        setRevAchieved(Number(json.achieved || 0));
        setRevRemaining(Number(json.remaining || 0));
        setRevProgress(Number(json.progress || 0));
        setRevInput(formatCHF(Number(json.target || 0)));

      } catch (error) {
        logError(error, 'Error loading revenue progress');
      } finally {
        setRevLoading(false);
      }
    }
    if (!isAuthenticated) return;
    // initial fetch once authenticated
    loadRevenue();
    // subscribe to auth changes to refetch when token refreshes/sign-in happens
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      console.log('[Revenue] auth event', evt, 'has session?', !!session);
      if (session) {
        loadRevenue();
      }
    });
    return () => {
      try { sub.subscription.unsubscribe(); } catch {}
    };
  }, [isAuthenticated, currentYear]);

  const updateRevenueTarget = async () => {
    try {
      const amount = parseCHF(revInput) ?? 0;
      await upsertRevenueTarget(currentYear, amount, { id: user?.id, email: user?.email || null });
      // reload via API
      const res = await fetch(`/api/revenue/progress?year=${currentYear}`, { cache: 'no-store' });
      const json = await res.json();
      console.log('[Revenue] api result after upsert:', json);
      if (!res.ok) throw new Error(json?.error || 'API error');
      setRevTarget(Number(json.target || 0));
      setRevAchieved(Number(json.achieved || 0));
      setRevRemaining(Number(json.remaining || 0));
      setRevProgress(Number(json.progress || 0));
      setIsRevEditing(false);
    } catch (error) {
      logError(error, 'Error updating revenue target');
    }
  };

  function ProgressCircle({ value, size = 96 }: { value: number; size?: number }) {
    const stroke = 6;
    const radius = (size - stroke) / 2;
    const center = size / 2;
    const c = 2 * Math.PI * radius;
    const pct = Math.max(0, Math.min(100, value));
    const dash = (pct / 100) * c;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={center} cy={center} r={radius} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#CEFF65"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
        <text x={center} y={center + 4} textAnchor="middle" fontSize={Math.max(12, Math.round(size * 0.16))} className="fill-gray-700 font-medium">{Math.round(pct)}%</text>
      </svg>
    );
  }

  const updateKontostand = async () => {
    try {
      const parsedValue = parseCHF(kontostandInput);
      if (parsedValue !== null) {
        setIsLoadingBalance(true);
        // Save to database - using the global balance system
        const result = await setCurrentBalance(parsedValue);
        
        setStartBalance(result.balance);
        setKontostandInput(formatCHF(result.balance));
        setLastUpdated(result.updated_at);
        setKontostandError(false);
        setIsBalanceEditing(false);
        
        logger.info('Global Kontostand updated', { 
          value: result.balance, 
          component: 'Sidebar'
        });
      } else {
        throw new Error('Invalid amount');
      }
    } catch (error) {
      setKontostandError(true);
      setKontostandInput(formatCHF(startBalance));
      logError(error, 'Error updating global kontostand');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push('/login');
      setTimeout(() => {
        window.location.href = '/login';
      }, 300);
    } catch (e) {
      logger.logError(e, 'Error during sign out', { component: 'Sidebar' });
    }
  };

  const renderLinks = (links: NavLink[]) => (
    <ul className="space-y-1">
      {links.map((link) => (
        <li key={link.path}>
          <Link 
            href={link.path}
            className={`relative flex items-center px-3 py-2 text-sm rounded-md
              ${pathname === link.path ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
            onMouseEnter={(e)=>{
              if (!collapsed) return;
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setTooltip({
                x: rect.right + 8,
                y: rect.top + rect.height/2,
                name: link.name,
                desc: link.description,
                visible: true,
              });
            }}
            onMouseLeave={()=>{ if (tooltip.visible) setTooltip(prev=>({...prev, visible:false})); }}
          >
            <span className="mr-3 text-gray-600 flex-shrink-0">{renderIcon(link.icon)}</span>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate">{link.name}</div>
                <div className="text-xs text-gray-500 group-hover:text-gray-700">{link.description}</div>
              </div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );

  function renderIcon(icon: NavLink['icon']) {
    switch (icon) {
      case 'dashboard':
        return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>);
      case 'calendar':
        return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>);
      case 'wallet':
        return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 7V5a2 2 0 0 0-2-2H6"/></svg>);
      case 'users':
        return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
      case 'import':
        return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>);
      case 'settings':
        return (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 11 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 21 11.91H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);
    }
  }

  return (
    <div className={`${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 md:border md:border-gray-200 md:bg-white/80 md:backdrop-blur md:shadow-lg md:rounded-2xl md:m-3 h-[100vh] md:h-[calc(100vh-1.5rem)] overflow-hidden flex flex-col transition-[width] duration-300`}>
      {/* Sidebar Header with logo + collapse */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Image src="/assets/vaios-icon.svg" alt="vaios icon" width={32} height={32} priority className={`${collapsed ? 'block' : 'hidden'}`} />
          <Image src="/assets/vaios-logo.svg" alt="vaios" width={132} height={28} priority className={`${collapsed ? 'hidden' : 'block'}`} />
        </div>
      </div>
      {/* Floating tooltip outside sidebar via fixed positioning */}
      {collapsed && tooltip.visible && (
        <div style={{ position:'fixed', top: tooltip.y, left: tooltip.x, transform:'translateY(-50%)' }} className="z-50">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
            <div className="text-sm font-medium text-gray-900 whitespace-nowrap">{tooltip.name}</div>
            <div className="text-xs text-gray-500 whitespace-nowrap">{tooltip.desc}</div>
          </div>
        </div>
      )}

      {/* Account Section integrated */}
      {isAuthenticated && user && (
        <div className="p-3 border-b border-gray-200">
          <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
            <div className={`h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold ${collapsed ? '' : 'mr-3'}`}>
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                <p className="text-xs text-gray-500">{isAdmin ? 'Administrator' : 'Standard User'}{isReadOnly && ' (Nur Lesezugriff)'}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Kontostand Section */}
      {isAuthenticated && (
        <div className="p-3 border-b border-gray-200">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} mb-2`}>
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 12h8"/>
                <path d="M12 8v8"/>
              </svg>
              {!collapsed && 'Kontostand'}
            </h3>
            {!collapsed && !isBalanceEditing && !isLoadingBalance && (
              <button 
                onClick={() => setIsBalanceEditing(true)}
                className="text-xs text-blue-600 hover:text-blue-800"
                disabled={isReadOnly}
              >
                Aktualisieren
              </button>
            )}
          </div>
          {showExpandedContent && (
            <div className={`transition-opacity duration-300 ease-out ${balanceOpacity ? 'opacity-100' : 'opacity-0'}`} style={{width: '100%'}}>
            {isBalanceEditing ? (
              <div className="mb-2">
                <input
                  type="text"
                  value={kontostandInput}
                  onChange={(e) => setKontostandInput(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-right"
                  disabled={isReadOnly}
                  autoFocus
                />
                <div className="flex justify-end mt-2 space-x-2">
                  <button
                    onClick={() => {
                      setIsBalanceEditing(false);
                      setKontostandInput(formatCHF(startBalance));
                    }}
                    className="px-2 py-1 text-xs text-gray-700 border border-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateKontostand}
                    className="px-2 py-1 text-xs text-white bg-blue-600 rounded"
                    disabled={isReadOnly}
                  >
                    Save
                  </button>
                </div>
                {kontostandError && (
                  <p className="mt-1 text-xs text-red-600">
                    Bitte gib einen gültigen Betrag ein
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded p-3">
                {isLoadingBalance ? (
                  <div className="animate-pulse h-6 bg-gray-200 rounded"></div>
                ) : (
                  <>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCHF(startBalance)}
                    </p>
                    <p className="text-xs text-gray-500">Aktueller Kontostand</p>
                    {lastUpdated && (
                      <p className="text-xs text-gray-400 mt-1">
                        Letzte Aktualisierung: {' '}
                        <span title={format(new Date(lastUpdated), 'dd.MM.yyyy HH:mm', { locale: de })}>
                          vor {formatDistanceToNow(new Date(lastUpdated), { locale: de })}
                        </span>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
            </div>
          )}
        </div>
      )}

      {/* Ertragsziel Section */}
      {isAuthenticated && (
        <div className="p-3 border-b border-gray-200">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} mb-2`}>
            <h3 className="font-semibold text-gray-700 flex items-center gap-2 whitespace-nowrap">
              <svg className="h-5 w-5 text-violet-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20l9-16-9 4-9-4 9 16z"/>
              </svg>
              {!collapsed && `Ertragsziel ${currentYear}`}
            </h3>
          </div>
          <div className={`${revLoading ? 'opacity-60' : ''} flex flex-col items-center`}>
            <ProgressCircle value={revProgress} size={collapsed ? 64 : 112} />
            {!collapsed && (
              <div className="mt-2 text-center">
                <div className="text-sm font-medium text-gray-900">{revTarget > 0 ? formatCHF(revTarget) : 'Kein Ziel gesetzt'}</div>
                <div className="text-xs text-gray-600 mt-0.5">Bisher erreicht: {formatCHF(revAchieved)}</div>
                {revTarget > 0 && (
                  <div className="text-xs text-gray-700 mt-0.5">fehlt: <span className="font-medium">{formatCHF(revRemaining)}</span></div>
                )}
              </div>
            )}
          </div>

          {!collapsed && !revLoading && (
            <div className="mt-3 flex justify-end">
              <button 
                onClick={() => setIsRevEditing(true)}
                className="text-xs text-blue-600 hover:text-blue-800"
                disabled={isReadOnly}
              >
                {revTarget > 0 ? 'Ziel anpassen' : 'Ziel setzen'}
              </button>
            </div>
          )}

          <Dialog open={isRevEditing} onOpenChange={setIsRevEditing}>
            <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
              <div className="p-4">
                <DialogHeader>
                  <DialogTitle>Ertragsziel {currentYear} festlegen</DialogTitle>
                </DialogHeader>
                <div className="mt-4 space-y-3">
                  <label className="text-xs text-gray-600">Zielbetrag (Einnahmen)</label>
                  <Input value={revInput} onChange={(e)=>setRevInput(e.target.value)} placeholder="CHF 0.00" />
                  <div className="flex justify-end gap-2">
                    <button className="px-3 py-1.5 text-xs rounded-md border" onClick={()=>{ setIsRevEditing(false); setRevInput(formatCHF(revTarget)); }}>Abbrechen</button>
                    <button className="px-3 py-1.5 text-xs rounded-md bg-[#CEFF65] text-[#02403D] border border-[#CEFF65]" onClick={updateRevenueTarget} disabled={isReadOnly}>Speichern</button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
      
      {/* Navigation Links */}
      <div className="p-3 overflow-hidden flex-1 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Main Navigation */}
          <div>
            {!collapsed && (
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Navigation</h3>
            )}
            {renderLinks(navLinks)}
          </div>
          
          {/* Admin Section removed */}
        </div>
        <div className="pt-3">
          {/* bottom spacer to bring signout closer without scroll */}
        </div>
      </div>
      {/* Sign out + collapse at bottom (stacked) */}
      <div className="p-3 border-t border-gray-200">
        {isAuthenticated && (
          <button onClick={handleSignOut} className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} text-sm text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-md`}>
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              {!collapsed && <span>Abmelden</span>}
            </span>
          </button>
        )}
        <button onClick={toggleCollapsed} className="mt-3 w-full flex items-center justify-center px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700" aria-label="Sidebar einklappen/ausklappen">
          {collapsed ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          )}
        </button>
      </div>
    </div>
  );
} 