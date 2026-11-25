import React, { useState } from 'react';
import { Check, Copy, ArrowLeft, PlusCircle, Lock, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { ExchangePayload } from '../types';
import { copyTextToClipboard, formatPrice } from '../utils/exchange';

interface ConfirmationViewProps {
  payload: ExchangePayload;
  shareUrl: string;
  onBackToEdit: () => void;
  onCreateNew: () => void;
  onPreviewParticipantView: () => void;
}

export const ConfirmationView: React.FC<ConfirmationViewProps> = ({
  payload,
  shareUrl,
  onBackToEdit,
  onCreateNew,
  onPreviewParticipantView,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2600);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white border border-[#E4DFD5] rounded-3xl p-6 sm:p-10">
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#EFECE6]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1B4332] text-white flex items-center justify-center shrink-0">
              <Check className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium tracking-widest uppercase text-[#1B4332]">
                Sorteo completado
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1A1816]">
                Enlace listo para compartir
              </h1>
            </div>
          </div>
        </div>

        <div className="py-6 space-y-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#57524A]">
            <span className="font-medium text-[#1A1816] tabular-nums">
              {payload.participantes.length} participantes
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Regalo mínimo {formatPrice(payload.precioMinimo, payload.moneda)}
            </span>
            <span aria-hidden="true">·</span>
            <span>Asignaciones secretas sin repeticiones</span>
          </div>

          <div>
            <label
              htmlFor="share-link-input"
              className="block text-sm font-semibold text-[#1A1816] mb-2"
            >
              Enlace único del intercambio
            </label>
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <input
                id="share-link-input"
                type="text"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                onClick={(e) => e.currentTarget.select()}
                className="flex-1 min-h-[48px] px-4 py-3 bg-[#FAF8F4] border border-[#DDD6CA] rounded-xl font-mono text-xs sm:text-sm text-[#3F3B35] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`min-h-[48px] px-5 py-3 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] ${
                  copied
                    ? 'bg-[#143326] text-white'
                    : 'bg-[#1B4332] hover:bg-[#143326] text-white active:scale-[0.99]'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Enlace copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Copiar enlace</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F4] border border-[#EAE4D9] flex items-start gap-3.5">
            <Lock className="w-5 h-5 text-[#1B4332] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm text-[#57524A] leading-relaxed space-y-1">
              <p className="font-semibold text-[#1A1816]">
                Privacidad protegida también para ti
              </p>
              <p>
                No mostramos la lista de parejas aquí para no arruinar la sorpresa. Envía este enlace al grupo; cuando tú lo abras y escribas tu nombre, verás únicamente a quién te toca regalar.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[#EFECE6] flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToEdit}
              className="min-h-[44px] px-4 py-2.5 bg-white hover:bg-[#F2EFE9] border border-[#D8D1C5] text-[#1A1816] text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Volver a editar</span>
            </button>

            <button
              type="button"
              onClick={onCreateNew}
              className="min-h-[44px] px-4 py-2.5 bg-white hover:bg-[#F2EFE9] border border-[#D8D1C5] text-[#57524A] hover:text-[#1A1816] text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>Crear otro sorteo</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onPreviewParticipantView}
            className="min-h-[44px] px-4 py-2.5 text-sm font-semibold text-[#1B4332] hover:bg-[#1B4332]/8 rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Abrir vista de participante</span>
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
