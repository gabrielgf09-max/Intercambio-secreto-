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

export type AppView = 'setup' | 'confirm' | 'participant';
