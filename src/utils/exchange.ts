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

type CompactParticipantTuple =
  | [string, number]
  | [string, number, string]
  | [string, number, string, string];

type CompactPayloadTuple = [
  number,
  number | string,
  CompactParticipantTuple[],
  string?,
  string?,
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

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function compressDeflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const stream = new CompressionStream('deflate-raw');
    const writer = stream.writable.getWriter();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    await writer.write(copy);
    await writer.close();
    const buffer = await new Response(stream.readable).arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

async function decompressDeflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Tu navegador no soporta la descompresión de este enlace.');
  }
  const stream = new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  await writer.write(copy);
  await writer.close();
  const buffer = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buffer);
}

function toCompactTuple(payload: ExchangePayload): CompactPayloadTuple | null {
  const nameToIndex = new Map<string, number>();
  payload.participantes.forEach((p, idx) => {
    nameToIndex.set(normalizeName(p.nombre), idx);
  });

  const participantTuples: CompactParticipantTuple[] = [];
  for (const p of payload.participantes) {
    const targetIdx = nameToIndex.get(normalizeName(p.asignado));
    if (targetIdx === undefined) {
      return null;
    }
    const nombre = p.nombre.trim();
    const gustos = p.gustos.trim();
    const mensaje = p.mensaje.trim();

    if (mensaje) {
      participantTuples.push([nombre, targetIdx, gustos, mensaje]);
    } else if (gustos) {
      participantTuples.push([nombre, targetIdx, gustos]);
    } else {
      participantTuples.push([nombre, targetIdx]);
    }
  }

  const currencyIdx = CURRENCY_OPTIONS.findIndex((c) => c.value === payload.moneda);
  const compactCurrency: number | string = currencyIdx >= 0 ? currencyIdx : payload.moneda;
  const compactDate = payload.fechaIntercambio
    ? payload.fechaIntercambio.replace(/-/g, '')
    : '';
  const compactTitle = payload.titulo ? payload.titulo.trim() : '';

  const tuple: CompactPayloadTuple = [
    payload.precioMinimo,
    compactCurrency,
    participantTuples,
  ];

  if (compactTitle) {
    tuple.push(compactDate, compactTitle);
  } else if (compactDate) {
    tuple.push(compactDate);
  }

  return tuple;
}

function fromCompactTuple(parsed: unknown): ExchangePayload | null {
  if (!Array.isArray(parsed) || parsed.length < 3) return null;

  const [rawPrice, rawCurrency, rawParticipants, rawDate, rawTitle] = parsed;

  if (typeof rawPrice !== 'number' || !Number.isFinite(rawPrice) || rawPrice < 0) {
    return null;
  }

  let moneda: CurrencyCode = '$';
  if (typeof rawCurrency === 'number' && CURRENCY_OPTIONS[rawCurrency]) {
    moneda = CURRENCY_OPTIONS[rawCurrency].value;
  } else if (
    typeof rawCurrency === 'string' &&
    CURRENCY_OPTIONS.some((c) => c.value === rawCurrency)
  ) {
    moneda = rawCurrency as CurrencyCode;
  }

  if (!Array.isArray(rawParticipants) || rawParticipants.length < 3) {
    return null;
  }

  const names = rawParticipants.map((item) =>
    Array.isArray(item) && typeof item[0] === 'string' ? item[0].trim() : ''
  );

  if (names.some((n) => !n)) return null;

  const participantes: EncodedParticipant[] = [];
  for (let i = 0; i < rawParticipants.length; i++) {
    const item = rawParticipants[i];
    if (!Array.isArray(item) || typeof item[1] !== 'number') return null;
    const targetIdx = item[1];
    if (
      !Number.isInteger(targetIdx) ||
      targetIdx < 0 ||
      targetIdx >= names.length
    ) {
      return null;
    }

    const gustos = typeof item[2] === 'string' ? item[2].trim() : '';
    const mensaje = typeof item[3] === 'string' ? item[3].trim() : '';

    participantes.push({
      nombre: names[i],
      gustos,
      mensaje,
      asignado: names[targetIdx],
    });
  }

  let fechaIntercambio: string | undefined;
  if (typeof rawDate === 'string' && rawDate.trim()) {
    const d = rawDate.trim();
    const normalizedIso = /^\d{8}$/.test(d)
      ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
      : d;
    if (formatExchangeDate(normalizedIso) !== null) {
      fechaIntercambio = normalizedIso;
    }
  }

  const titulo =
    typeof rawTitle === 'string' && rawTitle.trim().length > 0
      ? rawTitle.trim()
      : undefined;

  return {
    ...(titulo ? { titulo } : {}),
    precioMinimo: rawPrice,
    moneda,
    ...(fechaIntercambio ? { fechaIntercambio } : {}),
    participantes,
  };
}

