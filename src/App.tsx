import { useEffect, useMemo, useState } from 'react';
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
  const cleanUrl = window.location.pathname + window.location.search;
  window.history.replaceState(null, '', cleanUrl);
}

export default function App() {
  const initialState = useMemo(() => getInitialHashState(), []);

  const [view, setView] = useState<AppView>(initialState.view);
  const [minPrice, setMinPrice] = useState<string>('250');
  const [currency, setCurrency] = useState<CurrencyCode>('$');
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
    const payload: ExchangePayload = {
      precioMinimo: Number(minPrice),
      moneda: currency,
      participantes: assigned,
    };

    const encodedHash = encodePayloadToHash(payload);
    const fullUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#${encodedHash}`;
    window.history.replaceState(null, '', `#${encodedHash}`);

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

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4] text-[#1A1816]">
      <header className="border-b border-[#E4DFD5] bg-[#FAF8F4]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-6">
          <a
            href={window.location.pathname}
            onClick={(e) => {
              e.preventDefault();
              handleCreateNew();
            }}
            className="inline-flex items-center gap-2.5 text-[#1A1816] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] rounded-lg py-1"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="text-[#1B4332] shrink-0"
            >
              <rect
                x="3.5"
                y="9"
                width="17"
                height="11.5"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                d="M2.5 9H21.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              <path
                d="M12 9V20.5"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                d="M12 9C12 6.5 9.8 4.5 7.8 4.5C6.5 4.5 5.5 5.4 5.5 6.6C5.5 7.9 6.8 9 9 9H12Z"
                stroke="#9B2226"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
              <path
                d="M12 9C12 6.5 14.2 4.5 16.2 4.5C17.5 4.5 18.5 5.4 18.5 6.6C18.5 7.9 17.2 9 15 9H12Z"
                stroke="#9B2226"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-display text-lg sm:text-xl font-semibold tracking-tight">
              Amigo Secreto
            </span>
          </a>

          <div className="flex items-center gap-4 shrink-0">
            {view === 'setup' ? (
              <span className="hidden sm:inline text-xs text-[#6E685F] whitespace-nowrap">
                Sin cuentas ni servidores · Enlace privado
              </span>
            ) : (
              <button
                type="button"
                onClick={handleCreateNew}
                className="min-h-[40px] px-3.5 py-1.5 text-xs sm:text-sm font-medium text-[#1B4332] hover:bg-[#1B4332]/8 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Nuevo sorteo
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {view === 'setup' && (
          <SetupView
            minPrice={minPrice}
            currency={currency}
            participants={participants}
            validation={validation}
            onMinPriceChange={handleMinPriceChange}
            onCurrencyChange={setCurrency}
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

      <footer className="border-t border-[#E4DFD5] py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#6E685F]">
          <span>Todos los datos viajan codificados en el enlace del navegador.</span>
          <span>Amigo Secreto</span>
        </div>
      </footer>
    </div>
  );
}
