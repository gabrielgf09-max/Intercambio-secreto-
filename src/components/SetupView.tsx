import React from 'react';
import { Plus, Trash2, Shuffle, AlertCircle, Gift } from 'lucide-react';
import { CurrencyCode, ParticipantInput } from '../types';
import { CURRENCY_OPTIONS, ValidationResult, formatPrice } from '../utils/exchange';

interface SetupViewProps {
  minPrice: string;
  currency: CurrencyCode;
  participants: ParticipantInput[];
  validation: ValidationResult | null;
  onMinPriceChange: (val: string) => void;
  onCurrencyChange: (val: CurrencyCode) => void;
  onParticipantChange: (id: string, field: keyof Omit<ParticipantInput, 'id'>, val: string) => void;
  onAddParticipant: () => void;
  onRemoveParticipant: (id: string) => void;
  onStartDraw: () => void;
}

export const SetupView: React.FC<SetupViewProps> = ({
  minPrice,
  currency,
  participants,
  validation,
  onMinPriceChange,
  onCurrencyChange,
  onParticipantChange,
  onAddParticipant,
  onRemoveParticipant,
  onStartDraw,
}) => {
  const numericPrice = Number(minPrice);
  const displayPrice =
    minPrice.trim() !== '' && !Number.isNaN(numericPrice) && numericPrice >= 0
      ? formatPrice(numericPrice, currency)
      : 'Por definir';

  const namedCount = participants.filter((p) => p.name.trim().length > 0).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartDraw();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <div className="mb-8 lg:mb-10 max-w-2xl">
        <p className="text-xs font-medium tracking-widest uppercase text-[#1B4332] mb-2">
          Configuración del intercambio
        </p>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-[#1A1816] leading-[1.12] [text-wrap:balance]">
          Organiza tu intercambio de regalo secreto
        </h1>
        <p className="mt-3 text-base text-[#57524A] leading-relaxed">
          Define el presupuesto mínimo y agrega a cada participante con sus gustos y un mensaje personal. Al iniciar el sorteo recibirás un enlace privado para compartir.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna izquierda: Configuración general y botón de sorteo */}
        <aside className="lg:col-span-4 lg:sticky lg:top-8 bg-white border border-[#E4DFD5] rounded-2xl p-6">
          <div className="flex items-center gap-3 pb-5 border-b border-[#EFECE6]">
            <div className="w-10 h-10 rounded-xl bg-[#1B4332]/8 text-[#1B4332] flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-[#1A1816]">
                Reglas del regalo
              </h2>
              <p className="text-xs text-[#6E685F]">
                Visible para todos los participantes
              </p>
            </div>
          </div>

          <div className="pt-5 space-y-5">
            <div>
              <label
                htmlFor="min-price"
                className="block text-sm font-medium text-[#1A1816] mb-2"
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
                    className="w-full min-h-[46px] px-3.5 py-2.5 bg-[#FAF8F4] border border-[#DDD6CA] rounded-xl text-base text-[#1A1816] tabular-nums placeholder:text-[#9A9388] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 focus:border-[#1B4332] transition-colors"
                  />
                </div>
                <select
                  aria-label="Moneda"
                  value={currency}
                  onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
                  className="min-h-[46px] px-3 py-2.5 bg-[#FAF8F4] border border-[#DDD6CA] rounded-xl text-sm font-medium text-[#1A1816] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 focus:border-[#1B4332] transition-colors cursor-pointer"
                >
                  {CURRENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1.5 text-xs text-[#6E685F]">
                Sirve como referencia mínima para orientar las compras.
              </p>
            </div>

            <div className="pt-4 border-t border-[#EFECE6] space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6E685F]">Participantes agregados</span>
                <span className="font-semibold text-[#1A1816] tabular-nums">
                  {participants.length} {participants.length === 1 ? 'persona' : 'personas'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6E685F]">Con nombre completo</span>
                <span className="font-medium text-[#1A1816] tabular-nums">
                  {namedCount} de {participants.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6E685F]">Mínimo del regalo</span>
                <span className="font-semibold text-[#1B4332] tabular-nums">
                  {displayPrice}
                </span>
              </div>
            </div>

            {validation && !validation.valid && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-[#9B2226]/6 border border-[#9B2226]/25 text-[#7F1D1D] text-sm space-y-1.5"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Revisa antes de sortear</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs leading-relaxed">
                  {validation.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="submit"
              className="w-full min-h-[48px] px-5 py-3 bg-[#1B4332] hover:bg-[#143326] active:scale-[0.99] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <Shuffle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">Iniciar sorteo</span>
            </button>

            <p className="text-xs text-[#6E685F] leading-relaxed">
              Requisito: al menos 3 participantes con nombres distintos. Nadie podrá tocarse a sí mismo.
            </p>
          </div>
        </aside>

        {/* Columna derecha: Lista de participantes */}
        <section className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#E4DFD5]">
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#1A1816]">
                Participantes
              </h2>
              <span className="text-sm text-[#6E685F] tabular-nums">
                · {participants.length} en la lista
              </span>
            </div>

            <button
              type="button"
              onClick={onAddParticipant}
              className="min-h-[44px] px-4 py-2 bg-white hover:bg-[#F2EFE9] border border-[#D8D1C5] text-[#1A1816] text-sm font-medium rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332]"
            >
              <Plus className="w-4 h-4 text-[#1B4332]" aria-hidden="true" />
              <span>Añadir participante</span>
            </button>
          </div>

          <div className="space-y-4">
            {participants.map((participant, index) => {
              const isEmptyError = validation?.emptyNameIds.has(participant.id);
              const isDuplicateError = validation?.duplicateIds.has(participant.id);
              const hasNameError = Boolean(isEmptyError || isDuplicateError);
              const indexLabel = String(index + 1).padStart(2, '0');

              return (
                <div
                  key={participant.id}
                  className={`bg-white border rounded-2xl p-5 sm:p-6 transition-colors ${
                    hasNameError ? 'border-[#9B2226]/50' : 'border-[#E4DFD5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-mono text-xs font-medium text-[#6E685F] tabular-nums">
                        {indexLabel}.
                      </span>
                      <span className="text-sm font-semibold text-[#1A1816]">
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
                      className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-[#6E685F] hover:text-[#9B2226] hover:bg-[#9B2226]/6 disabled:opacity-35 disabled:pointer-events-none inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9B2226]"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                      <span>Eliminar</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`name-${participant.id}`}
                        className="block text-xs font-semibold text-[#3F3B35] mb-1.5"
                      >
                        Nombre <span className="text-[#9B2226]">*</span>
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
                        className={`w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAF8F4] border rounded-xl text-sm text-[#1A1816] placeholder:text-[#9A9388] focus:outline-none focus:ring-2 transition-colors ${
                          hasNameError
                            ? 'border-[#9B2226] focus:ring-[#9B2226]/20 focus:border-[#9B2226]'
                            : 'border-[#DDD6CA] focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
                        }`}
                      />
                      {isEmptyError && (
                        <p className="mt-1.5 text-xs font-medium text-[#9B2226]">
                          Escribe el nombre de este participante.
                        </p>
                      )}
                      {isDuplicateError && (
                        <p className="mt-1.5 text-xs font-medium text-[#9B2226]">
                          Este nombre está repetido. Usa un apellido o apodo para distinguirlo.
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`likes-${participant.id}`}
                        className="block text-xs font-semibold text-[#3F3B35] mb-1.5"
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
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F4] border border-[#DDD6CA] rounded-xl text-sm text-[#1A1816] placeholder:text-[#9A9388] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-colors resize-y"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`message-${participant.id}`}
                        className="block text-xs font-semibold text-[#3F3B35] mb-1.5"
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
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F4] border border-[#DDD6CA] rounded-xl text-sm text-[#1A1816] placeholder:text-[#9A9388] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-colors resize-y"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={onAddParticipant}
              className="min-h-[46px] px-4 py-2.5 bg-white hover:bg-[#F2EFE9] border border-dashed border-[#C9C0B1] text-[#1A1816] text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-[#1B4332]" aria-hidden="true" />
              <span>Añadir otro participante</span>
            </button>

            <button
              type="submit"
              className="lg:hidden min-h-[48px] px-5 py-3 bg-[#1B4332] hover:bg-[#143326] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Shuffle className="w-4 h-4" aria-hidden="true" />
              <span>Iniciar sorteo</span>
            </button>
          </div>
        </section>
      </div>
    </form>
  );
};
