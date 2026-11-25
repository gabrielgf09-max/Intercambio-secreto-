import { CurrencyCode, EncodedParticipant, ExchangePayload, ParticipantInput } from '../types';

export const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: '$', label: '$ (General)' },
  { value: 'MXN', label: 'MXN ($)' },
  { value: 'USD', label: 'USD ($)' },
  { value: '€', label: '€ (EUR)' },
  { value: 'ARS', label: 'ARS ($)' },
  { value: 'COP', label: 'COP ($)' },
  { value: 'CLP', label: 'CLP ($)' },
  { value: 'PEN', label: 'PEN (S/)' },
];

export function createEmptyParticipant(index?: number): ParticipantInput {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${index ?? 0}`,
    name: '',
    message: '',
    likes: '',
    excludeId: '',
  };
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

export function normalizeNameLoose(name: string): string {
  return normalizeName(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function formatPrice(amount: number, currency: CurrencyCode = '$'): string {
  const safeAmount = Number.isFinite(amount) && amount >= 0 ? amount : 0;
  const formattedNumber = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: safeAmount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);

  if (currency === '$') return `$${formattedNumber}`;
  if (currency === '€') return `€${formattedNumber}`;
  if (currency === 'PEN') return `S/ ${formattedNumber}`;
  return `$${formattedNumber} ${currency}`;
}

export function formatExchangeDate(isoDate?: string): string | null {
  if (!isoDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const localDate = new Date(year, month - 1, day);
  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== month - 1 ||
    localDate.getDate() !== day
  ) {
    return null;
  }
  const formatted = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(localDate);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Codifica un objeto JSON a Base64 URL-safe con soporte completo UTF-8.
 */
export function encodePayloadToHash(payload: ExchangePayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodifica el hash de la URL desde Base64 URL-safe UTF-8 y valida su estructura.
 */
export function decodePayloadFromHash(hash: string): {
  data: ExchangePayload | null;
  error: string | null;
} {
  let clean = (hash.startsWith('#') ? hash.slice(1) : hash).replace(/\s+/g, '');
  if (!clean) {
    return { data: null, error: null };
  }

  try {
    if (clean.includes('%')) {
      try {
        clean = decodeURIComponent(clean);
      } catch {
        // Keep original string if percent-decoding fails
      }
    }

    const base64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLength);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<ExchangePayload>;

    if (
      !parsed ||
      typeof parsed.precioMinimo !== 'number' ||
      !Number.isFinite(parsed.precioMinimo) ||
      parsed.precioMinimo < 0 ||
      !Array.isArray(parsed.participantes) ||
      parsed.participantes.length < 3
    ) {
      return {
        data: null,
        error: 'El enlace del sorteo está incompleto o no contiene participantes válidos.',
      };
    }

    const validCurrency = CURRENCY_OPTIONS.some((c) => c.value === parsed.moneda)
      ? (parsed.moneda as CurrencyCode)
      : '$';

    const participantes: EncodedParticipant[] = parsed.participantes.map((p) => ({
      nombre: typeof p?.nombre === 'string' ? p.nombre.trim() : '',
      mensaje: typeof p?.mensaje === 'string' ? p.mensaje.trim() : '',
      gustos: typeof p?.gustos === 'string' ? p.gustos.trim() : '',
      asignado: typeof p?.asignado === 'string' ? p.asignado.trim() : '',
    }));

    const hasInvalid = participantes.some((p) => !p.nombre || !p.asignado);
    if (hasInvalid) {
      return {
        data: null,
        error: 'Los datos de este sorteo están dañados o les faltan asignaciones.',
      };
    }

    const validTitle =
      typeof parsed.titulo === 'string' && parsed.titulo.trim().length > 0
        ? parsed.titulo.trim()
        : undefined;

    const validDate =
      typeof parsed.fechaIntercambio === 'string' &&
      formatExchangeDate(parsed.fechaIntercambio) !== null
        ? parsed.fechaIntercambio.trim()
        : undefined;

    return {
      data: {
        ...(validTitle ? { titulo: validTitle } : {}),
        precioMinimo: parsed.precioMinimo,
        moneda: validCurrency,
        ...(validDate ? { fechaIntercambio: validDate } : {}),
        participantes,
      },
      error: null,
    };
  } catch {
    return {
      data: null,
      error: 'No pudimos leer este enlace de sorteo. Es posible que esté incompleto.',
    };
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  duplicateIds: Set<string>;
  emptyNameIds: Set<string>;
}

export function validateSetup(
  participants: ParticipantInput[],
  minPriceInput: string
): ValidationResult {
  const errors: string[] = [];
  const duplicateIds = new Set<string>();
  const emptyNameIds = new Set<string>();

  const parsedPrice = Number(minPriceInput);
  if (
    minPriceInput.trim() === '' ||
    Number.isNaN(parsedPrice) ||
    !Number.isFinite(parsedPrice) ||
    parsedPrice < 0
  ) {
    errors.push('Ingresa un precio mínimo válido (puede ser 0 o mayor).');
  }

  if (participants.length < 3) {
    errors.push('Se necesitan al menos 3 participantes para realizar el sorteo.');
  }

  const seenNames = new Map<string, string[]>();
  for (const p of participants) {
    const normalized = normalizeName(p.name);
    if (!normalized) {
      emptyNameIds.add(p.id);
    } else {
      const existing = seenNames.get(normalized) ?? [];
      existing.push(p.id);
      seenNames.set(normalized, existing);
    }
  }

  if (emptyNameIds.size > 0) {
    errors.push('Todos los participantes deben tener un nombre.');
  }

  const duplicateNamesList: string[] = [];
  seenNames.forEach((ids) => {
    if (ids.length > 1) {
      ids.forEach((id) => duplicateIds.add(id));
      const original = participants.find((p) => p.id === ids[0])?.name.trim() ?? '';
      duplicateNamesList.push(original);
    }
  });

  if (duplicateNamesList.length > 0) {
    errors.push(
      `No puede haber nombres duplicados (${duplicateNamesList.join(', ')}).`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    duplicateIds,
    emptyNameIds,
  };
}

/**
 * Realiza el sorteo garantizando que nadie se toque a sí mismo,
 * respetando exclusiones opcionales y asignando un receptor único a cada participante.
 */
export function drawAssignments(
  participants: ParticipantInput[]
): { ok: true; assigned: EncodedParticipant[] } | { ok: false; error: string } {
  const n = participants.length;
  if (n < 3) {
    return {
      ok: false,
      error: 'Se necesitan al menos 3 participantes para realizar el sorteo.',
    };
  }

  const idToIndex = new Map<string, number>();
  participants.forEach((p, idx) => idToIndex.set(p.id, idx));

  const allowedTargets: number[][] = participants.map((p, giverIdx) => {
    const excludedIdx = p.excludeId ? idToIndex.get(p.excludeId) : undefined;
    const targets: number[] = [];
    for (let targetIdx = 0; targetIdx < n; targetIdx++) {
      if (targetIdx !== giverIdx && targetIdx !== excludedIdx) {
        targets.push(targetIdx);
      }
    }
    return targets;
  });

  if (allowedTargets.some((list) => list.length === 0)) {
    return {
      ok: false,
      error:
        'Las exclusiones elegidas dejan a un participante sin posibles receptores. Ajusta las restricciones.',
    };
  }

  // Ordenar por menor cantidad de opciones (MRV) para resolver restricciones rápidamente
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => allowedTargets[a].length - allowedTargets[b].length
  );

  const assignment = new Array<number>(n).fill(-1);
  const used = new Array<boolean>(n).fill(false);
  let steps = 0;
  const maxSteps = 50000;

  function backtrack(pos: number): boolean {
    if (steps++ > maxSteps) return false;
    if (pos === n) return true;

    const giver = order[pos];
    const candidates = allowedTargets[giver].filter((t) => !used[t]);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (const target of candidates) {
      used[target] = true;
      assignment[giver] = target;
      if (backtrack(pos + 1)) return true;
      used[target] = false;
      assignment[giver] = -1;
    }
    return false;
  }

  const solved = backtrack(0);
  if (!solved) {
    return {
      ok: false,
      error:
        'No es posible completar un sorteo sin repeticiones con las exclusiones seleccionadas. Quita o cambia alguna exclusión.',
    };
  }

  const assigned = participants.map((p, i) => ({
    nombre: p.name.trim().replace(/\s+/g, ' '),
    mensaje: p.message.trim(),
    gustos: p.likes.trim(),
    asignado: participants[assignment[i]].name.trim().replace(/\s+/g, ' '),
  }));

  return { ok: true, assigned };
}

export function findParticipantMatch(
  payload: ExchangePayload,
  query: string
): EncodedParticipant | null {
  const norm = normalizeName(query);
  if (!norm) return null;

  const exactMatch = payload.participantes.find(
    (p) => normalizeName(p.nombre) === norm
  );
  if (exactMatch) return exactMatch;

  const loose = normalizeNameLoose(query);
  return (
    payload.participantes.find((p) => normalizeNameLoose(p.nombre) === loose) ?? null
  );
}

export function buildInvitationMessage(payload: ExchangePayload, shareUrl: string): string {
  const titleLine = payload.titulo
    ? `Te invito al intercambio "${payload.titulo}".`
    : 'Te invito a nuestro intercambio de Amigo Secreto.';
  const priceText = formatPrice(payload.precioMinimo, payload.moneda);
  const dateText = formatExchangeDate(payload.fechaIntercambio);
  const details = dateText
    ? `Presupuesto mínimo: ${priceText} · Fecha: ${dateText}`
    : `Presupuesto mínimo: ${priceText}`;

  return `${titleLine}\n${details}\n\nEntra al enlace y escribe tu nombre para descubrir en privado a quién te toca regalar:\n${shareUrl}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
