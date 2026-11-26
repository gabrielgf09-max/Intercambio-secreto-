import React, { useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  Gift,
  Heart,
  LogIn,
  LogOut,
  MessageSquare,
  Plus,
  ShieldAlert,
  Shuffle,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import {
  CurrencyCode,
  RoomAssignmentDoc,
  RoomDoc,
  RoomParticipantDoc,
} from '../types';
import {
  CURRENCY_OPTIONS,
  copyTextToClipboard,
  formatExchangeDate,
  formatPrice,
} from '../utils/exchange';
import {
  buildRoomInviteUrl,
  createRoom,
  executeRoomDraw,
  normalizeRoomCode,
  removeParticipantFromRoom,
  saveMyParticipantProfile,
  subscribeToMyAssignment,
  subscribeToMyParticipantProfile,
  subscribeToMyRooms,
  subscribeToRoom,
  subscribeToRoomParticipants,
} from '../services/rooms';

interface RoomWorkspaceProps {
  initialRoomCode: string | null;
  onRoomCodeChange: (code: string | null) => void;
}

export const RoomWorkspace: React.FC<RoomWorkspaceProps> = ({
  initialRoomCode,
  onRoomCodeChange,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(
    initialRoomCode ? normalizeRoomCode(initialRoomCode) : null
  );

  // Lobby state
  const [myRooms, setMyRooms] = useState<RoomDoc[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newMinPrice, setNewMinPrice] = useState('300');
  const [newCurrency, setNewCurrency] = useState<CurrencyCode>('$');
  const [newDate, setNewDate] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Active room state
  const [room, setRoom] = useState<RoomDoc | null | undefined>(undefined);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<RoomParticipantDoc[]>([]);
  const [myProfile, setMyProfile] = useState<RoomParticipantDoc | null>(null);
  const [myAssignment, setMyAssignment] = useState<RoomAssignmentDoc | null>(null);

  // Self-registration form state
  const [regName, setRegName] = useState('');
  const [regLikes, setRegLikes] = useState('');
  const [regRestrictions, setRegRestrictions] = useState('');
  const [regMessage, setRegMessage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Draw & copy feedback
  const [drawing, setDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const normalized = initialRoomCode ? normalizeRoomCode(initialRoomCode) : null;
    setActiveRoomCode(normalized);
  }, [initialRoomCode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to rooms created by current user when in lobby
  useEffect(() => {
    if (!user || activeRoomCode) return;
    const unsubscribe = subscribeToMyRooms(
      user.uid,
      (list) => setMyRooms(list),
      (err) => setLobbyError(err.message)
    );
    return () => unsubscribe();
  }, [user, activeRoomCode]);

  // Subscribe to active room document
  useEffect(() => {
    if (!user || !activeRoomCode) {
      setRoom(undefined);
      setParticipants([]);
      setMyProfile(null);
      setMyAssignment(null);
      return;
    }

    setRoom(undefined);
    setRoomError(null);
    const unsubscribe = subscribeToRoom(
      activeRoomCode,
      (docData) => setRoom(docData),
      (err) => setRoomError(err.message)
    );
    return () => unsubscribe();
  }, [user, activeRoomCode]);

  // Subscribe to participant list (if organizer) and own profile
  useEffect(() => {
    if (!user || !activeRoomCode || !room) return;

    const unsubs: (() => void)[] = [];
    const isOrg = room.organizerUid === user.uid;

    if (isOrg) {
      unsubs.push(
        subscribeToRoomParticipants(
          activeRoomCode,
          room.organizerUid,
          (list) => setParticipants(list),
          (err) => setRoomError(err.message)
        )
      );
    }

    unsubs.push(
      subscribeToMyParticipantProfile(
        activeRoomCode,
        user.uid,
        (profile) => setMyProfile(profile),
        (err) => setRoomError(err.message)
      )
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [user, activeRoomCode, room]);

  // Subscribe to own assignment once room is drawn
  useEffect(() => {
    if (!user || !activeRoomCode || !room || room.status !== 'drawn') {
      setMyAssignment(null);
      return;
    }

    const unsubscribe = subscribeToMyAssignment(
      activeRoomCode,
      user.uid,
      (assignment) => setMyAssignment(assignment),
      (err) => setRoomError(err.message)
    );
    return () => unsubscribe();
  }, [user, activeRoomCode, room]);

  // Sync self-registration form fields when profile loads or user changes
  useEffect(() => {
    if (myProfile) {
      setRegName(myProfile.name);
      setRegLikes(myProfile.likes);
      setRegRestrictions(myProfile.restrictions);
      setRegMessage(myProfile.message);
    } else if (user) {
      setRegName(user.displayName?.trim() || '');
      setRegLikes('');
      setRegRestrictions('');
      setRegMessage('');
    }
  }, [myProfile, user, activeRoomCode]);

  const handleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setAuthError(
        'No se pudo completar el inicio de sesión con Google. Verifica que las ventanas emergentes estén permitidas e inténtalo de nuevo.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const selectRoom = (code: string | null) => {
    const normalized = code ? normalizeRoomCode(code) : null;
    setActiveRoomCode(normalized);
    setLobbyError(null);
    setDrawError(null);
    setProfileError(null);
    setProfileSavedNotice(false);
    onRoomCodeChange(normalized);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLobbyError(null);

    const parsedPrice = Number(newMinPrice);
    if (!newTitle.trim()) {
      setLobbyError('Escribe un nombre para identificar tu sala o evento.');
      return;
    }
    if (newMinPrice.trim() === '' || Number.isNaN(parsedPrice) || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setLobbyError('Ingresa un precio mínimo válido (0 o mayor).');
      return;
    }

    setCreatingRoom(true);
    try {
      const code = await createRoom(user, {
        title: newTitle,
        minPrice: parsedPrice,
        currency: newCurrency,
        exchangeDate: newDate,
      });
      setNewTitle('');
      setNewDate('');
      selectRoom(code);
    } catch (err) {
      setLobbyError(
        err instanceof Error ? err.message : 'No se pudo crear la sala.'
      );
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = normalizeRoomCode(joinCodeInput);
    if (cleaned.length < 4) {
      setLobbyError('Ingresa un código de sala válido (al menos 4 caracteres).');
      return;
    }
    setJoinCodeInput('');
    selectRoom(cleaned);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !room || !activeRoomCode) return;
    setProfileError(null);
    setProfileSavedNotice(false);

    if (!regName.trim()) {
      setProfileError('Escribe tu nombre para que tus compañeros te reconozcan.');
      return;
    }

    setSavingProfile(true);
    try {
      await saveMyParticipantProfile(
        activeRoomCode,
        room.organizerUid,
        user,
        {
          name: regName,
          likes: regLikes,
          restrictions: regRestrictions,
          message: regMessage,
        },
        Boolean(myProfile)
      );
      setProfileSavedNotice(true);
      setTimeout(() => setProfileSavedNotice(false), 3000);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'No se pudo guardar tu perfil.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLeaveOrRemove = async (participantUid: string) => {
    if (!activeRoomCode) return;
    setDrawError(null);
    setProfileError(null);
    await removeParticipantFromRoom(activeRoomCode, participantUid);
  };

  const handleExecuteDraw = async () => {
    if (!user || !room || !activeRoomCode) return;
    setDrawError(null);
    if (participants.length < 3) {
      setDrawError('Se necesitan al menos 3 participantes inscritos para realizar el sorteo.');
      return;
    }

    setDrawing(true);
    try {
      await executeRoomDraw(activeRoomCode, room.organizerUid, participants);
    } catch (err) {
      setDrawError(
        err instanceof Error ? err.message : 'No se pudo ejecutar el sorteo.'
      );
    } finally {
      setDrawing(false);
    }
  };

  const handleCopyInviteLink = async (code: string) => {
    const ok = await copyTextToClipboard(buildRoomInviteUrl(code));
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    }
  };

  const handleCopyCode = async (code: string) => {
    const ok = await copyTextToClipboard(code);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2400);
    }
  };

  if (!authReady) {
    return (
      <div className="max-w-lg mx-auto bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-3xl p-8 text-center">
        <p className="text-sm text-[#57524A] dark:text-[#B5ADA1]">
          Cargando acceso a salas…
        </p>
      </div>
    );
  }

  // Gate de inicio de sesión con Google
  if (!user) {
    return (
      <div className="max-w-xl mx-auto bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-3xl p-6 sm:p-10 transition-colors duration-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#1B4332]/10 dark:bg-[#74C69D]/14 text-[#1B4332] dark:text-[#84D2AA] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-[#1B4332] dark:text-[#84D2AA]">
              {activeRoomCode ? `Invitación a sala ${activeRoomCode}` : 'Salas con auto-registro'}
            </p>
            <p className="text-xs text-[#6E685F] dark:text-[#A39B8F]">
              Perfiles independientes y resultado privado
            </p>
          </div>
        </div>

        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1A1816] dark:text-[#F3EFE7] leading-tight [text-wrap:balance]">
          {activeRoomCode
            ? `Únete a la sala ${activeRoomCode} con tu cuenta`
            : 'Crea una sala o únete con un código'}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[#57524A] dark:text-[#B5ADA1] leading-relaxed">
          Cada participante inicia sesión para completar sus propios gustos, restricciones y mensaje personal, y para proteger que nadie más pueda ver a quién le tocó regalar.
        </p>

        {authError && (
          <div
            role="alert"
            className="mt-5 p-3.5 rounded-xl bg-[#9B2226]/6 dark:bg-[#9B2226]/18 border border-[#9B2226]/25 dark:border-[#E57373]/35 text-[#7F1D1D] dark:text-[#F7B2B2] text-xs sm:text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{authError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={signingIn}
          className="mt-6 w-full min-h-[48px] px-5 py-3 bg-[#1B4332] hover:bg-[#143326] dark:bg-[#2D6A4F] dark:hover:bg-[#38805F] disabled:opacity-60 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer"
        >
          <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{signingIn ? 'Conectando…' : 'Continuar con Google'}</span>
        </button>

        {activeRoomCode && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => selectRoom(null)}
              className="text-xs font-medium text-[#6E685F] dark:text-[#A39B8F] hover:text-[#1B4332] dark:hover:text-[#84D2AA] underline underline-offset-4 transition-colors cursor-pointer py-2 px-3"
            >
              Volver al inicio de salas
            </button>
          </div>
        )}
      </div>
    );
  }

  // Lobby: crear sala o entrar con código
  if (!activeRoomCode) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E4DFD5] dark:border-[#2A2621]">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-[#1B4332] dark:text-[#84D2AA]">
              Salas con auto-registro
            </p>
            <p className="mt-1 text-sm text-[#57524A] dark:text-[#B5ADA1]">
              Conectado como{' '}
              <strong className="font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
                {user.displayName || user.email}
              </strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="min-h-[40px] px-3.5 py-2 bg-white dark:bg-[#1C1A17] hover:bg-[#F2EFE9] dark:hover:bg-[#25221E] border border-[#D8D1C5] dark:border-[#343029] text-xs font-medium text-[#57524A] dark:text-[#B5ADA1] hover:text-[#1A1816] dark:hover:text-[#F3EFE7] rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>

        {lobbyError && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-[#9B2226]/6 dark:bg-[#9B2226]/18 border border-[#9B2226]/25 dark:border-[#E57373]/35 text-[#7F1D1D] dark:text-[#F7B2B2] text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{lobbyError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Crear nueva sala */}
          <form
            onSubmit={handleCreateRoom}
            noValidate
            className="lg:col-span-7 bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-2xl p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-[#EFECE6] dark:border-[#2A2621]">
              <div className="w-10 h-10 rounded-xl bg-[#1B4332]/10 dark:bg-[#74C69D]/14 text-[#1B4332] dark:text-[#84D2AA] flex items-center justify-center shrink-0">
                <Plus className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
                  Crear un evento o sala nueva
                </h2>
                <p className="text-xs text-[#6E685F] dark:text-[#A39B8F]">
                  Obtendrás un código y enlace para que cada persona se inscriba sola
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="room-title"
                className="block text-sm font-medium text-[#1A1816] dark:text-[#F3EFE7] mb-1.5"
              >
                Nombre del intercambio <span className="text-[#9B2226] dark:text-[#F28B82]">*</span>
              </label>
              <input
                id="room-title"
                type="text"
                maxLength={80}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej. Intercambio Navidad Familia 2026"
                className="w-full min-h-[46px] px-3.5 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-sm text-[#1A1816] dark:text-[#F3EFE7] placeholder:text-[#9A9388] dark:placeholder:text-[#6E675D] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 dark:focus:ring-[#74C69D]/30 focus:border-[#1B4332] dark:focus:border-[#74C69D]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="room-min-price"
                  className="block text-sm font-medium text-[#1A1816] dark:text-[#F3EFE7] mb-1.5"
                >
                  Precio mínimo
                </label>
                <div className="flex items-stretch gap-2">
                  <input
                    id="room-min-price"
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={newMinPrice}
                    onChange={(e) => setNewMinPrice(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-sm text-[#1A1816] dark:text-[#F3EFE7] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 dark:focus:ring-[#74C69D]/30"
                  />
                  <select
                    aria-label="Moneda de la sala"
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value as CurrencyCode)}
                    className="min-h-[46px] px-2.5 py-2 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-sm font-medium text-[#1A1816] dark:text-[#F3EFE7] cursor-pointer"
                  >
                    {CURRENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="room-date"
                  className="block text-sm font-medium text-[#1A1816] dark:text-[#F3EFE7] mb-1.5"
                >
                  Fecha del intercambio (opcional)
                </label>
                <div className="relative">
                  <Calendar
                    className="w-4 h-4 text-[#857E74] dark:text-[#968E83] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="room-date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full min-h-[46px] pl-10 pr-3 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-sm text-[#1A1816] dark:text-[#F3EFE7] [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingRoom}
              className="w-full min-h-[48px] px-5 py-3 bg-[#1B4332] hover:bg-[#143326] dark:bg-[#2D6A4F] dark:hover:bg-[#38805F] disabled:opacity-60 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{creatingRoom ? 'Creando sala…' : 'Crear sala y obtener enlace'}</span>
            </button>
          </form>

          {/* Unirse con código + mis salas */}
          <div className="lg:col-span-5 space-y-6">
            <form
              onSubmit={handleJoinByCode}
              className="bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-2xl p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
                ¿Tienes un código de invitación?
              </h2>
              <p className="text-xs text-[#57524A] dark:text-[#B5ADA1] leading-relaxed">
                Escríbelo para entrar directamente y completar tu perfil en la sala.
              </p>
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="Ej. K7M9P2"
                  maxLength={20}
                  className="flex-1 min-h-[46px] px-3.5 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl font-mono text-sm uppercase tracking-wider text-[#1A1816] dark:text-[#F3EFE7] placeholder:text-[#9A9388] dark:placeholder:text-[#6E675D] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 dark:focus:ring-[#74C69D]/30"
                />
                <button
                  type="submit"
                  className="min-h-[46px] px-4 py-2.5 bg-[#1A1816] hover:bg-[#2F2B28] dark:bg-[#F3EFE7] dark:hover:bg-[#E4DFD5] text-white dark:text-[#1A1816] text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  Entrar
                </button>
              </div>
            </form>

            <div className="bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-2xl p-6">
              <h3 className="font-display text-lg font-semibold text-[#1A1816] dark:text-[#F3EFE7] mb-3">
                Salas que administras
              </h3>
              {myRooms.length === 0 ? (
                <p className="text-sm text-[#6E685F] dark:text-[#A39B8F]">
                  Aún no has creado ninguna sala con esta cuenta.
                </p>
              ) : (
                <div className="divide-y divide-[#EFECE6] dark:divide-[#2A2621]">
                  {myRooms.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => selectRoom(item.code)}
                      className="w-full py-3 text-left flex items-center justify-between gap-3 hover:bg-[#FAF8F4] dark:hover:bg-[#23201C] px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1A1816] dark:text-[#F3EFE7] truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-[#6E685F] dark:text-[#A39B8F] font-mono">
                          {item.code} · {item.status === 'open' ? 'Abierta' : 'Sorteada'}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-[#1B4332] dark:text-[#84D2AA] shrink-0">
                        Abrir
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cargando sala activa
  if (room === undefined) {
    return (
      <div className="max-w-lg mx-auto bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-3xl p-8 text-center">
        <p className="text-sm text-[#57524A] dark:text-[#B5ADA1]">
          Conectando con la sala {activeRoomCode}…
        </p>
      </div>
    );
  }

  // Sala no encontrada
  if (room === null) {
    return (
      <div className="max-w-lg mx-auto bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-3xl p-6 sm:p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#9B2226]/10 dark:bg-[#9B2226]/20 text-[#9B2226] dark:text-[#F28B82] flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
          Sala no encontrada
        </h2>
        <p className="mt-2 text-sm text-[#57524A] dark:text-[#B5ADA1]">
          No existe ninguna sala con el código <strong className="font-mono">{activeRoomCode}</strong>. Revisa el código con quien te invitó.
        </p>
        <button
          type="button"
          onClick={() => selectRoom(null)}
          className="mt-6 min-h-[44px] px-5 py-2.5 bg-[#1B4332] hover:bg-[#143326] dark:bg-[#2D6A4F] dark:hover:bg-[#38805F] text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Volver al inicio de salas</span>
        </button>
      </div>
    );
  }

  const isOrganizer = room.organizerUid === user.uid;
  const formattedDate = formatExchangeDate(room.exchangeDate);
  const formattedPrice = formatPrice(room.minPrice, room.currency);
  const inviteUrl = buildRoomInviteUrl(room.code);

  return (
    <div className="space-y-8">
      {/* Cabecera de la sala */}
      <div className="bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-widest uppercase text-[#1B4332] dark:text-[#84D2AA]">
              <span>Sala {room.code}</span>
              <span aria-hidden="true">·</span>
              <span>
                {room.status === 'open' ? 'Inscripciones abiertas' : 'Sorteo completado'}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
              {room.title}
            </h1>
            <p className="text-sm text-[#57524A] dark:text-[#B5ADA1]">
              Organiza {room.organizerName} · Mínimo{' '}
              <strong className="font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
                {formattedPrice}
              </strong>
              {formattedDate ? ` · ${formattedDate}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={() => selectRoom(null)}
            className="min-h-[40px] px-3.5 py-2 bg-[#FAF8F4] dark:bg-[#141311] hover:bg-[#EFECE6] dark:hover:bg-[#23201C] border border-[#DDD6CA] dark:border-[#343029] text-xs font-medium text-[#1A1816] dark:text-[#F3EFE7] rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Mis salas</span>
          </button>
        </div>

        {/* Barra de invitación */}
        <div className="mt-5 pt-5 border-t border-[#EFECE6] dark:border-[#2A2621] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            readOnly
            aria-label="Enlace de invitación de la sala"
            value={inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
            className="flex-1 min-h-[44px] px-3.5 py-2 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl font-mono text-xs text-[#3F3B35] dark:text-[#E2DBD0]"
          />
          <button
            type="button"
            onClick={() => handleCopyInviteLink(room.code)}
            className="min-h-[44px] px-4 py-2 bg-[#1B4332] hover:bg-[#143326] dark:bg-[#2D6A4F] dark:hover:bg-[#38805F] text-white text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Enlace copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                <span>Copiar enlace</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleCopyCode(room.code)}
            className="min-h-[44px] px-4 py-2 bg-white dark:bg-[#1C1A17] hover:bg-[#F2EFE9] dark:hover:bg-[#25221E] border border-[#D8D1C5] dark:border-[#343029] text-[#1A1816] dark:text-[#F3EFE7] text-xs sm:text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap font-mono"
          >
            {copiedCode ? (
              <>
                <Check className="w-4 h-4 text-[#1B4332] dark:text-[#84D2AA]" aria-hidden="true" />
                <span>Código copiado</span>
              </>
            ) : (
              <span>Código: {room.code}</span>
            )}
          </button>
        </div>
      </div>

      {roomError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[#9B2226]/6 dark:bg-[#9B2226]/18 border border-[#9B2226]/25 dark:border-[#E57373]/35 text-[#7F1D1D] dark:text-[#F7B2B2] text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{roomError}</span>
        </div>
      )}

      {/* Vista del organizador vs Vista del participante */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {isOrganizer && (
          <section className="lg:col-span-6 bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#EFECE6] dark:border-[#2A2621]">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
                  Participantes inscritos
                </h2>
                <p className="text-xs text-[#6E685F] dark:text-[#A39B8F] tabular-nums">
                  {participants.length} {participants.length === 1 ? 'persona registrada' : 'personas registradas'} en vivo
                </p>
              </div>
              <Users className="w-5 h-5 text-[#1B4332] dark:text-[#84D2AA]" aria-hidden="true" />
            </div>

            {participants.length === 0 ? (
              <div className="py-6 text-center text-sm text-[#6E685F] dark:text-[#A39B8F] space-y-1">
                <p>Todavía nadie se ha inscrito en esta sala.</p>
                <p className="text-xs">
                  Comparte el enlace o código de arriba para que cada integrante cree su propio perfil.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#EFECE6] dark:divide-[#2A2621]">
                {participants.map((p, idx) => (
                  <div
                    key={p.uid}
                    className="py-3.5 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
                        <span className="font-mono text-xs text-[#6E685F] dark:text-[#A39B8F] mr-2 tabular-nums">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        {p.name}
                        {p.uid === user.uid ? ' (Tú)' : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-[#6E685F] dark:text-[#A39B8F] truncate">
                        {[
                          p.likes ? 'Gustos cargados' : null,
                          p.restrictions ? 'Con restricciones' : null,
                          p.message ? 'Con mensaje' : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Perfil básico completado'}
                      </p>
                    </div>

                    {room.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => handleLeaveOrRemove(p.uid)}
                        aria-label={`Quitar a ${p.name}`}
                        className="min-h-[36px] px-2.5 py-1 text-xs font-medium text-[#6E685F] dark:text-[#A39B8F] hover:text-[#9B2226] dark:hover:text-[#F28B82] rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Quitar</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {drawError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-[#9B2226]/6 dark:bg-[#9B2226]/18 border border-[#9B2226]/25 dark:border-[#E57373]/35 text-[#7F1D1D] dark:text-[#F7B2B2] text-xs sm:text-sm flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{drawError}</span>
              </div>
            )}

            {room.status === 'open' ? (
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleExecuteDraw}
                  disabled={drawing || participants.length < 3}
                  className="w-full min-h-[48px] px-5 py-3 bg-[#1B4332] hover:bg-[#143326] dark:bg-[#2D6A4F] dark:hover:bg-[#38805F] disabled:opacity-45 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Shuffle className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {drawing
                      ? 'Realizando sorteo…'
                      : `Ejecutar sorteo (${participants.length} inscritos)`}
                  </span>
                </button>
                <p className="text-xs text-[#6E685F] dark:text-[#A39B8F] text-center">
                  Se requieren al menos 3 personas inscritas. Nadie se asignará a sí mismo.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#1B4332]/8 dark:bg-[#74C69D]/12 border border-[#1B4332]/20 dark:border-[#74C69D]/25 text-sm text-[#1B4332] dark:text-[#84D2AA]">
                <p className="font-semibold">Sorteo realizado</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Cada participante inscrito ya puede abrir este mismo enlace con su cuenta para descubrir a quién le toca regalar.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Columna de auto-registro o tarjeta privada */}
        <section
          className={
            isOrganizer
              ? 'lg:col-span-6'
              : 'lg:col-span-12 max-w-2xl w-full mx-auto'
          }
        >
          {room.status === 'open' ? (
            <form
              onSubmit={handleSaveProfile}
              noValidate
              className="bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#EFECE6] dark:border-[#2A2621]">
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
                    {myProfile ? 'Tu registro en esta sala' : 'Completa tu registro'}
                  </h2>
                  <p className="text-xs text-[#6E685F] dark:text-[#A39B8F]">
                    {isOrganizer
                      ? 'Opcional: inscríbete también si participas en el intercambio'
                      : 'Quien te toque en el sorteo verá esta información'}
                  </p>
                </div>
                {myProfile && (
                  <UserCheck
                    className="w-5 h-5 text-[#1B4332] dark:text-[#84D2AA] shrink-0"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div>
                <label
                  htmlFor="self-name"
                  className="block text-xs font-semibold text-[#3F3B35] dark:text-[#D9D2C7] mb-1.5"
                >
                  Tu nombre <span className="text-[#9B2226] dark:text-[#F28B82]">*</span>
                </label>
                <input
                  id="self-name"
                  type="text"
                  maxLength={80}
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ej. Sofía Martínez"
                  className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-sm text-[#1A1816] dark:text-[#F3EFE7] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 dark:focus:ring-[#74C69D]/30"
                />
              </div>

              <div>
                <label
                  htmlFor="self-likes"
                  className="block text-xs font-semibold text-[#3F3B35] dark:text-[#D9D2C7] mb-1.5"
                >
                  Lista de deseos y gustos
                </label>
                <textarea
                  id="self-likes"
                  rows={2}
                  maxLength={600}
                  value={regLikes}
                  onChange={(e) => setRegLikes(e.target.value)}
                  placeholder="Libros de misterio, café en grano, playeras talla M, velas aromáticas…"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-sm text-[#1A1816] dark:text-[#F3EFE7] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 dark:focus:ring-[#74C69D]/30 resize-y"
                />
              </div>

              <div>
                <label
                  htmlFor="self-restrictions"
                  className="block text-xs font-semibold text-[#3F3B35] dark:text-[#D9D2C7] mb-1.5"
                >
                  Restricciones o cosas que prefieres evitar
                </label>
                <textarea
                  id="self-restrictions"
                  rows={2}
                  maxLength={400}
                  value={regRestrictions}
                  onChange={(e) => setRegRestrictions(e.target.value)}
                  placeholder="Ej. Alergia a nueces, evitar fragancias dulces o ropa blanca"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-sm text-[#1A1816] dark:text-[#F3EFE7] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 dark:focus:ring-[#74C69D]/30 resize-y"
                />
              </div>

              <div>
                <label
                  htmlFor="self-message"
                  className="block text-xs font-semibold text-[#3F3B35] dark:text-[#D9D2C7] mb-1.5"
                >
                  Mensaje personal
                </label>
                <textarea
                  id="self-message"
                  rows={2}
                  maxLength={600}
                  value={regMessage}
                  onChange={(e) => setRegMessage(e.target.value)}
                  placeholder="Nota o pista extra para tu amigo secreto…"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F4] dark:bg-[#141311] border border-[#DDD6CA] dark:border-[#343029] rounded-xl text-sm text-[#1A1816] dark:text-[#F3EFE7] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/25 dark:focus:ring-[#74C69D]/30 resize-y"
                />
              </div>

              {profileError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-[#9B2226]/6 dark:bg-[#9B2226]/18 border border-[#9B2226]/25 dark:border-[#E57373]/35 text-[#7F1D1D] dark:text-[#F7B2B2] text-xs sm:text-sm flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSavedNotice && (
                <div className="p-3 rounded-xl bg-[#1B4332]/8 dark:bg-[#74C69D]/14 border border-[#1B4332]/20 dark:border-[#74C69D]/30 text-[#1B4332] dark:text-[#84D2AA] text-xs sm:text-sm flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>
                    Registro guardado. Podrás editarlo hasta que el organizador ejecute el sorteo.
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 min-h-[46px] px-5 py-2.5 bg-[#1A1816] hover:bg-[#2F2B28] dark:bg-[#F3EFE7] dark:hover:bg-[#E4DFD5] disabled:opacity-60 text-white dark:text-[#1A1816] font-semibold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  {savingProfile
                    ? 'Guardando…'
                    : myProfile
                      ? 'Actualizar mi registro'
                      : 'Guardar mi registro'}
                </button>

                {myProfile && !isOrganizer && (
                  <button
                    type="button"
                    onClick={() => handleLeaveOrRemove(user.uid)}
                    className="min-h-[46px] px-4 py-2.5 bg-white dark:bg-[#1C1A17] hover:bg-[#F2EFE9] dark:hover:bg-[#25221E] border border-[#D8D1C5] dark:border-[#343029] text-xs sm:text-sm font-medium text-[#6E685F] dark:text-[#A39B8F] hover:text-[#9B2226] dark:hover:text-[#F28B82] rounded-xl transition-colors cursor-pointer"
                  >
                    Salir de la sala
                  </button>
                )}
              </div>
            </form>
          ) : myAssignment ? (
            <div className="bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#EFECE6] dark:border-[#2A2621]">
                <div>
                  <p className="text-xs font-medium tracking-widest uppercase text-[#6E685F] dark:text-[#A39B8F]">
                    Resultado privado de {myAssignment.giverName}
                  </p>
                  <p className="mt-1 text-sm text-[#57524A] dark:text-[#B5ADA1]">
                    Solo tú puedes ver esta asignación con tu cuenta.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#9B2226]/10 dark:bg-[#E57373]/15 text-[#9B2226] dark:text-[#F28B82] flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5" aria-hidden="true" />
                </div>
              </div>

              <div className="py-4 border-b border-[#EFECE6] dark:border-[#2A2621] text-center">
                <p className="text-sm font-medium text-[#57524A] dark:text-[#B5ADA1]">
                  Te toca regalarle a:
                </p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-[#1B4332] dark:text-[#84D2AA] tracking-tight [text-wrap:balance]">
                  {myAssignment.recipientName}
                </h2>
                <p className="mt-3 text-sm text-[#57524A] dark:text-[#B5ADA1] tabular-nums">
                  Mínimo <strong className="text-[#1A1816] dark:text-[#F3EFE7]">{formattedPrice}</strong>
                  {formattedDate ? ` · ${formattedDate}` : ''}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#1A1816] dark:text-[#F3EFE7] mb-1.5">
                    <Heart className="w-4 h-4 text-[#9B2226] dark:text-[#F28B82] shrink-0" aria-hidden="true" />
                    <span>
                      Lista de deseos y gustos de{' '}
                      <span className="text-[#1B4332] dark:text-[#84D2AA]">
                        {myAssignment.recipientName}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm text-[#3F3B35] dark:text-[#E2DBD0] leading-relaxed bg-[#FAF8F4] dark:bg-[#141311] border border-[#EAE4D9] dark:border-[#2C2822] rounded-2xl px-4 py-3">
                    {myAssignment.recipientLikes ||
                      `${myAssignment.recipientName} no agregó preferencias específicas.`}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#1A1816] dark:text-[#F3EFE7] mb-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#9B2226] dark:text-[#F28B82] shrink-0" aria-hidden="true" />
                    <span>
                      Restricciones de{' '}
                      <span className="text-[#1B4332] dark:text-[#84D2AA]">
                        {myAssignment.recipientName}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm text-[#3F3B35] dark:text-[#E2DBD0] leading-relaxed bg-[#FAF8F4] dark:bg-[#141311] border border-[#EAE4D9] dark:border-[#2C2822] rounded-2xl px-4 py-3">
                    {myAssignment.recipientRestrictions ||
                      `${myAssignment.recipientName} no indicó restricciones.`}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#1A1816] dark:text-[#F3EFE7] mb-1.5">
                    <MessageSquare className="w-4 h-4 text-[#1B4332] dark:text-[#84D2AA] shrink-0" aria-hidden="true" />
                    <span>
                      Mensaje personal de{' '}
                      <span className="text-[#1B4332] dark:text-[#84D2AA]">
                        {myAssignment.recipientName}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm text-[#3F3B35] dark:text-[#E2DBD0] leading-relaxed bg-[#FAF8F4] dark:bg-[#141311] border border-[#EAE4D9] dark:border-[#2C2822] rounded-2xl px-4 py-3">
                    {myAssignment.recipientMessage ||
                      `${myAssignment.recipientName} no dejó ningún mensaje adicional.`}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1C1A17] border border-[#E4DFD5] dark:border-[#2E2A24] rounded-2xl p-6 text-center space-y-2">
              <p className="text-base font-semibold text-[#1A1816] dark:text-[#F3EFE7]">
                {isOrganizer
                  ? 'No te inscribiste como participante en este sorteo'
                  : 'El sorteo ya fue realizado'}
              </p>
              <p className="text-sm text-[#57524A] dark:text-[#B5ADA1]">
                {isOrganizer
                  ? 'Solo administraste la sala, por lo que no tienes una asignación personal.'
                  : 'Tu cuenta no estaba registrada en esta sala cuando el organizador ejecutó el sorteo.'}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
