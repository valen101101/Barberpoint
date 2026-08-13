# CLAUDE.md — App de Gestión de Barbería

> Documento guía del proyecto. Sirve como contexto para Claude Code (u otro asistente) durante el desarrollo. Se actualiza a medida que el proyecto crece.

## 0. Historial de cambios de este documento

- **2026-08-10**: versión inicial (alcance funcional, stack, modelo de datos base).
- **2026-08-10**: sumados módulos de retail/inventario, comisiones y propinas, perfil de cliente enriquecido, fidelización, cola de espera/walk-ins, registro de notificaciones y sucursales (preparado a futuro). Surgen de research de tendencias en apps líderes del rubro (Squire, Booksy, Fresha, Vagaro, GlossGenius, Square Appointments) — ver sección 4.4.
- **2026-08-10**: `clients` separa `first_name`/`last_name` (antes `full_name`) y suma `client_number` (legajo autogenerado). Motivo: el barbero no siempre recuerda caras/nombres — pedirle el legajo al cliente es menos incómodo que preguntar "¿cómo te llamás?", y permite buscar por apellido. Se sembró un cliente especial `is_generic = true` con legajo `0000` para cortes casuales que no ameritan registrar a la persona (cada cliente real sigue teniendo su propio legajo e historial — no se comparte un cliente genérico entre todos los desconocidos, para no perder el seguimiento de frecuencia). Ver `schema.sql` sección 2.1.
- **2026-08-10**: cada cuenta de login pasa a ser directamente un barbero. El dueño sigue creando la cuenta a mano en Supabase (Authentication > Users, con email/contraseña) — no hay auto-registro público. La primera vez que esa cuenta se loguea y no tiene nombre cargado, la app le pide sus datos (`/bienvenida`) y ahí recién se crea su fila en `barbers`, vinculada por `user_id`. El dueño puede revocarle el acceso a un barbero después poniendo `active = false` a mano en el Table Editor (`/cuenta-inactiva`). Al registrar una visita, el barbero ya no se elige de una lista: se usa automáticamente el que está logueado. La sección "Barberos" (alta/edición manual) se sacó del menú; la tabla sigue existiendo porque la referencian `visits` y "barbero preferido" de un cliente. Todavía no hay roles reales (ver sección 9) — cualquier cuenta logueada tiene acceso completo una vez que completó su perfil. Ver `schema.sql` sección 1.1.
- **2026-08-12**: se saca Supabase Auth para barberos — reemplazado por login propio. Dar de alta a un barbero pasa a ser un `insert` manual en `barbers` (solo el nombre, sin email ni contraseña). `/login` muestra un selector de perfiles (estilo "elegí quién sos"); al elegir el propio, si `password_hash` es `null` se le pide crear una contraseña ahí mismo (primer uso), si no, se la pide para entrar. La sesión es una cookie propia firmada (JWT con `jose`), no un token de Supabase Auth — por eso el server ahora habla con Supabase usando la `service_role key` (bypassea RLS por diseño) en vez de depender de `auth.uid()`; el control de acceso vive en la app (`proxy.ts` + el layout), no en RLS por rol. `/bienvenida` (completar perfil) se elimina — ya no hace falta, el nombre viene del alta por SQL. Trade-off asumido a propósito: sin verificación de identidad más allá de "sabías que ese perfil existía" — razonable para un equipo chico compartiendo un dispositivo en el mostrador, pero documentado como decisión consciente, no como descuido. Ver `schema.sql` sección 1.1 y `src/lib/session.ts`.

