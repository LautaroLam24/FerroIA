---
name: security-audit
description: Auditoría de seguridad del sistema (JWT, roles, validación, transacciones, CORS, secretos)
compatibility: opencode, claude-code
---

Reglas globales obligatorias: `/.instructions.md`.

## Checklist de auditoría (reportar hallazgos con riesgo bajo/medio/alto + archivo:línea)

1. **Auth (CU01)** — JWT con secreto desde env; expiración configurada; bcrypt >= 10 rounds;
   login con rate limit; sin hashes en respuestas ni logs.
2. **Roles (CU03)** — Todos los endpoints protegidos con `JwtAuthGuard`; endpoints de
   gestión con `@Roles(ADMIN)`; probar que OPERARIO recibe 403 donde corresponde;
   ningún endpoint de escritura sin guard.
3. **Validación** — `ValidationPipe` global con `whitelist` + `forbidNonWhitelisted`;
   DTOs en toda escritura; rangos (cantidad > 0, precios >= 0).
4. **Stock (CU08/CU09)** — venta/entrada dentro de `$transaction`; validación de
   disponibilidad DENTRO de la transacción; imposible stock negativo por concurrencia.
5. **Headers/CORS** — helmet activo; CORS con origen de env (no `*`); límite de body JSON.
6. **Errores** — sin stack traces con `NODE_ENV=production`; mensajes de error sin
   información interna (queries, paths).
7. **Secretos** — `.env` en `.gitignore`; `.env.example` sin valores reales; sin secretos
   hardcodeados en el código ni en el historial de git.

NO modificar código: solo reportar y recomendar.
