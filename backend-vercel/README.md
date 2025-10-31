# Backend (Vercel + Express + MySQL)

## Requisitos
- MySQL compatible (PlanetScale recomendado)
- Node 18+ (local)
- Variables de entorno en Vercel (ver `.env.example`)

## Deploy
1. Sube esta carpeta a un repo (GitHub).
2. Importa el repo en Vercel.
3. Crea las variables de entorno de `.env.example` en Vercel.
4. Ejecuta el `schema.sql` en tu base de datos.
5. Abre `/api/health` para verificar.

## Notas
- Hash de contraseñas: **bcrypt** con costo 12 (60 chars). Columna `CHAR(60)`.
- Login local: **solo Gmail**.
- Registro: Gmail/Yahoo/Hotmail.
- JWT: `Authorization: Bearer <token>`.
- CORS: configura `CORS_ORIGIN` con tu front web (para pruebas). APK no lo requiere si es nativo.