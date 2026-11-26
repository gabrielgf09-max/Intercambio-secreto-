# Firestore Security Specification

## 1. Data Invariants
1. A `Room` can only be created by an authenticated, email-verified user whose `uid` matches `organizerUid`, with initial `status == 'open'`, valid `code` matching the document ID, and server timestamps (`createdAt == request.time`, `updatedAt == request.time`).
2. Once a `Room` transitions to `status == 'drawn'`, it is terminally locked against further updates.
3. A `RoomParticipant` cannot exist without an existing parent `Room` whose `status == 'open'` and matching `organizerUid`.
4. Only the authenticated user matching `participantUid` may create or update their own `RoomParticipant` profile, and only while the parent room is `'open'`.
5. `RoomAssignment` documents can only be created by the parent room's organizer in the exact atomic batch that transitions the parent room from `'open'` to `'drawn'` (`getAfter`), and `giverUid` can never equal `recipientUid`.
6. Only the authenticated user matching `giverUid` may read their own `RoomAssignment` document; neither other participants nor the organizer can read someone else's assignment.
7. List queries on `/rooms`, `/participants`, and `/assignments` never invoke `get()`/`exists()` and enforce `resource.data` ownership/membership directly.
8. Only the email-verified organizer of a `Room` may delete the room; deleting `participants` of a `'drawn'` room or deleting `assignments` is permitted solely for the organizer within the same atomic batch that deletes the parent `Room` (`!existsAfter`).

## 2. The "Dirty Dozen" Attack Payloads
1. Unauthenticated room creation (`request.auth == null`).
2. Creating a room spoofing another user's `organizerUid`.
3. Creating a room directly in terminal `status: 'drawn'`.
4. Creating a room with a shadow/ghost field (`isAdmin: true`).
5. Creating a room with forged client timestamp (`createdAt != request.time`).
6. Updating a room after `status` has reached `'drawn'`.
7. Registering a participant in a non-existent or already-drawn room.
8. Registering or updating a participant profile under another user's `participantUid`.
9. Spoofing `organizerUid` inside a `RoomParticipant` document (mismatched with parent `Room`).
10. Creating a self-assignment (`giverUid == recipientUid`) in `/assignments/{giverUid}`.
11. Creating an assignment outside an atomic draw batch (parent room remains `'open'`).
12. Reading another user's private `RoomAssignment` document or scraping `/rooms` via unfiltered `list`.
