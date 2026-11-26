/**
 * Security test suite specification for Firestore Rules verification against the Dirty Dozen payloads.
 */
export const DIRTY_DOZEN_CASES = [
  { name: 'Unauthenticated room create', expected: 'PERMISSION_DENIED' },
  { name: 'Spoofed organizerUid on room create', expected: 'PERMISSION_DENIED' },
  { name: 'Initial status drawn on room create', expected: 'PERMISSION_DENIED' },
  { name: 'Ghost field on room create', expected: 'PERMISSION_DENIED' },
  { name: 'Client-forged createdAt timestamp', expected: 'PERMISSION_DENIED' },
  { name: 'Modify room after status is drawn', expected: 'PERMISSION_DENIED' },
  { name: 'Join participant to closed/missing room', expected: 'PERMISSION_DENIED' },
  { name: 'Impersonate participantUid on join', expected: 'PERMISSION_DENIED' },
  { name: 'Mismatched organizerUid on participant', expected: 'PERMISSION_DENIED' },
  { name: 'Self-assignment giverUid === recipientUid', expected: 'PERMISSION_DENIED' },
  { name: 'Create assignment without atomic room status=drawn', expected: 'PERMISSION_DENIED' },
  { name: 'Read another user assignment or scrape rooms list', expected: 'PERMISSION_DENIED' },
] as const;
