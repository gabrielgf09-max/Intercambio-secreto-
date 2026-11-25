import { useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { AppView, CurrencyCode, ExchangePayload, ParticipantInput } from './types';
import {
  ValidationResult,
  createEmptyParticipant,
  decodePayloadFromHash,
  drawAssignments,
  encodePayloadToHash,
  validateSetup,
} from './utils/exchange';
import { SetupView } from './components/SetupView';
import { ConfirmationView } from './components/ConfirmationView';
import { ParticipantView } from './components/ParticipantView';

const THEME_STORAGE_KEY = 'amigo-secreto-theme';

type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // Ignore storage access errors in restricted environments
    }
  }
  return 'light';
}

function getInitialHashState(): {
  view: AppView;
  payload: ExchangePayload | null;
  error: string | null;
} {
  if (typeof window === 'undefined') {
    return { view: 'setup', payload: null, error: null };
  }
  const hash = window.location.hash;
  if (!hash || hash === '#') {
    return { view: 'setup', payload: null, error: null };
  }
  const decoded = decodePayloadFromHash(hash);
  return {
    view: 'participant',
    payload: decoded.data,
    error: decoded.error,
  };
}

function clearUrlHash() {
  if (typeof window === 'undefined') return;
  try {
    const cleanUrl = window.location.pathname + window.location.search;
    window.history.replaceState(null, '', cleanUrl);
  } catch {
    window.location.hash = '';
  }
}

function setUrlHashSilently(encodedHash: string) {
  if (typeof window === 'undefined') return;
  try {
    window.history.replaceState(null, '', `#${encodedHash}`);
  } catch {
    // Keep confirmation screen intact even if replaceState is restricted
  }
}

