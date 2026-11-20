# Security Specification — NextFoot Cloud Saves

## 1. Data Invariants
1. Every `CareerSave` under `/users/{userId}/saves/{saveId}` belongs strictly to `userId == request.auth.uid`.
2. Unauthenticated users and users without verified emails (`email_verified == true`) cannot read, list, create, update, or delete any cloud save.
3. Document IDs (`userId`, `saveId`) must match `^[a-zA-Z0-9_-]+$` and stay within `128` characters.
4. `ownerId` and `createdAt` are immutable after creation.
5. `createdAt` and `updatedAt` must match `request.time`.
6. `stateMap` must be a native Firestore `map` (never a raw JSON string).
7. Shadow/unknown fields are rejected via `keys().hasAll(...)` and `keys().hasOnly(...)` on create, and `affectedKeys().hasOnly(...)` on update.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read/write to `/users/uid1/saves/slot1`.
2. Verified user `uid2` reading `/users/uid1/saves/slot1`.
3. Verified user `uid2` listing `/users/uid1/saves`.
4. Unverified user (`email_verified: false`) writing to their own `/users/uid1/saves/slot1`.
5. Spoofed `ownerId` (`ownerId: "uid2"`) while authenticated as `uid1`.
6. Invalid `saveId` containing path/junk characters (`slot$1` or length > 128).
7. Missing required field (`season` omitted) on create.
8. Shadow field injection (`isAdmin: true`) on create or update.
9. Mutating `ownerId` or `createdAt` during an update.
10. Client-forged `createdAt` or `updatedAt` timestamp not equal to `request.time`.
11. Invalid `division` value (`"MISTO"`) outside allowed enum `["MASCULINO", "FEMININO"]`.
12. Passing a string instead of a native `map` for `stateMap`, or exceeding `saveName` max length (80 chars).
