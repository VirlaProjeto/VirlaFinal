# VIRLA — Session archive (prompts, changes, operations)

Use this document to **reproduce the environment on another PC**: clone the repo, follow **Commands**, apply any **manual steps**, and read **What changed** for context.

---

## 1. User prompts (chronological)

### Prompt A — Full MVP implementation (initial agent task)

**Summary (verbatim intent from the user):**

- Act as Senior Full-Stack Developer; analyze codebase at `VirlaExperimental` and implement MVP features for **VIRLA** (caregivers ↔ families). Visual identity: purple primary, light backgrounds, white rounded cards, soft shadows.
- **Task 1 — Birth date (full-stack)**  
  - In `schema.prisma`: remove `age`, add `birthDate` (`DateTime`) on `User`.  
  - Backend: user creation + profile update accept/save birth date.  
  - Frontend: Register + Edit Profile send correct date format.  
  - Home/Dashboard: utility to compute age from `birthDate`, show dynamically.  
  - Provide Prisma migration CLI at the end.
- **Task 2 — Chat + history (full-stack)**  
  - `Message` model: `id`, `content`, `createdAt`, `senderId`, `receiverId` + `User` relations.  
  - Feed: “Send message” / chat icon per card (purple styling).  
  - Route `/chat/[userId]`, WhatsApp/Telegram-like UI.  
  - Home/Dashboard: “Messages” / “Chat history” listing conversations (name + last message) → opens chat.  
  - Backend: send message, history between two users, list conversations for dashboard.  
  - MVP: **polling** (`setInterval`), no WebSockets.
- **Task 3 — Feed pagination**  
  - Backend feed: `page` + `limit` (hardcoded **20**), return total users / total pages.  
  - Frontend `/feed`: pagination controls, fetch 20 per page.
- **Rules:** Keep Tailwind/visual identity; follow existing routing/components; brief comments on complex logic (age, polling); list terminal commands at the end.

### Prompt B — Prisma `migrate dev` on MongoDB (ask mode)

**User message (substance):**  
Ran `npx prisma migrate dev --name birthdate_and_messages`; got error that **`mongodb` provider is not supported with this command**, with link to Prisma MongoDB docs.

**Outcome (documented in chat, not a code change):**  
For MongoDB, use **`npx prisma db push`** (and **`npx prisma generate`**) instead of **`prisma migrate dev`**.

### Prompt C — `birthDate` null + Feed logout (agent task)

**User message (substance):**  

- Prisma **`P2032`**: `birthDate` expected non-nullable `DateTime`, found **`null`** (e.g. in `getFeedUsers`, `getUsers`).  
- After login, Home works; opening **Feed** sends user back to **login** and **clears all `localStorage`**.

**Code fixes applied:**  

- Schema: `birthDate` made **`DateTime?`** so legacy MongoDB documents without a date still deserialize.  
- Feed: only **`localStorage.clear()` + redirect to `/login` on `401` / `403`**; other errors show an inline error message and keep the session.

### Prompt D — This archive file (current)

**User request:**  
Create a **`.md`** with **all alterations**, **all prompts provided**, and **all agent operations**, to save and reuse on other PCs.

---

## 2. Technical decisions recorded in session

| Topic | Decision |
|--------|----------|
| MongoDB migrations | **`prisma migrate dev` is not supported** for `provider = "mongodb"`. Use **`prisma db push`** to sync schema. |
| Legacy `birthDate` | Optional field **`DateTime?`** avoids `P2032` until data is backfilled. |
| Feed errors vs auth | Do **not** treat every API failure as logout; only **401/403**. |
| JWT subject | Use **`user.id`** in `jwt.sign` / `req.userId` (Prisma MongoDB id field). |
| Login password check | Use **`await bcrypt.compare(...)`** (compare returns a Promise). |

---

## 3. Files created or materially changed

### Backend

| File | Role |
|------|------|
| `backend/prisma/schema.prisma` | `User`: `age` → `birthDate` (later **`DateTime?`**); `Message` model; relations `sentMessages` / `receivedMessages`. |
| `backend/server.js` | Mount **`messageRoutes`**. |
| `backend/src/middlewares/checkToken.js` | After verify: **`req.userId = decoded.id`**. |
| `backend/src/controllers/authController.js` | **`await bcrypt.compare`**; removed stray unused import; JWT payload uses **`user.id`**. |
| `backend/src/controllers/userController.js` | Create/update with **`birthDate`**; **`getFeedUsers`** pagination (`limit=20`, `total`, `totalPages`, `page`); public **`USER_PUBLIC_SELECT`**; **`updateUsers`** returns **`{ user }`**. |
| `backend/src/controllers/messageController.js` | **New:** `sendMessage`, `getMessageHistory`, `getConversations`. |
| `backend/src/routes/messageRoutes.js` | **New:** `POST /messages`, `GET /messages/history/:userId`, `GET /conversations` (all behind **`checkToken`**). |

