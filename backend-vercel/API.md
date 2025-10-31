# API Biblioteca Virtual

Base URL: `/api`

## Auth
- `POST /auth/register` → { name, email, password, role? ["BIBLIOTECARIO"|"AUTOR"|"USUARIO"] }
  - Reglas: nombre solo letras (min 4), email dominio: gmail/yahoo/hotmail, pass ≥ 6.
  - Respuesta: `{ ok, token (access), refresh_token, user }` (auto-login).
- `POST /auth/login` → { email, password }
  - Regla: **solo** `@gmail.com` para login local.
  - Respuesta: `{ ok, token (access), refresh_token, user }`.
- `POST /auth/google` → { email, name, photo_url } (cliente obtiene datos de Google)
  - Respuesta: `{ ok, token, refresh_token, user }`
- `POST /auth/refresh` → { user_id, refresh_token } → `{ ok, token, refresh_token, user }`
- `POST /auth/logout` → { user_id, refresh_token } → `{ ok: true }`

## Users
- `PUT /users/me` (Bearer) → { name?, photo_url? } → `{ ok, user }`

## Books
- `GET /books?q=` → catálogo aprobado.
- `GET /books/mine` (Bearer) → libros del usuario.
- `POST /books` (Bearer: AUTOR/BIBLIOTECARIO) → { title, description?, cover_url?, content_type: "TEXT"|"PDF"|"DOCX", content?, content_url? } → crea en **PENDING**. Si `TEXT`, se pagina automáticamente.
- `PUT /books/:id` (Bearer: autor dueño o BIBLIOTECARIO) → edita y vuelve a **PENDING**.
- `DELETE /books/:id` (Bearer: **autor dueño**) → borra sin aprobación.
- `GET /books/requests` (Bearer: **BIBLIOTECARIO**) → lista PENDING.
- `POST /books/:id/approve` (Bearer: **BIBLIOTECARIO**) → pasa a **APPROVED**.
- `POST /books/:id/reject` (Bearer: **BIBLIOTECARIO**) → pasa a **REJECTED**.
- `GET /books/:id` → detalle + páginas si TEXT.

### Errores
Respuestas con `{ ok:false, message }` o `{ ok:false, errors:[...] }` (validación).