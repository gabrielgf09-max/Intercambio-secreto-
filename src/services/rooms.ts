import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../firebase';
import {
  CurrencyCode,
  RoomAssignmentDoc,
  RoomDoc,
  RoomParticipantDoc,
} from '../types';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeRoomCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 20);
}

function generateRoomCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function clampString(val: string, maxLength: number): string {
  return val.trim().slice(0, maxLength);
}

function resolveOrganizerName(user: User): string {
  const raw =
    user.displayName?.trim() ||
    user.email?.split('@')[0]?.trim() ||
    'Organizador';
  return clampString(raw, 80) || 'Organizador';
}

export function buildRoomInviteUrl(roomCode: string): string {
  if (typeof window === 'undefined') return `#sala=${roomCode}`;
  const base = window.location.href.split('#')[0].split('?')[0];
  return `${base}#sala=${roomCode}`;
}

export async function createRoom(
  user: User,
  input: {
    title: string;
    minPrice: number;
    currency: CurrencyCode;
    exchangeDate: string;
  }
): Promise<string> {
  const safeTitle = clampString(input.title, 80);
  if (!safeTitle) {
    throw new Error('Ingresa un nombre para el evento o sala.');
  }

  const safePrice =
    Number.isFinite(input.minPrice) && input.minPrice >= 0 ? input.minPrice : 0;
  const safeCurrency = clampString(input.currency, 8) || '$';
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(input.exchangeDate.trim())
    ? input.exchangeDate.trim()
    : '';
  const organizerName = resolveOrganizerName(user);

  let code = generateRoomCode(6);
  for (let attempt = 0; attempt < 5; attempt++) {
    const ref = doc(db, 'rooms', code);
    try {
      const existing = await getDoc(ref);
      if (!existing.exists()) {
        break;
      }
      code = generateRoomCode(6);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `rooms/${code}`);
    }
  }

  const roomPath = `rooms/${code}`;
  try {
    await setDoc(doc(db, 'rooms', code), {
      code,
      title: safeTitle,
      minPrice: safePrice,
      currency: safeCurrency,
      exchangeDate: safeDate,
      organizerUid: user.uid,
      organizerName,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return code;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, roomPath);
  }
}