*Note: `backend/src/routes/userRoutes.js` / `authRoutes.js` were already wired; feed route remains **`GET /users/:id/feed`**.*

### Frontend (`frontend/virla-experimental/`)

| File | Role |
|------|------|
| `src/AppShell.jsx` | **New:** routes + menu visibility (extracted from `main.jsx` for ESLint fast-refresh). |
| `src/main.jsx` | Renders **`BrowserRouter` + `AppShell`** only. |
| `src/services/api.js` | Axios **`Authorization`** interceptor from **`localStorage.meuToken`**. |
| `src/utils/dateUtils.js` | Comment on **`calculateAge`** (birthday-not-yet-this-year). |
| `src/pages/Feed/index.jsx` | Pagination; **`birthDate` → age** on cards; **“Enviar mensagem”**; **401/403-only logout**; **`fetchError`** banner. |
| `src/pages/Home/index.jsx` | Tabs **Painel** vs **Mensagens** (`?tab=mensagens`); conversations list; quick links. |
| `src/pages/Chat/index.jsx` | **New:** `/chat/:userId`, composer, **polling** (~4s). |
| `src/pages/Perfil/index.jsx` | Rely on API interceptor; **`PUT`** response **`user`**; unused import cleanup. |
| `src/pages/Landing/index.jsx` | Removed unused imports (lint). |
| `src/pages/User/index.jsx` | Replaced broken duplicate file with minimal placeholder (lint/parse). |

*Cadastro / Login / Menu were already aligned or unchanged in the last fixes; Cadastro sends **`birthDate`** as ISO.*

---

## 4. API surface (quick reference)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/users` or `/auth/register` | No | Register (includes **`birthDate`**). |
| `POST` | `/auth/login` | No | Login → **`token`**, **`user.id`**. |
| `GET` | `/users/:id` | Bearer | Profile (no password in response). |
| `PUT` | `/users/:id` | *As implemented* | Update profile (**`birthDate`**, **`bio`**, **`name`**, etc.). |
| `GET` | `/users/:id/feed?page=1` | Bearer | Opposite role, **20** per page, **`total`**, **`totalPages`**. |
| `POST` | `/messages` | Bearer | Body: **`{ receiverId, content }`**. |
| `GET` | `/messages/history/:userId` | Bearer | Thread + **`peer`**. |
| `GET` | `/conversations` | Bearer | Dashboard conversation list. |

---

## 5. Agent / terminal operations (what was run)

These were executed in the agent environment (paths Windows-style as in the project):

```powershell
cd c:\Users\fabio\Documents\TEMP\VirlaExperimental\backend
npx prisma validate
```

```powershell
cd c:\Users\fabio\Documents\TEMP\VirlaExperimental\backend
npx prisma generate
```
*(Sometimes failed with **EPERM** on Windows if another process locked `query_engine-windows.dll.node` — stop `node` / dev server and retry.)*

```powershell
cd c:\Users\fabio\Documents\TEMP\VirlaExperimental\frontend\virla-experimental
npm run lint
npm run build
```

---

## 6. Commands for you on a new PC

### Prerequisites

- Node.js + npm  
- MongoDB URI in **`backend/.env`** as **`DATABASE_URL`**  
- **`SECRET`** in `.env` for JWT  

### Backend

```powershell
cd <repo>\backend
npm install
npx prisma generate
npx prisma db push
node server.js
```
*(Or your usual dev script if you add one.)*

**Do not use** `npx prisma migrate dev` **for MongoDB** — use **`db push`** as above.

### Frontend

```powershell
cd <repo>\frontend\virla-experimental
npm install
npm run dev
```

### If Prisma client fails to regenerate (Windows EPERM)

1. Stop **all** Node processes using this project (`npm run dev`, backend server, IDE Prisma tasks).  
2. Run **`npx prisma generate`** again.  
3. Optionally restart the terminal.

---

## 7. LocalStorage keys used by the app

| Key | Purpose |
|-----|---------|
| `meuToken` | JWT |
| `meuId` | Logged-in user id |
| `meuNome` | Display name cache |

---

## 8. Optional follow-ups (not done in session)

- Backfill **`birthDate`** in MongoDB for old users, then set schema back to **required** if you want strict validation at DB level.  
- Replace polling with **WebSockets** or **SSE** for chat.  
- Protect **`PUT/DELETE /users/:id`** with ownership checks + token user id match.

---

*Generated for the VIRLA / VirlaExperimental repo. Copy this file with the project when moving machines.*