Nota de precisión: los nombres de funciones y sintaxis específica de Supabase (RLS, `auth.uid()`, Realtime, Storage, Edge Functions) que aparecen acá reflejan cómo funcionaban hasta mi corte de conocimiento (enero 2026). Antes de implementar, conviene verificar contra la documentación oficial de Supabase (https://supabase.com/docs) por si cambió algo.

---

## 1. Qué es este proyecto

App de gestión para una barbería: registro de cortes/servicios realizados, base de datos de clientes con seguimiento de frecuencia, y gestión de barberos con asignación (no exclusiva) de clientes.

Un solo local/negocio (single-tenant). No está pensado, por ahora, para gestionar múltiples barberías desde una misma instancia.

### 1.1 Objetivos funcionales (resumen de lo pedido)

1. **Registro de cortes**: seleccionar un cliente → marcar el corte realizado → precio se toma automáticamente del valor vigente del servicio.
2. **Precios versionados en el tiempo**: si el corte de agosto costaba $15.000 y en septiembre sube a $16.000, el cambio no debe alterar el valor histórico de los cortes ya registrados en agosto. Los indicadores/reportes del pasado deben quedar intactos.
3. **Ficha de clientes**: nombre, WhatsApp, y canales alternativos (Instagram, Facebook, etc.) cuando no hay WhatsApp. Alta, edición, baja lógica.
4. **Seguimiento y alertas de clientes**: identificar si un cliente viene seguido o esporádicamente, y alertar al barbero cuando un cliente "se enfría" (no vuelve dentro de un rango esperado).
5. **Gestión de barberos**: alta de barberos, asignación de clientes "preferidos" por barbero — a modo de **recomendación**, no de restricción. Cualquier barbero puede atender a cualquier cliente.
6. **Modularidad extrema**: el sistema debe poder crecer, modificarse o recortarse sin fricción. Se prioriza esto sobre el ahorro de esfuerzo/tokens en la construcción inicial.

---

## 2. Decisiones de producto ya tomadas

| Decisión | Elección |
|---|---|
| Plataforma | Web + móvil (ver estrategia de fases abajo) |
| Backend/DB | Supabase (Postgres + Auth + Storage + Realtime) |
| Base de datos | Proyecto Supabase propio, creado con el correo de la barbería (no el personal) |
| Multi-tenant | No, por ahora. Un solo negocio. |
| Asignación barbero-cliente | Recomendada, no exclusiva ni bloqueante |
| Precios | Versionados por fecha de vigencia; cada corte registrado congela el precio del momento |

### 2.1 Sobre "web + móvil" — recomendación de secuencia

Construir una app 100% nativa para iOS/Android y una web separada, en paralelo, desde el día uno, multiplica el trabajo (dos codebases, dos flujos de auth, dos releases). Dado que pediste que todo sea muy modificable y no te preocupa el consumo de tokens en la construcción, la secuencia recomendada es:

- **Fase 1**: Web app responsive (Next.js) que funciona perfecto en el celular del barbero desde el navegador, y se puede "instalar" como PWA (ícono en el home, funciona a pantalla completa) sin pasar por tiendas de apps. Esto ya cubre el 90% del caso de uso real de un mostrador de barbería.
- **Fase 2** (si hace falta más adelante: notificaciones push nativas, uso offline real, etc.): app nativa con **Expo/React Native**, reutilizando el mismo backend de Supabase, los mismos tipos de datos y gran parte de la lógica de negocio.

Esto no es una limitación técnica de Supabase ni del stack — es una recomendación para no duplicar esfuerzo antes de validar el uso real. Se puede reordenar si preferís arrancar directamente con app nativa.

---

## 3. Stack técnico propuesto

- **Frontend web**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase
  - Postgres como base de datos
  - Supabase Auth (login del dueño/barberos)
  - Row Level Security (RLS) para permisos por rol
  - Supabase Storage (si más adelante se suman fotos de cortes o de clientes)
- **Hosting**: Vercel (frontend) + Supabase Cloud (backend)
- **App móvil (fase 2)**: Expo + React Native, mismo cliente de Supabase (`@supabase/supabase-js`)

No tengo forma de confirmar precios/planes actuales de Supabase o Vercel — conviene revisar sus páginas de pricing al momento de crear el proyecto, ya que pueden haber cambiado.

---

## 4. Modelo de datos (resumen conceptual)

El detalle exacto y actualizado del esquema vive en **`schema.sql`**, en la raíz del proyecto. Esa es la fuente de verdad — este documento da el resumen conceptual.

### 4.1 Entidades principales

- **`barbers`** — barberos del local.
- **`clients`** — clientes: nombre, notas, estado activo/inactivo.
- **`client_contact_channels`** — uno o más canales de contacto por cliente (WhatsApp, Instagram, Facebook, teléfono, etc.), con uno marcado como principal.
- **`client_barber_preferences`** — relación recomendada cliente↔barbero (no exclusiva, informativa/sugerida).
- **`services`** — tipos de servicio (ej. "Corte clásico", "Corte + barba").
- **`service_prices`** — historial de precios por servicio, cada uno con fecha de vigencia (`valid_from` / `valid_to`). **Nunca se edita un precio viejo; se cierra su vigencia y se crea uno nuevo.**
- **`visits`** — el registro real de un corte: cliente, barbero, servicio, y el **precio efectivamente cobrado** (copiado al momento de la visita, inmutable de ahí en más). Ahora también guarda `tip_amount` (propina).
- **`alert_rules`** — reglas configurables de seguimiento (ej. "avisar si un cliente no vuelve en 45 días").
- **`branches`** — sucursales. Hoy el negocio tiene una sola, pero barberos/clientes/visitas ya pueden referenciar una sucursal para no tener que reestructurar el modelo si en algún momento se abre una segunda.
- **`products`** / **`product_sales`** — inventario de productos de reventa (ceras, shampoos, etc.) y sus ventas, con el mismo patrón de precio congelado al momento de la venta que ya usa `visits`.
- **`loyalty_point_events`** — historial de puntos de fidelización por cliente (suma y canje), en vez de un contador simple, para que quede auditable y no se pueda desalinear.
- **`waitlist_entries`** — cola de espera de walk-ins (clientes que llegan sin turno), con estado (`waiting`/`in_service`/`done`/`cancelled`).
- **`client_notifications`** — registro/cola de recordatorios y mensajes de reactivación enviados a clientes (WhatsApp/SMS/email). Es solo el log — el envío real requiere integrar un proveedor externo (Twilio, WhatsApp Business API, etc.), que queda fuera de este schema.

Además, `barbers` sumó `commission_rate` (comisión %, opcional) y `clients` sumó `photo_url` y `preferred_style` para un perfil más completo.

### 4.2 La regla clave: precios inmutables hacia atrás

Cuando se registra una visita (`visits`), el precio no se calcula "en vivo" contra `services` — se copia el precio vigente de `service_prices` a ese momento y queda guardado en la fila de `visits`. Así, subir el precio en septiembre no toca ningún registro de agosto, y los reportes históricos quedan intactos. Esto es lo que pediste explícitamente y es el corazón del diseño de esta parte.

### 4.3 Seguimiento de clientes (frecuencia y alertas)

En vez de guardar "frecuencia" como un campo fijo en `clients` (que se desactualizaría), se calcula dinámicamente a partir de `visits`: fecha de última visita, cantidad total de visitas, promedio de días entre visitas. Esto se expone como una vista (`client_stats` en `schema.sql`) para que el frontend simplemente la consulte, sin reimplementar la lógica en cada pantalla.

La clasificación de un cliente (frecuente / esporádico / inactivo) se resuelve comparando esos datos contra `alert_rules`, que son editables sin tocar código.

### 4.4 Funcionalidades sumadas a partir de tendencias del mercado (research agosto 2026)

Se revisaron apps líderes del rubro (Squire, Booksy, Fresha, Vagaro, GlossGenius, Square Appointments) para ver qué ofrecen de forma estándar. De ahí se sumaron al modelo de datos, como **módulos opcionales** (se pueden activar, modificar o ignorar sin afectar el núcleo de clientes/visitas/precios):

- **Retail e inventario** (`products`, `product_sales`): venta de productos con el mismo mecanismo de precio congelado que ya usan las visitas.
- **Propinas y comisión por barbero** (`visits.tip_amount`, `barbers.commission_rate`, vista `barber_earnings`): para saber cuánto generó cada barbero, no solo cuántos cortes hizo.
- **Perfil de cliente enriquecido** (`clients.photo_url`, `clients.preferred_style`): tendencia común en Squire (fotos, notas de estilo) para que el barbero tenga contexto antes de atender.
- **Fidelización con historial auditable** (`loyalty_point_events`, vista `client_loyalty_balance`): puntos por visita, con log en vez de un contador simple.
- **Cola de espera / walk-ins** (`waitlist_entries`): marcado como criterio estándar de evaluación en las guías 2026 — muchas barberías funcionan más a demanda que por turno agendado.
- **Registro de notificaciones** (`client_notifications`): el log de qué se le mandó a cada cliente y cuándo. Conecta directo con el módulo de alertas: en vez de que la alerta sea solo visual para el barbero, deja preparado el terreno para que dispare un mensaje real de reactivación.
- **Sucursales** (`branches`): no es un pedido tuyo hoy, pero es una columna nullable barata de agregar ahora y cara de agregar después si en algún momento abrís un segundo local.

**Deliberadamente no se sumó** (quedan como fase futura si en algún momento las querés, pero agregan complejidad de integración que conviene resolver aparte, una vez que el núcleo esté funcionando):

- **Reservas online públicas / marketplace de descubrimiento de nuevos clientes** (lo que hace fuerte a Booksy y Fresha): tu pedido original es una herramienta de gestión interna, no de captación de clientes nuevos vía marketplace. Si más adelante te interesa, es un módulo separado (requiere página pública, calendario de disponibilidad en tiempo real y manejo de pagos online).
- **Membresías con cobro recurrente automático**: requiere integrar un procesador de pagos con cobro periódico (ej. Mercado Pago suscripciones), tema aparte del modelo de datos.
- **Asistentes con IA ("ghost receptionist")**: tendencia mencionada en las guías 2026, pero todavía experimental — no la incluiría en una v1.

---

## 5. Principios de diseño (para que todo sea fácil de modificar)

1. **Todo lo configurable vive en la base de datos, no hardcodeado en el código**: precios, reglas de alerta, tipos de canal de contacto, tipos de servicio. Agregar un servicio nuevo o cambiar una regla de alerta no debería requerir un deploy.
2. **Nunca hacer UPDATE destructivo sobre datos históricos con impacto en reportes**: la estrategia de "cerrar vigencia y crear nuevo registro" (usada en `service_prices`) es el patrón a repetir para cualquier otro dato que cambie con el tiempo pero tenga que preservar el pasado (ej. si más adelante se agregan comisiones por barbero).
3. **Componentes de UI chicos y desacoplados**: cada módulo (clientes, barberos, servicios, visitas/cortes, alertas) como su propia carpeta de features, sin dependencias cruzadas innecesarias.
4. **Feature flags simples** para poder activar/desactivar módulos nuevos (ej. "módulo de comisiones", "módulo de recordatorios por WhatsApp") sin romper lo demás.
5. **Tipos generados desde la base**: usar la generación de tipos TypeScript de Supabase a partir del schema real, para que el frontend nunca se desalinee del modelo de datos.
6. **RLS desde el día uno**: aunque al principio solo lo use el dueño/barberos, conviene definir políticas de acceso por rol desde el principio y no como parche después.

---

## 6. Roles de usuario (propuesta inicial)

- **Admin/dueño**: alta de barberos, servicios, precios, reglas de alerta; ve todo.
- **Barbero**: registra visitas, ve y edita clientes, ve sus propias estadísticas y las de otros barberos (a definir si se restringe).

Esto es una propuesta de partida — falta definir con vos si los barberos deben ver la facturación de otros barberos o solo la propia.

---

## 7. Estado del proyecto

- [ ] Proyecto Supabase creado (pendiente: crearlo con el correo de la barbería)
- [ ] `schema.sql` aplicado a Supabase
- [ ] Proyecto Next.js inicializado
- [ ] Auth configurada
- [ ] Módulo de clientes
- [ ] Módulo de servicios y precios versionados
- [ ] Módulo de registro de visitas/cortes
- [ ] Módulo de barberos y asignaciones
- [ ] Vista/dashboard de alertas y tendencias de clientes
- [ ] PWA / instalación en celular
- [ ] (Fase 2) App nativa con Expo
- [ ] (Opcional) Módulo de retail/inventario de productos
- [ ] (Opcional) Comisiones y propinas por barbero
- [ ] (Opcional) Cola de espera / walk-ins
- [ ] (Opcional) Fidelización (puntos)
- [ ] (Opcional) Envío real de recordatorios/reactivación (requiere integrar WhatsApp/SMS)
- [ ] (Fase futura) Reservas online públicas

## 8. Archivos relacionados

- `schema.sql` — DDL completo y actualizado de Supabase. Se ejecuta tal cual en el SQL Editor de Supabase para crear todas las tablas de una.

---

## 9. Preguntas abiertas (a resolver con el dueño de la barbería)

Marcadas para no asumir nada sin confirmar:

1. ¿Los barberos ven las ventas/comisiones de otros barberos, o solo las propias?
2. ¿Hace falta manejar descuentos o promociones puntuales sobre el precio de un corte, más allá del precio de lista?
3. ~~¿Se necesita registrar métodos de pago (efectivo, transferencia, tarjeta) por visita?~~ **Resuelto (2026-08-11)**: sí. `visits.payment_method` (cash/transfer/card/other), obligatorio al registrar una visita, default "cash".
4. ¿El umbral de "cliente esporádico/inactivo" es el mismo para todos los clientes o varía según su historial personal (ej. alguien que siempre viene cada 60 días no es "inactivo" a los 45)?
5. ¿Quién factura/cobra dentro del local — se necesita algo de caja diaria, o solo registro de cortes?
