import React, { useMemo, useState } from 'react';
import {
  EyeOff,
  Gift,
  Heart,
  MessageSquare,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Users,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EncodedParticipant, ExchangePayload } from '../types';
import {
  findParticipantMatch,
  formatPrice,
  normalizeName,
  normalizeNameLoose,
} from '../utils/exchange';

interface ParticipantViewProps {
  payload: ExchangePayload | null;
  decodeError: string | null;
  onCreateNewExchange: () => void;
}

export const ParticipantView: React.FC<ParticipantViewProps> = ({
  payload,
  decodeError,
  onCreateNewExchange,
}) => {
  const [nameInput, setNameInput] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [showQuickList, setShowQuickList] = useState(false);
  const [activeGiver, setActiveGiver] = useState<EncodedParticipant | null>(null);
  const [showOwnDetails, setShowOwnDetails] = useState(false);

  const suggestions = useMemo(() => {
    if (!payload) return [];
    const q = normalizeNameLoose(nameInput);
    if (!q) return [];
    return payload.participantes.filter((p) => {
      const target = normalizeNameLoose(p.nombre);
      return target.includes(q) && normalizeName(p.nombre) !== normalizeName(nameInput);
    });
  }, [payload, nameInput]);

  const recipient = useMemo(() => {
    if (!payload || !activeGiver) return null;
    return (
      payload.participantes.find(
        (p) => normalizeName(p.nombre) === normalizeName(activeGiver.asignado)
      ) ?? null
    );
  }, [payload, activeGiver]);

  if (decodeError || !payload) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-[#E4DFD5] rounded-3xl p-6 sm:p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#9B2226]/10 text-[#9B2226] flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-[#1A1816]">
          Enlace no válido
        </h1>
        <p className="mt-2.5 text-sm text-[#57524A] leading-relaxed">
          {decodeError ??
            'No encontramos la información de este intercambio en el enlace.'}
        </p>
        <button
          type="button"
          onClick={onCreateNewExchange}
          className="mt-6 min-h-[48px] px-6 py-3 bg-[#1B4332] hover:bg-[#143326] text-white text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span>Crear un nuevo sorteo</span>
        </button>
      </div>
    );
  }

  const formattedMinPrice = formatPrice(payload.precioMinimo, payload.moneda);

  const handleIdentifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setLookupError('Escribe tu nombre para ver a quién te tocó regalar.');
      return;
    }

    const match = findParticipantMatch(payload, trimmed);
    if (!match) {
      setLookupError(
        `No encontramos "${trimmed}" en la lista. Revisa la ortografía o abre la lista rápida.`
      );
      return;
    }

    setLookupError(null);
    setActiveGiver(match);
    setShowOwnDetails(false);
  };

  const handleSelectParticipant = (participant: EncodedParticipant) => {
    setNameInput(participant.nombre);
    setLookupError(null);
    setActiveGiver(participant);
    setShowOwnDetails(false);
  };

  const handleHideAndSwitch = () => {
    setActiveGiver(null);
    setNameInput('');
    setLookupError(null);
    setShowQuickList(false);
    setShowOwnDetails(false);
  };

  return (
    <div className="max-w-xl mx-auto">
      <AnimatePresence mode="wait">
        {!activeGiver ? (
          <motion.div
            key="lookup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-[#E4DFD5] rounded-3xl p-6 sm:p-10"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-[#1B4332]/10 text-[#1B4332] flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium tracking-widest uppercase text-[#1B4332]">
                  Acceso privado
                </p>
                <p className="text-xs text-[#6E685F] tabular-nums">
                  {payload.participantes.length} participantes · Mínimo {formattedMinPrice}
                </p>
              </div>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1A1816] leading-tight [text-wrap:balance]">
              Descubre a quién te toca regalar
            </h1>
            <p className="mt-2.5 text-sm sm:text-base text-[#57524A] leading-relaxed">
              Ingresa tu nombre tal como aparece en el grupo. No importa si usas mayúsculas o espacios de más.
            </p>

            <form onSubmit={handleIdentifySubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="participant-name-lookup"
                  className="block text-sm font-semibold text-[#1A1816] mb-2"
                >
                  Tu nombre
                </label>
                <div className="relative">
                  <Search
                    className="w-4 h-4 text-[#857E74] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="participant-name-lookup"
                    type="text"
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      if (lookupError) setLookupError(null);
                    }}
                    placeholder="Escribe tu nombre…"
                    autoComplete="off"
                    className="w-full min-h-[48px] pl-10 pr-4 py-3 bg-[#FAF8F4] border border-[#DDD6CA] rounded-xl text-base text-[#1A1816] placeholder:text-[#9A9388] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 focus:border-[#1B4332] transition-colors"
                  />
                </div>

                {suggestions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#F0ECE4]">
                    <p className="text-xs text-[#6E685F] mb-1.5">
                      Sugerencias encontradas:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((item) => (
                        <button
                          key={item.nombre}
                          type="button"
                          onClick={() => handleSelectParticipant(item)}
                          className="min-h-[40px] px-3.5 py-1.5 bg-[#FAF8F4] hover:bg-[#1B4332]/10 border border-[#DDD6CA] hover:border-[#1B4332]/40 rounded-xl text-sm font-medium text-[#1A1816] transition-colors cursor-pointer"
                        >
                          {item.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {lookupError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-[#9B2226]/6 border border-[#9B2226]/25 text-[#7F1D1D] text-xs sm:text-sm flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{lookupError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] px-5 py-3 bg-[#1B4332] hover:bg-[#143326] active:scale-[0.99] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] focus-visible:ring-offset-2"
              >
                <span>Ver mi amigo secreto</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#EFECE6]">
              <button
                type="button"
                onClick={() => setShowQuickList((prev) => !prev)}
                aria-expanded={showQuickList}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl text-sm font-medium text-[#57524A] hover:text-[#1A1816] hover:bg-[#FAF8F4] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#1B4332]" aria-hidden="true" />
                  <span>¿Prefieres elegir de la lista rápida?</span>
                </span>
                {showQuickList ? (
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              {showQuickList && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {payload.participantes.map((p) => (
                    <button
                      key={p.nombre}
                      type="button"
                      onClick={() => handleSelectParticipant(p)}
                      className="min-h-[44px] px-3.5 py-2.5 bg-[#FAF8F4] hover:bg-[#1B4332]/8 border border-[#E4DFD5] hover:border-[#1B4332]/35 rounded-xl text-left text-sm font-medium text-[#1A1816] transition-colors cursor-pointer truncate"
                    >
                      {p.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onCreateNewExchange}
                className="text-xs font-medium text-[#6E685F] hover:text-[#1B4332] underline underline-offset-4 transition-colors cursor-pointer py-2 px-3"
              >
                Crear un nuevo sorteo desde cero
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-[#E4DFD5] rounded-3xl p-6 sm:p-10"
          >
            {/* Cabecera privada */}
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#EFECE6]">
              <div>
                <p className="text-xs font-medium tracking-widest uppercase text-[#6E685F]">
                  Tarjeta privada de {activeGiver.nombre}
                </p>
                <p className="mt-1 text-sm text-[#57524A]">
                  Asegúrate de que nadie más esté mirando la pantalla.
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#9B2226]/10 text-[#9B2226] flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>

            {/* Ancla focal: Receptor asignado */}
            <div className="py-7 border-b border-[#EFECE6] text-center">
              <p className="text-sm font-medium text-[#57524A]">
                {activeGiver.nombre}, te toca regalarle a:
              </p>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#1B4332] tracking-tight [text-wrap:balance]">
                {recipient ? recipient.nombre : activeGiver.asignado}
              </h1>
              <p className="mt-4 text-sm text-[#57524A] tabular-nums">
                Precio mínimo del regalo:{' '}
                <strong className="font-semibold text-[#1A1816]">
                  {formattedMinPrice}
                </strong>
              </p>
            </div>

            {/* Datos del receptor claramente etiquetados */}
            <div className="py-6 space-y-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1A1816] mb-1.5">
                  <Heart className="w-4 h-4 text-[#9B2226] shrink-0" aria-hidden="true" />
                  <span>
                    Gustos e ideas de regalo de{' '}
                    <span className="text-[#1B4332]">
                      {recipient ? recipient.nombre : activeGiver.asignado}
                    </span>
                  </span>
                </div>
                <p className="text-sm sm:text-base text-[#3F3B35] leading-relaxed bg-[#FAF8F4] border border-[#EAE4D9] rounded-2xl px-4 py-3.5">
                  {recipient?.gustos
                    ? recipient.gustos
                    : `${recipient?.nombre ?? activeGiver.asignado} no agregó gustos específicos.`}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1A1816] mb-1.5">
                  <MessageSquare
                    className="w-4 h-4 text-[#1B4332] shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    Mensaje personal de{' '}
                    <span className="text-[#1B4332]">
                      {recipient ? recipient.nombre : activeGiver.asignado}
                    </span>
                  </span>
                </div>
                <p className="text-sm sm:text-base text-[#3F3B35] leading-relaxed bg-[#FAF8F4] border border-[#EAE4D9] rounded-2xl px-4 py-3.5">
                  {recipient?.mensaje
                    ? recipient.mensaje
                    : `${recipient?.nombre ?? activeGiver.asignado} no dejó un mensaje adicional.`}
                </p>
              </div>

              {/* Desplegable opcional para verificar los propios datos */}
              {(activeGiver.gustos || activeGiver.mensaje) && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOwnDetails((prev) => !prev)}
                    aria-expanded={showOwnDetails}
                    className="min-h-[40px] px-2 py-1.5 text-xs font-medium text-[#6E685F] hover:text-[#1A1816] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {showOwnDetails ? (
                      <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>
                      Ver los datos que tú registraste ({activeGiver.nombre})
                    </span>
                  </button>

                  {showOwnDetails && (
                    <div className="mt-2.5 pt-3 border-t border-[#EFECE6] space-y-2.5 text-xs sm:text-sm text-[#57524A]">
                      <p>
                        <strong className="font-semibold text-[#1A1816]">
                          Tus gustos ({activeGiver.nombre}):
                        </strong>{' '}
                        {activeGiver.gustos || 'Sin gustos registrados.'}
                      </p>
                      <p>
                        <strong className="font-semibold text-[#1A1816]">
                          Tu mensaje ({activeGiver.nombre}):
                        </strong>{' '}
                        {activeGiver.mensaje || 'Sin mensaje registrado.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Acciones inferiores */}
            <div className="pt-5 border-t border-[#EFECE6] space-y-3">
              <button
                type="button"
                onClick={handleHideAndSwitch}
                className="w-full min-h-[48px] px-5 py-3 bg-[#1A1816] hover:bg-[#2F2B28] active:scale-[0.99] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1816] focus-visible:ring-offset-2"
              >
                <EyeOff className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Ocultar / Cambiar de participante</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={onCreateNewExchange}
                  className="text-xs font-medium text-[#6E685F] hover:text-[#1B4332] underline underline-offset-4 transition-colors cursor-pointer py-2 px-3"
                >
                  Crear un nuevo sorteo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
