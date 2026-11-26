import type { Timestamp } from 'firebase/firestore';

export type CurrencyCode = '$' | '€' | 'MXN' | 'USD' | 'ARS' | 'COP' | 'CLP' | 'PEN';

export interface ParticipantInput {
  id: string;
  name: string;
  message: string;
  likes: string;
  excludeId?: string;
}

export interface EncodedParticipant {
  nombre: string;
  mensaje: string;
  gustos: string;
  asignado: string;
}

export interface ExchangePayload {
  titulo?: string;
  precioMinimo: number;
  moneda: CurrencyCode;
  fechaIntercambio?: string;
  participantes: EncodedParticipant[];
}

export type AppView = 'setup' | 'confirm' | 'participant' | 'rooms';

export type RoomStatus = 'open' | 'drawn';

export interface RoomDoc {
  code: string;
  title: string;
  minPrice: number;
  currency: CurrencyCode;
  exchangeDate: string;
  organizerUid: string;
  organizerName: string;
  status: RoomStatus;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface RoomParticipantDoc {
  uid: string;
  organizerUid: string;
  name: string;
  likes: string;
  restrictions: string;
  message: string;
  joinedAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface RoomAssignmentDoc {
  giverUid: string;
  giverName: string;
  organizerUid: string;
  recipientUid: string;
  recipientName: string;
  recipientLikes: string;
  recipientRestrictions: string;
  recipientMessage: string;
  createdAt?: Timestamp | null;
}
