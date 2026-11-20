// Security rules verification cases matching security_spec.md Dirty Dozen
export const dirtyDozenCases = [
  { id: 1, name: 'Unauthenticated read/write denied', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Cross-user get denied', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Cross-user list denied', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Unverified email write denied', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'Spoofed ownerId denied', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Invalid saveId regex/size denied', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Missing required field denied', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'Shadow field injection denied', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Immutable ownerId/createdAt mutation denied', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'Forged client timestamp denied', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Invalid division enum denied', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Non-map stateMap or oversized saveName denied', expected: 'PERMISSION_DENIED' },
];
