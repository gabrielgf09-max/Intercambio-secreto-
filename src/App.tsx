import { useEffect, useMemo, useState } from 'react';
import { Moon, Sun, Users, Shuffle } from 'lucide-react';
import { AppView, CurrencyCode, ExchangePayload, ParticipantInput } from './types';
import {
  CURRENCY_OPTIONS,
  ValidationResult,
  createEmptyParticipant,
  decodePayloadFromHash,
  decodePayloadFromHashSync,
  drawAssignments,
  encodePayloadToHash,
  validateSetup,
} from './utils/exchange';
import { normalizeRoomCode } from './services/rooms';
import { SetupView } from './components/SetupView';
import { ConfirmationView } from './components/ConfirmationView';
import { ParticipantView } from './components/ParticipantView';
import { RoomWorkspace } from './components/RoomWorkspace';
import { ErrorBoundary } from './components/ErrorBoundary';

const THEME_STORAGE_KEY = 'amigo-secreto-theme';
const DRAFT_STORAGE_KEY = 'amigo-secreto-draft';

type ThemeMode = 'light' | 'dark';

interface SetupDraft {
  exchangeTitle: string;
  minPrice: string;
  currency: CurrencyCode;
  exchangeDate: string;
  participants: ParticipantInput[];
}

function getDefaultDraft(): SetupDraft {
  return {
    exchangeTitle: '',
    minPrice: '250',
    currency: '$',
    exchangeDate: '',
    participants: [
      createEmptyParticipant(0),
      createEmptyParticipant(1),
      createEmptyParticipant(2),
    ],
  };
}

function loadSavedDraft(): SetupDraft {
  if (typeof window === 'undefined') return getDefaultDraft();
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return getDefaultDraft();
    const parsed = JSON.parse(raw) as Partial<SetupDraft>;
    if (!parsed || !Array.isArray(parsed.participants) || parsed.participants.length === 0) {
      return getDefaultDraft();
    }
    const validCurrency = CURRENCY_OPTIONS.some((c) => c.value === parsed.currency)
      ? (parsed.currency as CurrencyCode)
      : '$';
    const participants: ParticipantInput[] = parsed.participants.map((p, idx) => ({
      id: typeof p?.id === 'string' && p.id ? p.id : `restored-${idx}-${Date.now()}`,
      name: typeof p?.name === 'string' ? p.name : '',
      message: typeof p?.message === 'string' ? p.message : '',
      likes: typeof p?.likes === 'string' ? p.likes : '',
      excludeId: typeof p?.excludeId === 'string' ? p.excludeId : '',
    }));

    return {
      exchangeTitle: typeof parsed.exchangeTitle === 'string' ? parsed.exchangeTitle : '',
      minPrice: typeof parsed.minPrice === 'string' ? parsed.minPrice : '250',
      currency: validCurrency,
      exchangeDate: typeof parsed.exchangeDate === 'string' ? parsed.exchangeDate : '',
      participants,
    };
  } catch {
    return getDefaultDraft();
  }
}

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

function parseRoomCodeFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (hash && hash.toLowerCase().startsWith('#sala=')) {
    const code = normalizeRoomCode(hash.slice(6));
    return code.length >= 4 ? code : null;
  }
  const params = new URLSearchParams(window.location.search);
  const queryRoom = params.get('sala');
  if (queryRoom) {
    const code = normalizeRoomCode(queryRoom);
    return code.length >= 4 ? code : null;
  }
  return null;
}

function getInitialRouteState(): {
  view: AppView;
  roomCode: string | null;
  payload: ExchangePayload | null;
  error: string | null;
  needsAsync: boolean;
} {
  if (typeof window === 'undefined') {
    return { view: 'setup', roomCode: null, payload: null, error: null, needsAsync: false };
  }

  const roomCode = parseRoomCodeFromLocation();
  if (roomCode) {
    return { view: 'rooms', roomCode, payload: null, error: null, needsAsync: false };
  }

  const hash = window.location.hash;
  if (!hash || hash === '#') {
    return { view: 'setup', roomCode: null, payload: null, error: null, needsAsync: false };
  }
  const decoded = decodePayloadFromHashSync(hash);
  return {
    view: 'participant',
    roomCode: null,
    payload: decoded.data,
    error: decoded.error,
    needsAsync: decoded.needsAsync,
  };
}

function clearUrlHash() {
  if (typeof window === 'undefined') return;
  try {
    const cleanUrl = window.location.pathname;
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
    // Keep current screen intact even if replaceState is restricted
  }
}

