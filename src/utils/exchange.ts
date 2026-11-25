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
  const clean = hash.startsWith('#') ? hash.slice(1).trim() : hash.trim();
  if (!clean) {
    return { data: null, error: null };
  }

  try {
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
      !Array.isArray(parsed.participantes) ||
      parsed.participantes.length < 3
    ) {
      return {
        data: null,
        error: 'El enlace del sorteo está incompleto o no contiene participantes válidos.',
      };
    }

    const participantes: EncodedParticipant[] = parsed.participantes.map((p) => ({
      nombre: typeof p.nombre === 'string' ? p.nombre.trim() : '',
      mensaje: typeof p.mensaje === 'string' ? p.mensaje.trim() : '',
      gustos: typeof p.gustos === 'string' ? p.gustos.trim() : '',
      asignado: typeof p.asignado === 'string' ? p.asignado.trim() : '',
    }));

    const hasInvalid = participantes.some((p) => !p.nombre || !p.asignado);
    if (hasInvalid) {
      return {
        data: null,
        error: 'Los datos de este sorteo están dañados o les faltan asignaciones.',
      };
    }

    return {
      data: {
        precioMinimo: parsed.precioMinimo,
        moneda: (parsed.moneda as CurrencyCode) || '$',
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
  if (minPriceInput.trim() === '' || Number.isNaN(parsedPrice) || parsedPrice < 0) {
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
 * Realiza el sorteo garantizando que nadie se toque a sí mismo
 * y que cada participante reciba exactamente a un receptor único.
 */
export function drawAssignments(participants: ParticipantInput[]): EncodedParticipant[] {
  const n = participants.length;
  if (n < 3) {
    throw new Error('Se necesitan al menos 3 participantes.');
  }

  const indices = Array.from({ length: n }, (_, i) => i);
  let valid = false;
  let attempts = 0;

  while (!valid && attempts < 1000) {
    attempts++;
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    valid = indices.every((targetIdx, giverIdx) => targetIdx !== giverIdx);
  }

  if (!valid) {
    const offset = 1 + Math.floor(Math.random() * (n - 1));
    for (let i = 0; i < n; i++) {
      indices[i] = (i + offset) % n;
    }
  }

  return participants.map((p, i) => ({
    nombre: p.name.trim().replace(/\s+/g, ' '),
    mensaje: p.message.trim(),
    gustos: p.likes.trim(),
    asignado: participants[indices[i]].name.trim().replace(/\s+/g, ' '),
  }));
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