export async function updateRoomSettings(
  roomCode: string,
  user: User,
  input: {
    title: string;
    minPrice: number;
    currency: CurrencyCode;
    exchangeDate: string;
  }
): Promise<void> {
  const code = normalizeRoomCode(roomCode);
  const safeTitle = clampString(input.title, 80);
  if (!safeTitle) {
    throw new Error('El nombre de la sala no puede estar vacío.');
  }
  const safePrice =
    Number.isFinite(input.minPrice) && input.minPrice >= 0 ? input.minPrice : 0;
  const safeCurrency = clampString(input.currency, 8) || '$';
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(input.exchangeDate.trim())
    ? input.exchangeDate.trim()
    : '';
  const organizerName = resolveOrganizerName(user);

  const path = `rooms/${code}`;
  try {
    await updateDoc(doc(db, 'rooms', code), {
      title: safeTitle,
      minPrice: safePrice,
      currency: safeCurrency,
      exchangeDate: safeDate,
      organizerName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToMyRooms(
  organizerUid: string,
  onUpdate: (rooms: RoomDoc[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'rooms';
  const q = query(collection(db, path), where('organizerUid', '==', organizerUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: RoomDoc[] = snapshot.docs.map((d) => d.data() as RoomDoc);
      list.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToRoom(
  roomCode: string,
  onUpdate: (room: RoomDoc | null) => void,
  onError: (err: Error) => void
): () => void {
  const code = normalizeRoomCode(roomCode);
  const path = `rooms/${code}`;
  return onSnapshot(
    doc(db, 'rooms', code),
    (snap) => {
      onUpdate(snap.exists() ? (snap.data() as RoomDoc) : null);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToRoomParticipants(
  roomCode: string,
  organizerUid: string,
  onUpdate: (participants: RoomParticipantDoc[]) => void,
  onError: (err: Error) => void
): () => void {
  const code = normalizeRoomCode(roomCode);
  const path = `rooms/${code}/participants`;
  const q = query(
    collection(db, 'rooms', code, 'participants'),
    where('organizerUid', '==', organizerUid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as RoomParticipantDoc);
      list.sort((a, b) => {
        const aTime = a.joinedAt?.toMillis?.() ?? 0;
        const bTime = b.joinedAt?.toMillis?.() ?? 0;
        return aTime - bTime;
      });
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToMyParticipantProfile(
  roomCode: string,
  userUid: string,
  onUpdate: (profile: RoomParticipantDoc | null) => void,
  onError: (err: Error) => void
): () => void {
  const code = normalizeRoomCode(roomCode);
  const path = `rooms/${code}/participants/${userUid}`;
  return onSnapshot(
    doc(db, 'rooms', code, 'participants', userUid),
    (snap) => {
      onUpdate(snap.exists() ? (snap.data() as RoomParticipantDoc) : null);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function saveMyParticipantProfile(
  roomCode: string,
  organizerUid: string,
  user: User,
  input: {
    name: string;
    likes: string;
    restrictions: string;
    message: string;
  },
  isExisting: boolean
): Promise<void> {
  const code = normalizeRoomCode(roomCode);
  const safeName = clampString(input.name, 80);
  if (!safeName) {
    throw new Error('Escribe tu nombre para completar tu registro.');
  }
  const safeLikes = clampString(input.likes, 600);
  const safeRestrictions = clampString(input.restrictions, 400);
  const safeMessage = clampString(input.message, 600);

  const path = `rooms/${code}/participants/${user.uid}`;
  const ref = doc(db, 'rooms', code, 'participants', user.uid);

  try {
    if (isExisting) {
      await updateDoc(ref, {
        name: safeName,
        likes: safeLikes,
        restrictions: safeRestrictions,
        message: safeMessage,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid: user.uid,
        organizerUid,
        name: safeName,
        likes: safeLikes,
        restrictions: safeRestrictions,
        message: safeMessage,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isExisting ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function removeParticipantFromRoom(
  roomCode: string,
  participantUid: string
): Promise<void> {
  const code = normalizeRoomCode(roomCode);
  const path = `rooms/${code}/participants/${participantUid}`;
  try {
    await deleteDoc(doc(db, 'rooms', code, 'participants', participantUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function closeAndDeleteRoom(
  roomCode: string,
  organizerUid: string
): Promise<void> {
  const code = normalizeRoomCode(roomCode);
  const roomRef = doc(db, 'rooms', code);
  const roomPath = `rooms/${code}`;

  let roomStatus: 'open' | 'drawn' = 'open';
  try {
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
      return;
    }
    const data = roomSnap.data() as RoomDoc;
    if (data.organizerUid !== organizerUid) {
      throw new Error('Solo el organizador puede cerrar y eliminar esta sala.');
    }
    roomStatus = data.status;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Solo el organizador')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, roomPath);
  }

  let participantIds: string[] = [];
  const participantsPath = `rooms/${code}/participants`;
  try {
    const participantsSnap = await getDocs(
      query(
        collection(db, 'rooms', code, 'participants'),
        where('organizerUid', '==', organizerUid)
      )
    );
    participantIds = participantsSnap.docs.map((d) => d.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, participantsPath);
  }

  const batch = writeBatch(db);
  for (const participantId of participantIds) {
    batch.delete(doc(db, 'rooms', code, 'participants', participantId));
    if (roomStatus === 'drawn') {
      batch.delete(doc(db, 'rooms', code, 'assignments', participantId));
    }
  }
  batch.delete(roomRef);

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, roomPath);
  }
}

export async function executeRoomDraw(
  roomCode: string,
  organizerUid: string,
  participants: RoomParticipantDoc[]
): Promise<void> {
  const n = participants.length;
  if (n < 3) {
    throw new Error(
      'Se necesitan al menos 3 participantes inscritos para ejecutar el sorteo.'
    );
  }

  const code = normalizeRoomCode(roomCode);
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

  const batch = writeBatch(db);

  for (let i = 0; i < n; i++) {
    const giver = participants[i];
    const recipient = participants[indices[i]];
    const assignRef = doc(db, 'rooms', code, 'assignments', giver.uid);

    batch.set(assignRef, {
      giverUid: giver.uid,
      giverName: clampString(giver.name, 80),
      organizerUid,
      recipientUid: recipient.uid,
      recipientName: clampString(recipient.name, 80),
      recipientLikes: clampString(recipient.likes, 600),
      recipientRestrictions: clampString(recipient.restrictions, 400),
      recipientMessage: clampString(recipient.message, 600),
      createdAt: serverTimestamp(),
    });
  }

  batch.update(doc(db, 'rooms', code), {
    status: 'drawn',
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `rooms/${code}/assignments`);
  }
}

export function subscribeToMyAssignment(
  roomCode: string,
  userUid: string,
  onUpdate: (assignment: RoomAssignmentDoc | null) => void,
  onError: (err: Error) => void
): () => void {
  const code = normalizeRoomCode(roomCode);
  const path = `rooms/${code}/assignments/${userUid}`;
  return onSnapshot(
    doc(db, 'rooms', code, 'assignments', userUid),
    (snap) => {
      onUpdate(snap.exists() ? (snap.data() as RoomAssignmentDoc) : null);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}