export default function App() {
  const initialState = useMemo(() => getInitialHashState(), []);

  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [view, setView] = useState<AppView>(initialState.view);
  const [minPrice, setMinPrice] = useState<string>('250');
  const [currency, setCurrency] = useState<CurrencyCode>('$');
  const [exchangeDate, setExchangeDate] = useState<string>('');
  const [participants, setParticipants] = useState<ParticipantInput[]>(() => [
    createEmptyParticipant(0),
    createEmptyParticipant(1),
    createEmptyParticipant(2),
  ]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const [confirmedPayload, setConfirmedPayload] = useState<ExchangePayload | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');

  const [hashPayload, setHashPayload] = useState<ExchangePayload | null>(
    initialState.payload
  );
  const [hashError, setHashError] = useState<string | null>(initialState.error);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage access errors
    }
  }, [theme]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (!hash || hash === '#') {
        setHashPayload(null);
        setHashError(null);
        setView('setup');
        return;
      }
      const decoded = decodePayloadFromHash(hash);
      setHashPayload(decoded.data);
      setHashError(decoded.error);
      setView('participant');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleParticipantChange = (
    id: string,
    field: keyof Omit<ParticipantInput, 'id'>,
    value: string
  ) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
    if (validation) {
      setValidation(null);
    }
  };

  const handleAddParticipant = () => {
    setParticipants((prev) => [...prev, createEmptyParticipant(prev.length)]);
    if (validation) {
      setValidation(null);
    }
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.id !== id);
    });
    if (validation) {
      setValidation(null);
    }
  };

  const handleMinPriceChange = (value: string) => {
    setMinPrice(value);
    if (validation) {
      setValidation(null);
    }
  };

  const handleStartDraw = () => {
    const result = validateSetup(participants, minPrice);
    if (!result.valid) {
      setValidation(result);
      return;
    }

    setValidation(null);
    const assigned = drawAssignments(participants);
    const trimmedDate = exchangeDate.trim();
    const payload: ExchangePayload = {
      precioMinimo: Number(minPrice),
      moneda: currency,
      ...(trimmedDate ? { fechaIntercambio: trimmedDate } : {}),
      participantes: assigned,
    };

    const encodedHash = encodePayloadToHash(payload);
    const baseUrl = window.location.href.split('#')[0];
    const fullUrl = `${baseUrl}#${encodedHash}`;
    setUrlHashSilently(encodedHash);

    setConfirmedPayload(payload);
    setShareUrl(fullUrl);
    setHashPayload(payload);
    setHashError(null);
    setView('confirm');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToEdit = () => {
    clearUrlHash();
    setView('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateNew = () => {
    clearUrlHash();
    setMinPrice('250');
    setCurrency('$');
    setExchangeDate('');
    setParticipants([
      createEmptyParticipant(0),
      createEmptyParticipant(1),
      createEmptyParticipant(2),
    ]);
    setValidation(null);
    setConfirmedPayload(null);
    setShareUrl('');
    setHashPayload(null);
    setHashError(null);
    setView('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviewParticipantView = () => {
    if (confirmedPayload) {
      setHashPayload(confirmedPayload);
      setHashError(null);
      setView('participant');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4] dark:bg-[#131210] text-[#1A1816] dark:text-[#F3EFE7] transition-colors duration-200">
      <header className="border-b border-[#E4DFD5] dark:border-[#2A2621] bg-[#FAF8F4]/90 dark:bg-[#131210]/90 backdrop-blur-sm transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4 sm:gap-6">
          <a
            href={typeof window !== 'undefined' ? window.location.pathname : '/'}
            onClick={(e) => {
              e.preventDefault();
              if (view === 'confirm') {
                handleBackToEdit();
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="inline-flex items-center gap-2.5 text-[#1A1816] dark:text-[#F3EFE7] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] dark:focus-visible:ring-[#74C69D] rounded-lg py-1"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect
                x="2"
                y="2"
                width="60"
                height="60"
                rx="16"
                className="fill-white dark:fill-[#1C1A17] stroke-[#E4DFD5] dark:stroke-[#2E2A24]"
                strokeWidth="3"
              />
              <rect
                x="15"
                y="27"
                width="34"
                height="23"
                rx="4"
                className="fill-[#FAF8F4] dark:fill-[#23201C] stroke-[#1B4332] dark:stroke-[#74C69D]"
                strokeWidth="3.5"
              />
              <path
                d="M12.5 27H51.5"
                className="stroke-[#1B4332] dark:stroke-[#74C69D]"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M32 27V50"
                className="stroke-[#1B4332] dark:stroke-[#74C69D]"
                strokeWidth="3.5"
              />
              <path
                d="M32 27C32 20.5 26.8 15.5 22 15.5C18.8 15.5 16.5 17.8 16.5 20.8C16.5 24.2 19.6 27 25 27H32Z"
                className="fill-[#9B2226]/15 dark:fill-[#E57373]/20 stroke-[#9B2226] dark:stroke-[#E57373]"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path
                d="M32 27C32 20.5 37.2 15.5 42 15.5C45.2 15.5 47.5 17.8 47.5 20.8C47.5 24.2 44.4 27 39 27H32Z"
                className="fill-[#9B2226]/15 dark:fill-[#E57373]/20 stroke-[#9B2226] dark:stroke-[#E57373]"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-display text-lg sm:text-xl font-semibold tracking-tight">
              Amigo Secreto
            </span>
          </a>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {view === 'setup' ? (
              <span className="hidden md:inline text-xs text-[#6E685F] dark:text-[#A39B8F] whitespace-nowrap">
                Sin cuentas ni servidores · Enlace privado
              </span>
            ) : (
              <button
                type="button"
                onClick={handleCreateNew}
                className="min-h-[40px] px-3.5 py-1.5 text-xs sm:text-sm font-medium text-[#1B4332] dark:text-[#84D2AA] hover:bg-[#1B4332]/8 dark:hover:bg-[#74C69D]/12 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] dark:focus-visible:ring-[#74C69D]"
              >
                Nuevo sorteo
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="min-h-[40px] min-w-[40px] px-2.5 py-2 bg-white dark:bg-[#1C1A17] hover:bg-[#F2EFE9] dark:hover:bg-[#26231F] border border-[#E4DFD5] dark:border-[#2E2A24] text-[#1A1816] dark:text-[#F3EFE7] rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] dark:focus-visible:ring-[#74C69D]"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[#E9C46A]" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-[#1B4332]" aria-hidden="true" />
              )}
              <span className="hidden sm:inline text-xs font-medium whitespace-nowrap">
                {isDark ? 'Claro' : 'Oscuro'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {view === 'setup' && (
          <SetupView
            minPrice={minPrice}
            currency={currency}
            exchangeDate={exchangeDate}
            participants={participants}
            validation={validation}
            onMinPriceChange={handleMinPriceChange}
            onCurrencyChange={setCurrency}
            onExchangeDateChange={setExchangeDate}
            onParticipantChange={handleParticipantChange}
            onAddParticipant={handleAddParticipant}
            onRemoveParticipant={handleRemoveParticipant}
            onStartDraw={handleStartDraw}
          />
        )}

        {view === 'confirm' && confirmedPayload && (
          <ConfirmationView
            payload={confirmedPayload}
            shareUrl={shareUrl}
            onBackToEdit={handleBackToEdit}
            onCreateNew={handleCreateNew}
            onPreviewParticipantView={handlePreviewParticipantView}
          />
        )}

        {view === 'participant' && (
          <ParticipantView
            payload={hashPayload}
            decodeError={hashError}
            onCreateNewExchange={handleCreateNew}
          />
        )}
      </main>

      <footer className="border-t border-[#E4DFD5] dark:border-[#2A2621] py-6 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#6E685F] dark:text-[#A39B8F]">
          <span>Todos los datos viajan codificados en el enlace del navegador.</span>
          <span>Amigo Secreto</span>
        </div>
      </footer>
    </div>
  );
}
