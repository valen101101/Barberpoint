# Barberpoint

App de gestión para la barbería: clientes, barberos, servicios con precios
versionados y registro de cortes. Ver [`CLAUDE.md`](./CLAUDE.md) para el
documento guía completo del proyecto y [`schema.sql`](./schema.sql) para el
DDL de la base.

Estado actual: núcleo (Clientes, Barberos, Servicios/Precios, Visitas,
Análisis). Retail, propinas/comisiones, fidelización y cola de espera
quedan para un próximo tramo — el schema ya los soporta, la UI todavía no
(ver `src/lib/features.ts`).

## 1. Crear el proyecto Supabase

1. Andá a [supabase.com](https://supabase.com) y creá un proyecto nuevo
   **con el correo de la barbería** (no el personal).
2. En el SQL Editor del proyecto, pegá y ejecutá el contenido completo de
   [`schema.sql`](./schema.sql) tal cual, de arriba a abajo.
3. En Project Settings → API, copiá la **Project URL**, la **anon key** y
   la **service_role key** (esta última es secreta — nunca va al
   navegador, solo la usa el servidor).

No hace falta crear usuarios en Authentication: los barberos no usan
Supabase Auth (ver sección 2 de `CLAUDE.md`, "Login propio").

## 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Completá `.env.local` con la URL, la anon key y la service_role key del
paso anterior, y generá un `SESSION_SECRET` propio (cualquier cadena larga
y random — por ejemplo con `openssl rand -base64 32`).

## 3. Dar de alta al primer barbero

No hay pantalla de alta — es un insert directo en el SQL Editor de
Supabase:

```sql
insert into barbers (full_name) values ('Tu Nombre');
```

## 4. Correr la app

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). En `/login` vas a ver
tu perfil (el que insertaste en el paso 3) — elegilo y creá tu contraseña
la primera vez.

## 5. Actualizar los tipos cuando cambie el schema

Los tipos en `src/types/database.ts` están escritos a mano (reflejando
`schema.sql`) porque todavía no existe un proyecto Supabase real del cual
generarlos. Una vez que exista:

```bash
npx supabase gen types typescript --project-id <tu-project-id> > src/types/database.ts
```

## Stack

Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS + shadcn/ui
(sobre Base UI) + Supabase (solo Postgres, vía `service_role`) + login
propio (cookie firmada con `jose`, contraseñas con `bcryptjs`). Ver
sección 3 de `CLAUDE.md` para el detalle y sección 2 para el porqué de no
usar Supabase Auth.

Nota: Next.js 16 renombró `middleware.ts` a `proxy.ts` — la sesión se
verifica en [`proxy.ts`](./proxy.ts) (delega en `src/lib/session-proxy.ts`).

## Estructura

```
src/
  app/                  rutas (App Router)
    login/              pública — selector de perfiles
    (app)/              protegidas por proxy.ts — requieren sesión
  features/             lógica de cada módulo (queries.ts, actions.ts, components/)
  components/ui/        componentes base de shadcn/ui
  lib/
    session.ts           cookie de sesión propia (crear/verificar)
    session-proxy.ts      lógica de proxy.ts (gate de rutas)
    password.ts            hash/verificación de contraseñas
    supabase/server.ts   cliente de Supabase con service_role key
    features.ts          feature flags de módulos
  types/database.ts     tipos de la base (manuales por ahora)
```