export default function App() {
  const initialState = useMemo(() => getInitialRouteState(), []);
  const initialDraft = useMemo(() => loadSavedDraft(), []);

  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [view, setView] = useState<AppView>(initialState.view);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(
    initialState.roomCode
  );
  const [exchangeTitle, setExchangeTitle] = useState<string>(initialDraft.exchangeTitle);
  const [minPrice, setMinPrice] = useState<string>(initialDraft.minPrice);
  const [currency, setCurrency] = useState<CurrencyCode>(initialDraft.currency);
  const [exchangeDate, setExchangeDate] = useState<string>(initialDraft.exchangeDate);
  const [participants, setParticipants] = useState<ParticipantInput[]>(
    initialDraft.participants
  );
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [drawError, setDrawError] = useState<string | null>(null);

  const [confirmedPayload, setConfirmedPayload] = useState<ExchangePayload | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');

  const [hashPayload, setHashPayload] = useState<ExchangePayload | null>(
    initialState.payload
  );
  const [hashError, setHashError] = useState<string | null>(initialState.error);
  const [isDecodingHash, setIsDecodingHash] = useState<boolean>(
    initialState.needsAsync
  );

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
    try {
      const draft: SetupDraft = {
        exchangeTitle,
        minPrice,
        currency,
        exchangeDate,
        participants,
      };
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignore storage quota/access errors
    }
  }, [exchangeTitle, minPrice, currency, exchangeDate, participants]);

  useEffect(() => {
    let cancelled = false;

    const loadLocationHash = async (hash: string) => {
      const roomCode = parseRoomCodeFromLocation();
      if (roomCode) {
        setActiveRoomCode(roomCode);
        setHashPayload(null);
        setHashError(null);
        setIsDecodingHash(false);
        setView('rooms');
        return;
      }

      if (!hash || hash === '#') {
        setActiveRoomCode(null);
        setHashPayload(null);
        setHashError(null);
        setIsDecodingHash(false);
        setView('setup');
        return;
      }

      const syncRes = decodePayloadFromHashSync(hash);
      if (!syncRes.needsAsync) {
        setActiveRoomCode(null);
        setHashPayload(syncRes.data);
        setHashError(syncRes.error);
        setIsDecodingHash(false);
        setView('participant');
        return;
      }

      setActiveRoomCode(null);
      setIsDecodingHash(true);
      setView('participant');
      const asyncRes = await decodePayloadFromHash(hash);
      if (!cancelled) {
        setHashPayload(asyncRes.data);
        setHashError(asyncRes.error);
        setIsDecodingHash(false);
      }
    };

    if (initialState.needsAsync && typeof window !== 'undefined') {
      void loadLocationHash(window.location.hash);
    }

    const handleHashChange = () => {
      void loadLocationHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [initialState.needsAsync]);

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
    if (validation) setValidation(null);
    if (drawError) setDrawError(null);
  };

  const handleAddParticipant = () => {
    setParticipants((prev) => [...prev, createEmptyParticipant(prev.length)]);
    if (validation) setValidation(null);
    if (drawError) setDrawError(null);
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants((prev) => {
      if (prev.length <= 1) return prev;
      return prev
        .filter((p) => p.id !== id)
        .map((p) => (p.excludeId === id ? { ...p, excludeId: '' } : p));
    });
    if (validation) setValidation(null);
    if (drawError) setDrawError(null);
  };

  const handleMinPriceChange = (value: string) => {
    setMinPrice(value);
    if (validation) setValidation(null);
  };

  const handleResetDraft = () => {
    const fresh = getDefaultDraft();
    setExchangeTitle(fresh.exchangeTitle);
    setMinPrice(fresh.minPrice);
    setCurrency(fresh.currency);
    setExchangeDate(fresh.exchangeDate);
    setParticipants(fresh.participants);
    setValidation(null);
    setDrawError(null);
  };

  const handleStartDraw = async () => {
    const result = validateSetup(participants, minPrice);
    if (!result.valid) {
      setValidation(result);
      setDrawError(null);
      return;
    }

    const drawResult = drawAssignments(participants);
    if (!drawResult.ok) {
      setValidation(null);
      setDrawError(drawResult.error);
      return;
    }

    setValidation(null);
    setDrawError(null);

    const trimmedTitle = exchangeTitle.trim();
    const trimmedDate = exchangeDate.trim();
    const payload: ExchangePayload = {
      ...(trimmedTitle ? { titulo: trimmedTitle } : {}),
      precioMinimo: Number(minPrice),
      moneda: currency,
      ...(trimmedDate ? { fechaIntercambio: trimmedDate } : {}),
      participantes: drawResult.assigned,
    };

    const encodedHash = await encodePayloadToHash(payload);
    const baseUrl = window.location.href.split('#')[0];
    const fullUrl = `${baseUrl}#${encodedHash}`;
    setUrlHashSilently(encodedHash);

    setConfirmedPayload(payload);
    setShareUrl(fullUrl);
    setHashPayload(payload);
    setHashError(null);
    setIsDecodingHash(false);
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
    handleResetDraft();
    setActiveRoomCode(null);
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

  const handleSwitchMode = (target: 'setup' | 'rooms') => {
    if (target === 'setup') {
      clearUrlHash();
      setActiveRoomCode(null);
      setView('setup');
    } else {
      clearUrlHash();
      setActiveRoomCode(null);
      setView('rooms');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRoomCodeChange = (code: string | null) => {
    setActiveRoomCode(code);
    if (code) {
      setUrlHashSilently(`sala=${code}`);
    } else {
      clearUrlHash();
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isDark = theme === 'dark';
  const showModeSwitcher =
    view === 'setup' || (view === 'rooms' && !activeRoomCode);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4] dark:bg-[#131210] text-[#1A1816] dark:text-[#F3EFE7] transition-colors duration-200">
      <header className="sticky top-0 z-30 border-b border-[#E4DFD5] dark:border-[#2A2621] bg-[#FAF8F4]/92 dark:bg-[#131210]/92 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-6">
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

          {view === 'setup' && (
            <nav
              aria-label="Secciones principales"
              className="hidden md:flex items-center gap-6 text-sm font-medium text-[#57524A] dark:text-[#B5ADA1]"
            >
              <button
                type="button"
                onClick={() => scrollToSection('organizar')}
                className="hover:text-[#1A1816] dark:hover:text-[#F3EFE7] hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Organizar
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('como-funciona')}
                className="hover:text-[#1A1816] dark:hover:text-[#F3EFE7] hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Cómo funciona
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('preguntas')}
                className="hover:text-[#1A1816] dark:hover:text-[#F3EFE7] hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Preguntas
              </button>
            </nav>
          )}

          <div className="flex items-center gap-3 shrink-0">
            {(view === 'confirm' || view === 'participant') && (
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
        {showModeSwitcher && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div
              role="tablist"
              aria-label="Modo de intercambio"
              className="inline-flex items-center gap-1 p-1 bg-[#EFECE6] dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-xl"
            >
              <button
                type="button"
                role="tab"
                aria-selected={view === 'setup'}
                onClick={() => handleSwitchMode('setup')}
                className={`min-h-[40px] px-4 py-2 text-xs sm:text-sm font-medium rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  view === 'setup'
                    ? 'bg-white dark:bg-[#292621] text-[#1A1816] dark:text-[#F3EFE7] shadow-sm'
                    : 'text-[#57524A] dark:text-[#A39B8F] hover:text-[#1A1816] dark:hover:text-[#F3EFE7]'
                }`}
              >
                <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sorteo rápido</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={view === 'rooms'}
                onClick={() => handleSwitchMode('rooms')}
                className={`min-h-[40px] px-4 py-2 text-xs sm:text-sm font-medium rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  view === 'rooms'
                    ? 'bg-white dark:bg-[#292621] text-[#1A1816] dark:text-[#F3EFE7] shadow-sm'
                    : 'text-[#57524A] dark:text-[#A39B8F] hover:text-[#1A1816] dark:hover:text-[#F3EFE7]'
                }`}
              >
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sala con auto-registro</span>
              </button>
            </div>
          </div>
        )}

        <ErrorBoundary>
          {view === 'setup' && (
            <SetupView
              exchangeTitle={exchangeTitle}
              minPrice={minPrice}
              currency={currency}
              exchangeDate={exchangeDate}
              participants={participants}
              validation={validation}
              drawError={drawError}
              onExchangeTitleChange={setExchangeTitle}
              onMinPriceChange={handleMinPriceChange}
              onCurrencyChange={setCurrency}
              onExchangeDateChange={setExchangeDate}
              onParticipantChange={handleParticipantChange}
              onAddParticipant={handleAddParticipant}
              onRemoveParticipant={handleRemoveParticipant}
              onResetDraft={handleResetDraft}
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
              isLoading={isDecodingHash}
              onCreateNewExchange={handleCreateNew}
            />
          )}

          {view === 'rooms' && (
            <RoomWorkspace
              initialRoomCode={activeRoomCode}
              onRoomCodeChange={handleRoomCodeChange}
            />
          )}
        </ErrorBoundary>
      </main>

      <footer className="border-t border-[#E4DFD5] dark:border-[#2A2621] py-6 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#6E685F] dark:text-[#A39B8F]">
          <span>
            {view === 'rooms'
              ? 'Salas sincronizadas en tiempo real con perfiles privados.'
              : 'Todos los datos viajan codificados en el enlace del navegador.'}
          </span>
          <span>Amigo Secreto</span>
        </div>
      </footer>
    </div>
  );
}
