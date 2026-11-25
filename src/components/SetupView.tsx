import React from 'react';
import {
  Plus,
  Trash2,
  Shuffle,
  AlertCircle,
  Gift,
  Calendar,
  X,
  RotateCcw,
} from 'lucide-react';
import { CurrencyCode, ParticipantInput } from '../types';
import {
  CURRENCY_OPTIONS,
  ValidationResult,
  formatExchangeDate,
  formatPrice,
} from '../utils/exchange';
import { InfoSections } from './InfoSections';

interface SetupViewProps {
  exchangeTitle: string;
  minPrice: string;
  currency: CurrencyCode;
  exchangeDate: string;
  participants: ParticipantInput[];
  validation: ValidationResult | null;
  drawError: string | null;
  onExchangeTitleChange: (val: string) => void;
  onMinPriceChange: (val: string) => void;
  onCurrencyChange: (val: CurrencyCode) => void;
  onExchangeDateChange: (val: string) => void;
  onParticipantChange: (
    id: string,
    field: keyof Omit<ParticipantInput, 'id'>,
    val: string
  ) => void;
  onAddParticipant: () => void;
  onRemoveParticipant: (id: string) => void;
  onResetDraft: () => void;
  onStartDraw: () => void;
}

export const SetupView: React.FC<SetupViewProps> = ({
  exchangeTitle,
  minPrice,
  currency,
  exchangeDate,
  participants,
  validation,
  drawError,
  onExchangeTitleChange,
  onMinPriceChange,
  onCurrencyChange,
  onExchangeDateChange,
  onParticipantChange,
  onAddParticipant,
  onRemoveParticipant,
  onResetDraft,
  onStartDraw,
}) => {
  const numericPrice = Number(minPrice);
  const displayPrice =
    minPrice.trim() !== '' &&
    !Number.isNaN(numericPrice) &&
    Number.isFinite(numericPrice) &&
    numericPrice >= 0
      ? formatPrice(numericPrice, currency)
      : 'Por definir';

  const formattedDate = formatExchangeDate(exchangeDate);
  const namedCount = participants.filter((p) => p.name.trim().length > 0).length;

  const allErrors = [
    ...(validation && !validation.valid ? validation.errors : []),
    ...(drawError ? [drawError] : []),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartDraw();
  };

  return (
    <div id="organizar" className="w-full scroll-mt-24">
      <form onSubmit={handleSubmit} noValidate className="w-full">
        <div className="mb-8 lg:mb-10 max-w-2xl">
          <p className="text-xs font-medium tracking-widest uppercase text-[#1B4332] dark:text-[#84D2AA] mb-2">
            Configuración del intercambio
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-[#1A1816] dark:text-[#F3EFE7] leading-[1.12] [text-wrap:balance]">
            Organiza tu intercambio de regalo secreto
          </h1>
          <p className="mt-3 text-base text-[#57524A] dark:text-[#B5ADA1] leading-relaxed">
            Define el presupuesto mínimo, la fecha y agrega a cada participante con sus gustos y un mensaje personal. Al iniciar el sorteo recibirás un enlace privado para compartir.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna izquierda: Configuración general y botón de sorteo */}
          <aside className="lg:col-span-4 lg:sticky lg:top-8 bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-2xl p-6 transition-colors duration-200">
            <div className="flex items-center gap-3 pb-5 border-b border-[#EFECE6] dark:border-[#2A2621]">
              <div className="w-10 h-10 rounded-xl bg-[#1B4332]/8 dark:bg-[#74C69D]/12 text-[#1B4332] dark:text-[#84D2AA] flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
                  Reglas del regalo
                </h2>
                <p className="text-xs text-[#6E685F] dark:text-[#A39B8F]">
                  Visible para todos los participantes
                </p>
              </div>
            </div>

            <div className="pt-5 space-y-5">
              <div>
                <label
                  htmlFor="exchange-title"
                  className="block text-sm font-medium text-[#1A1816] dark:text-[#F3EFE7] mb-2"
                >
                  Nombre del grupo o evento
                </label>
                <input
                  id="exchange-title"
                  type="text"
                  value={exchangeTitle}
                  onChange={(e) => onExchangeTitleChange(e.target.value)}
                  placeholder="Ej. Navidad Oficina 2026"
                  maxLength={80}
                  className="w-full min-h-[46px] px-3.5 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-sm text-[#1A1816] dark:text-[#F3EFE7] placeholder:text-[#9A9388] dark:placeholder:text-[#6E675D] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 dark:focus:ring-[#74C69D]/30 focus:border-[#1B4332] dark:focus:border-[#74C69D] transition-colors"
                />
                <p className="mt-1.5 text-xs text-[#6E685F] dark:text-[#A39B8F]">
                  Opcional · Ayuda a identificar el intercambio.
                </p>
              </div>

              <div>
                <label
                  htmlFor="min-price"
                  className="block text-sm font-medium text-[#1A1816] dark:text-[#F3EFE7] mb-2"
                >
                  Precio mínimo del regalo
                </label>
                <div className="flex items-stretch gap-2">
                  <div className="relative flex-1">
                    <input
                      id="min-price"
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={minPrice}
                      onChange={(e) => onMinPriceChange(e.target.value)}
                      placeholder="300"
                      className="w-full min-h-[46px] px-3.5 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-base text-[#1A1816] dark:text-[#F3EFE7] tabular-nums placeholder:text-[#9A9388] dark:placeholder:text-[#6E675D] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 dark:focus:ring-[#74C69D]/30 focus:border-[#1B4332] dark:focus:border-[#74C69D] transition-colors"
                    />
                  </div>
                  <select
                    aria-label="Moneda"
                    value={currency}
                    onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
                    className="min-h-[46px] px-3 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-sm font-medium text-[#1A1816] dark:text-[#F3EFE7] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 dark:focus:ring-[#74C69D]/30 focus:border-[#1B4332] dark:focus:border-[#74C69D] transition-colors cursor-pointer"
                  >
                    {CURRENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1.5 text-xs text-[#6E685F] dark:text-[#A39B8F]">
                  Sirve como referencia mínima para orientar las compras.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor="exchange-date"
                    className="block text-sm font-medium text-[#1A1816] dark:text-[#F3EFE7]"
                  >
                    Fecha del intercambio
                  </label>
                  {exchangeDate && (
                    <button
                      type="button"
                      onClick={() => onExchangeDateChange('')}
                      className="text-xs font-medium text-[#6E685F] dark:text-[#A39B8F] hover:text-[#9B2226] dark:hover:text-[#F28B82] inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                      <span>Quitar</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Calendar
                    className="w-4 h-4 text-[#857E74] dark:text-[#968E83] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="exchange-date"
                    type="date"
                    value={exchangeDate}
                    onChange={(e) => onExchangeDateChange(e.target.value)}
                    className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-sm text-[#1A1816] dark:text-[#F3EFE7] [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 dark:focus:ring-[#74C69D]/30 focus:border-[#1B4332] dark:focus:border-[#74C69D] transition-colors"
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#6E685F] dark:text-[#A39B8F]">
                  Opcional · Se incluirá en la tarjeta de cada participante.
                </p>
              </div>

              <div className="pt-4 border-t border-[#EFECE6] dark:border-[#2A2621] space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6E685F] dark:text-[#A39B8F]">
                    Participantes agregados
                  </span>
                  <span className="font-semibold text-[#1A1816] dark:text-[#F3EFE7] tabular-nums">
                    {participants.length}{' '}
                    {participants.length === 1 ? 'persona' : 'personas'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6E685F] dark:text-[#A39B8F]">
                    Con nombre completo
                  </span>
                  <span className="font-medium text-[#1A1816] dark:text-[#F3EFE7] tabular-nums">
                    {namedCount} de {participants.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6E685F] dark:text-[#A39B8F]">
                    Mínimo del regalo
                  </span>
                  <span className="font-semibold text-[#1B4332] dark:text-[#84D2AA] tabular-nums">
                    {displayPrice}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-[#6E685F] dark:text-[#A39B8F] shrink-0">
                    Fecha
                  </span>
                  <span className="font-medium text-[#1A1816] dark:text-[#F3EFE7] text-right">
                    {formattedDate ?? 'Sin fecha'}
                  </span>
                </div>
              </div>

              {allErrors.length > 0 && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-[#9B2226]/6 dark:bg-[#9B2226]/18 border border-[#9B2226]/25 dark:border-[#E57373]/35 text-[#7F1D1D] dark:text-[#F7B2B2] text-sm space-y-1.5"
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Revisa antes de sortear</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs leading-relaxed">
                    {allErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] px-5 py-3 bg-[#1B4332] hover:bg-[#143326] dark:bg-[#2D6A4F] dark:hover:bg-[#38805F] active:scale-[0.99] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] dark:focus-visible:ring-[#74C69D] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#1C1A17]"
              >
                <Shuffle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">Iniciar sorteo</span>
              </button>

              <p className="text-xs text-[#6E685F] dark:text-[#A39B8F] leading-relaxed">
                Requisito: al menos 3 participantes con nombres distintos. Nadie podrá tocarse a sí mismo.
              </p>
            </div>
          </aside>

          {/* Columna derecha: Lista de participantes */}
          <section className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#E4DFD5] dark:border-[#2A2621]">
              <div className="flex items-baseline gap-2.5">
                <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
                  Participantes
                </h2>
                <span className="text-sm text-[#6E685F] dark:text-[#A39B8F] tabular-nums">
                  · {participants.length} en la lista
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onResetDraft}
                  title="Limpiar formulario"
                  className="min-h-[44px] px-3 py-2 text-xs font-medium text-[#6E685F] dark:text-[#A39B8F] hover:text-[#1A1816] dark:hover:text-[#F3EFE7] hover:bg-[#EFECE6] dark:hover:bg-[#25221E] rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Limpiar</span>
                </button>

                <button
                  type="button"
                  onClick={onAddParticipant}
                  className="min-h-[44px] px-4 py-2 bg-white dark:bg-[#1C1A17] hover:bg-[#F2EFE9] dark:hover:bg-[#25221E] border border-[#D8D1C5] dark:border-[#343029] text-[#1A1816] dark:text-[#F3EFE7] text-sm font-medium rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] dark:focus-visible:ring-[#74C69D]"
                >
                  <Plus
                    className="w-4 h-4 text-[#1B4332] dark:text-[#84D2AA]"
                    aria-hidden="true"
                  />
                  <span>Añadir participante</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {participants.map((participant, index) => {
                const isEmptyError = validation?.emptyNameIds.has(participant.id);
                const isDuplicateError = validation?.duplicateIds.has(participant.id);
                const hasNameError = Boolean(isEmptyError || isDuplicateError);
                const indexLabel = String(index + 1).padStart(2, '0');
                const otherNamedParticipants = participants.filter(
                  (other) => other.id !== participant.id && other.name.trim().length > 0
                );

                return (
                  <div
                    key={participant.id}
                    className={`bg-white dark:bg-[#1C1A17] border rounded-2xl p-5 sm:p-6 transition-colors ${
                      hasNameError
                        ? 'border-[#9B2226]/50 dark:border-[#E57373]/55'
                        : 'border-[#E4DFD5] dark:border-[#2E2A24]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-mono text-xs font-medium text-[#6E685F] dark:text-[#A39B8F] tabular-nums">
                          {indexLabel}.
                        </span>
                        <span className="text-sm font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
                          {participant.name.trim()
                            ? participant.name.trim()
                            : `Participante ${index + 1}`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveParticipant(participant.id)}
                        disabled={participants.length <= 1}
                        aria-label={`Eliminar participante ${participant.name.trim() || index + 1}`}
                        className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-[#6E685F] dark:text-[#A39B8F] hover:text-[#9B2226] dark:hover:text-[#F28B82] hover:bg-[#9B2226]/6 dark:hover:bg-[#9B2226]/18 disabled:opacity-35 disabled:pointer-events-none inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B2226] dark:focus-visible:ring-[#E57373]"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                        <span>Eliminar</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor={`name-${participant.id}`}
                          className="block text-xs font-semibold text-[#3F3B35] dark:text-[#D9D2C7] mb-1.5"
                        >
                          Nombre{' '}
                          <span className="text-[#9B2226] dark:text-[#F28B82]">*</span>
                        </label>
                        <input
                          id={`name-${participant.id}`}
                          type="text"
                          value={participant.name}
                          onChange={(e) =>
                            onParticipantChange(participant.id, 'name', e.target.value)
                          }
                          placeholder="Ej. Sofía Martínez"
                          autoComplete="off"
                          className={`w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border rounded-xl text-sm text-[#1A1816] dark:text-[#F3EFE7] placeholder:text-[#9A9388] dark:placeholder:text-[#6E675D] focus:outline-none focus:ring-2 transition-colors ${
                            hasNameError
                              ? 'border-[#9B2226] dark:border-[#E57373] focus:ring-[#9B2226]/20 dark:focus:ring-[#E57373]/25 focus:border-[#9B2226] dark:focus:border-[#E57373]'
                              : 'border-[#DDD6CA] dark:border-[#343029] focus:ring-[#1B4332]/20 dark:focus:ring-[#74C69D]/25 focus:border-[#1B4332] dark:focus:border-[#74C69D]'
                          }`}
                        />
                        {isEmptyError && (
                          <p className="mt-1.5 text-xs font-medium text-[#9B2226] dark:text-[#F28B82]">
                            Escribe el nombre de este participante.
                          </p>
                        )}
                        {isDuplicateError && (
                          <p className="mt-1.5 text-xs font-medium text-[#9B2226] dark:text-[#F28B82]">
                            Este nombre está repetido. Usa un apellido o apodo para distinguirlo.
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor={`likes-${participant.id}`}
                          className="block text-xs font-semibold text-[#3F3B35] dark:text-[#D9D2C7] mb-1.5"
                        >
                          Gustos o ideas de regalo
                        </label>
                        <textarea
                          id={`likes-${participant.id}`}
                          rows={2}
                          value={participant.likes}
                          onChange={(e) =>
                            onParticipantChange(participant.id, 'likes', e.target.value)
                          }
                          placeholder="Café en grano, libros de ciencia ficción, velas aromáticas…"
                          className="w-full px-3.5 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-sm text-[#1A1816] dark:text-[#F3EFE7] placeholder:text-[#9A9388] dark:placeholder:text-[#6E675D] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 dark:focus:ring-[#74C69D]/25 focus:border-[#1B4332] dark:focus:border-[#74C69D] transition-colors resize-y"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`message-${participant.id}`}
                          className="block text-xs font-semibold text-[#3F3B35] dark:text-[#D9D2C7] mb-1.5"
                        >
                          Mensaje o pista personal
                        </label>
                        <textarea
                          id={`message-${participant.id}`}
                          rows={2}
                          value={participant.message}
                          onChange={(e) =>
                            onParticipantChange(participant.id, 'message', e.target.value)
                          }
                          placeholder="Ej. Soy talla M, prefiero tonos oscuros o evitar chocolates con nuez"
                          className="w-full px-3.5 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-sm text-[#1A1816] dark:text-[#F3EFE7] placeholder:text-[#9A9388] dark:placeholder:text-[#6E675D] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 dark:focus:ring-[#74C69D]/25 focus:border-[#1B4332] dark:focus:border-[#74C69D] transition-colors resize-y"
                        />
                      </div>

                      {otherNamedParticipants.length >= 2 && (
                        <div className="sm:col-span-2 pt-1">
                          <label
                            htmlFor={`exclude-${participant.id}`}
                            className="block text-xs font-medium text-[#6E685F] dark:text-[#A39B8F] mb-1.5"
                          >
                            Exclusión opcional (no puede regalar a)
                          </label>
                          <select
                            id={`exclude-${participant.id}`}
                            value={participant.excludeId ?? ''}
                            onChange={(e) =>
                              onParticipantChange(
                                participant.id,
                                'excludeId',
                                e.target.value
                              )
                            }
                            className="w-full sm:w-auto min-w-[240px] min-h-[40px] px-3 py-2 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-xs sm:text-sm text-[#1A1816] dark:text-[#F3EFE7] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 dark:focus:ring-[#74C69D]/25 focus:border-[#1B4332] dark:focus:border-[#74C69D] transition-colors cursor-pointer"
                          >
                            <option value="">Sin restricciones (cualquiera del grupo)</option>
                            {otherNamedParticipants.map((other) => (
                              <option key={other.id} value={other.id}>
                                Evitar regalar a {other.name.trim()}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {allErrors.length > 0 && (
              <div
                role="alert"
                className="lg:hidden p-3.5 rounded-xl bg-[#9B2226]/6 dark:bg-[#9B2226]/18 border border-[#9B2226]/25 dark:border-[#E57373]/35 text-[#7F1D1D] dark:text-[#F7B2B2] text-sm space-y-1.5"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Revisa antes de sortear</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs leading-relaxed">
                  {allErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={onAddParticipant}
                className="min-h-[46px] px-4 py-2.5 bg-white dark:bg-[#1C1A17] hover:bg-[#F2EFE9] dark:hover:bg-[#25221E] border border-dashed border-[#C9C0B1] dark:border-[#3B362E] text-[#1A1816] dark:text-[#F3EFE7] text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus
                  className="w-4 h-4 text-[#1B4332] dark:text-[#84D2AA]"
                  aria-hidden="true"
                />
                <span>Añadir otro participante</span>
              </button>

              <button
                type="submit"
                className="lg:hidden min-h-[48px] px-5 py-3 bg-[#1B4332] hover:bg-[#143326] dark:bg-[#2D6A4F] dark:hover:bg-[#38805F] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Shuffle className="w-4 h-4" aria-hidden="true" />
                <span>Iniciar sorteo</span>
              </button>
            </div>
          </section>
        </div>
      </form>

      <InfoSections />
    </div>
  );
};