function validateLegacyPayload(parsed: Partial<ExchangePayload>): ExchangePayload | null {
  if (
    !parsed ||
    typeof parsed.precioMinimo !== 'number' ||
    !Number.isFinite(parsed.precioMinimo) ||
    parsed.precioMinimo < 0 ||
    !Array.isArray(parsed.participantes) ||
    parsed.participantes.length < 3
  ) {
    return null;
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

  if (participantes.some((p) => !p.nombre || !p.asignado)) {
    return null;
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
    ...(validTitle ? { titulo: validTitle } : {}),
    precioMinimo: parsed.precioMinimo,
    moneda: validCurrency,
    ...(validDate ? { fechaIntercambio: validDate } : {}),
    participantes,
  };
}

function cleanRawHash(hash: string): string {
  let clean = (hash.startsWith('#') ? hash.slice(1) : hash).replace(/\s+/g, '');
  if (clean.includes('%')) {
    try {
      clean = decodeURIComponent(clean);
    } catch {
      // Keep original if percent-decoding fails
    }
  }
  return clean;
}

/**
 * Codifica el sorteo de la forma más corta posible (tupla compacta + compresión deflate-raw
 * cuando reduce el tamaño) en Base64 URL-safe con soporte completo UTF-8.
 */
export async function encodePayloadToHash(payload: ExchangePayload): Promise<string> {
  const compactTuple = toCompactTuple(payload);
  const rawJson = JSON.stringify(compactTuple ?? payload);
  const rawBytes = new TextEncoder().encode(rawJson);
  const rawPrefix = compactTuple ? 'c' : '';
  const rawEncoded = rawPrefix + bytesToBase64Url(rawBytes);

  if (compactTuple) {
    const compressedBytes = await compressDeflateRaw(rawBytes);
    if (compressedBytes && compressedBytes.length < rawBytes.length) {
      const compressedEncoded = 'z' + bytesToBase64Url(compressedBytes);
      if (compressedEncoded.length < rawEncoded.length) {
        return compressedEncoded;
      }
    }
  }

  return rawEncoded;
}

export function isCompressedHash(hash: string): boolean {
  const clean = cleanRawHash(hash);
  return clean.startsWith('z');
}

/**
 * Decodificación síncrona rápida para enlaces sin compresión ('c...') o legado JSON.
 */
export function decodePayloadFromHashSync(hash: string): {
  data: ExchangePayload | null;
  error: string | null;
  needsAsync: boolean;
} {
  const clean = cleanRawHash(hash);
  if (!clean) {
    return { data: null, error: null, needsAsync: false };
  }

  if (clean.startsWith('z')) {
    return { data: null, error: null, needsAsync: true };
  }

  try {
    const isCompact = clean.startsWith('c');
    const encodedPart = isCompact ? clean.slice(1) : clean;
    const bytes = base64UrlToBytes(encodedPart);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);

    const validated = isCompact
      ? fromCompactTuple(parsed)
      : validateLegacyPayload(parsed as Partial<ExchangePayload>);

    if (!validated) {
      return {
        data: null,
        error: 'El enlace del sorteo está incompleto o no contiene participantes válidos.',
        needsAsync: false,
      };
    }

    return { data: validated, error: null, needsAsync: false };
  } catch {
    return {
      data: null,
      error: 'No pudimos leer este enlace de sorteo. Es posible que esté incompleto.',
      needsAsync: false,
    };
  }
}

/**
 * Decodifica enlaces en cualquier formato ('z...' comprimido, 'c...' compacto o legado JSON).
 */
export async function decodePayloadFromHash(hash: string): Promise<{
  data: ExchangePayload | null;
  error: string | null;
}> {
  const clean = cleanRawHash(hash);
  if (!clean) {
    return { data: null, error: null };
  }

  if (!clean.startsWith('z')) {
    const syncRes = decodePayloadFromHashSync(hash);
    return { data: syncRes.data, error: syncRes.error };
  }

  try {
    const compressedBytes = base64UrlToBytes(clean.slice(1));
    const decompressedBytes = await decompressDeflateRaw(compressedBytes);
    const json = new TextDecoder().decode(decompressedBytes);
    const parsed = JSON.parse(json);
    const validated = fromCompactTuple(parsed);

    if (!validated) {
      return {
        data: null,
        error: 'Los datos de este sorteo están dañados o incompletos.',
      };
    }

    return { data: validated, error: null };
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
