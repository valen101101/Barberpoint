-- ============================================================================
-- schema.sql — App de Gestión de Barbería
-- ----------------------------------------------------------------------------
-- Este es el archivo VIVO del esquema de base de datos. Se va actualizando
-- a medida que el proyecto crece. Está pensado para ejecutarse tal cual
-- (de arriba a abajo) en el SQL Editor de un proyecto nuevo de Supabase.
--
-- Nota: la sintaxis usada acá es Postgres estándar. Las partes específicas
-- de Supabase (policies de RLS con auth.uid(), extensiones, etc.) están
-- marcadas como tales. Conviene verificar contra la documentación oficial
-- de Supabase (https://supabase.com/docs) antes de aplicar en producción,
-- por si la sintaxis cambió desde que se escribió esto.
--
-- Última actualización: 2026-08-10
-- Versión: 0.6 (+ retail/inventario, comisiones/propinas, perfil de cliente
--   enriquecido, fidelización, cola de espera/walk-ins, log de notificaciones
--   y sucursales — módulos opcionales inspirados en apps líderes del rubro;
--   + legajo de cliente y cliente genérico para cortes casuales, sección 2.1;
--   + visits.payment_method: forma de pago por corte, sección 5;
--   + barbers.password_hash: login propio por selector de perfiles, sin
--   Supabase Auth — alta de barbero es un insert SQL directo, sección 1.1)
-- ============================================================================

-- Extensión para generar UUIDs (suele venir habilitada por defecto en Supabase,
-- se deja explícita por las dudas)
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. BARBEROS
-- ============================================================================

create table if not exists barbers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table barbers is 'Barberos del local.';

-- ----------------------------------------------------------------------------
-- 1.1 Login propio (no Supabase Auth). Dar de alta a un barbero es un
-- insert manual acá, solo con el nombre:
--   insert into barbers (full_name) values ('Juan Pérez');
-- La app le muestra un selector de perfiles en /login; al elegir el suyo,
-- si password_hash es null le pide crear una contraseña (queda guardada
-- ahí mismo), si no, se la pide para entrar. No hay email/contraseña en el
-- alta — el manejo de sesión es una cookie propia, no un token de
-- Supabase Auth (por eso el server usa la service_role key y no depende
-- de RLS por rol; ver README para la variable de entorno necesaria).
-- ----------------------------------------------------------------------------
alter table barbers add column if not exists password_hash text;

comment on column barbers.password_hash is
  'Hash bcrypt de la contraseña. Null = todavía no la creó (primer login '
  'se la pide). Nunca se guarda ni se expone la contraseña en texto plano.';
comment on column barbers.active is
  'Activo/inactivo. El dueño puede poner esto en false (Table Editor de '
  'Supabase) para revocarle el acceso a un barbero sin borrar su '
  'historial de visitas — no puede loguearse ni aparece en el selector '
  'de perfiles de /login.';

alter table barbers drop column if exists user_id;

alter table barbers add column if not exists instagram text;
comment on column barbers.instagram is 'Usuario de Instagram del barbero, opcional (con @).';

-- ============================================================================
-- 2. CLIENTES
-- ============================================================================

-- Secuencia para el "legajo" (client_number): un número corto que el barbero
-- puede pedirle al cliente ("¿tenés legajo?") en vez de tener que reconocerlo
-- o preguntarle el nombre directamente. Arranca en 1 a propósito: el legajo
-- 0 queda reservado para el cliente genérico (ver más abajo).
create sequence if not exists clients_client_number_seq;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  client_number integer not null unique default nextval('clients_client_number_seq'),
  is_generic boolean not null default false,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table clients is 'Clientes de la barbería.';

-- ----------------------------------------------------------------------------
-- 2.1 Migración desde el modelo anterior (full_name) — segura de re-ejecutar.
-- Si este script corre sobre una base que ya tenía `clients.full_name`
-- (versiones previas de este archivo), separa ese valor en first_name/
-- last_name en vez de perder el dato. En una base nueva, la tabla ya nace
-- con la forma correcta de arriba y este bloque no hace nada.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'clients' and column_name = 'full_name'
  ) then
    alter table clients add column if not exists first_name text;
    alter table clients add column if not exists last_name text;

    update clients
    set
      first_name = coalesce(first_name, split_part(full_name, ' ', 1)),
      last_name = coalesce(
        last_name,
        nullif(trim(substring(full_name from length(split_part(full_name, ' ', 1)) + 1)), ''),
        split_part(full_name, ' ', 1)
      )
    where full_name is not null and (first_name is null or last_name is null);

    alter table clients alter column first_name set not null;
    alter table clients alter column last_name set not null;
    -- OJO: todavía no se dropea full_name acá. La vista client_stats
    -- (sección 7, más abajo) depende de esa columna hasta que se la
    -- redefine; dropearla antes rompería con "cannot drop column ...
    -- because other objects depend on it". El drop real está al final
    -- de la sección 7.
  end if;
end $$;

alter table clients add column if not exists client_number integer
  not null default nextval('clients_client_number_seq');
create unique index if not exists uq_clients_client_number on clients (client_number);

alter table clients add column if not exists is_generic boolean not null default false;

-- Estos comment on column van acá (y no pegados al create table de arriba)
-- porque en una base que ya tenía `clients` de antes, las columnas recién
-- existen después de las migraciones anteriores.
comment on column clients.client_number is
  'Legajo autogenerado (nunca lo carga un usuario). Se usa para identificar '
  'al cliente sin depender de que el barbero recuerde su nombre.';
comment on column clients.is_generic is
  'true solo para el cliente comodín (legajo 0000) usado en cortes casuales '
  'que no ameritan registrar a la persona. Ver sección 2.1.';

-- El insert del cliente comodín va después de la sección 7 (una vez
-- dropeada full_name): mientras esa columna todavía exista y sea not null
-- sin default, este insert fallaría por no darle un valor.

-- Canales de contacto del cliente: WhatsApp, Instagram, Facebook, teléfono, etc.
-- Se modela como tabla aparte (en vez de columnas fijas en clients) para poder
-- agregar tipos de canal nuevos sin migraciones.
create table if not exists client_contact_channels (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  channel_type text not null check (
    channel_type in ('whatsapp', 'instagram', 'facebook', 'tiktok', 'phone', 'email', 'other')
  ),
  value text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table client_contact_channels is 'Canales de contacto de un cliente (WhatsApp, redes sociales, etc.).';

create index if not exists idx_client_contact_channels_client_id
  on client_contact_channels (client_id);

-- Un solo canal "principal" por cliente
create unique index if not exists uq_client_contact_channels_primary
  on client_contact_channels (client_id)
  where is_primary;

-- ============================================================================
-- 3. RELACIÓN CLIENTE - BARBERO (recomendada, NO exclusiva)
-- ============================================================================

create table if not exists client_barber_preferences (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  barber_id uuid not null references barbers (id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique (client_id, barber_id)
);

comment on table client_barber_preferences is
  'Barbero(s) recomendado(s) para un cliente. Es solo una sugerencia para la UI: '
  'cualquier barbero puede registrar una visita de cualquier cliente.';

-- ============================================================================
-- 4. SERVICIOS Y PRECIOS VERSIONADOS
-- ============================================================================

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table services is 'Tipos de servicio ofrecidos (ej. "Corte clásico", "Corte + barba").';

-- Historial de precios por servicio. NUNCA se hace UPDATE del precio de una
-- fila existente para "subirlo": se cierra la vigencia (valid_to) de la fila
-- actual y se inserta una fila nueva con el precio nuevo. Así el precio
-- histórico queda intacto para siempre.
create table if not exists service_prices (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services (id) on delete cascade,
  price numeric(10, 2) not null check (price >= 0),
  valid_from date not null default current_date,
  valid_to date, -- null = precio vigente actualmente
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from)
);

comment on table service_prices is
  'Historial de precios de cada servicio. valid_to = null significa que es el precio vigente.';

create index if not exists idx_service_prices_service_id
  on service_prices (service_id);

-- Un solo precio "vigente" (valid_to is null) por servicio a la vez
create unique index if not exists uq_service_prices_current
  on service_prices (service_id)
  where valid_to is null;

-- Función + trigger: al insertar un nuevo precio vigente para un servicio,
-- cierra automáticamente el precio vigente anterior (le pone valid_to = ayer,
-- o la fecha que corresponda) para no tener que hacerlo a mano desde la app.
create or replace function close_previous_service_price()
returns trigger
language plpgsql
as $$
begin
  if new.valid_to is null then
    -- greatest(...) evita romper el check (valid_to >= valid_from) cuando
    -- el precio anterior se cargó el mismo día que este (valid_from - 1
    -- quedaría antes que el propio valid_from del precio que se cierra):
    -- en ese caso queda vigente un solo día en vez de restar uno.
    update service_prices
    set valid_to = greatest(new.valid_from - 1, valid_from)
    where service_id = new.service_id
      and valid_to is null
      and id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_close_previous_service_price on service_prices;
create trigger trg_close_previous_service_price
  before insert on service_prices
  for each row
  execute function close_previous_service_price();

-- ============================================================================
-- 5. VISITAS (cortes realizados)
-- ============================================================================

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete restrict,
  barber_id uuid not null references barbers (id) on delete restrict,
  service_id uuid not null references services (id) on delete restrict,
  service_price_id uuid not null references service_prices (id) on delete restrict,
  -- Precio efectivamente cobrado. Se copia de service_prices.price al momento
  -- de crear la visita. Queda fijo para siempre, sin importar qué pase
  -- después con service_prices. Esto es lo que garantiza que subir un precio
  -- no altere los reportes históricos.
  price_charged numeric(10, 2) not null check (price_charged >= 0),
  visit_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

comment on table visits is
  'Registro de cada corte/servicio realizado. price_charged queda congelado '
  'al momento de la visita y no cambia aunque el precio del servicio cambie después.';

create index if not exists idx_visits_client_id on visits (client_id);
create index if not exists idx_visits_barber_id on visits (barber_id);
create index if not exists idx_visits_visit_date on visits (visit_date);

alter table visits add column if not exists payment_method text
  not null default 'cash'
  check (payment_method in ('cash', 'transfer', 'card', 'other'));

comment on column visits.payment_method is
  'Forma de pago del corte: cash (efectivo), transfer (transferencia), '
  'card (tarjeta) u other (otro).';

-- ============================================================================
-- 6. REGLAS DE ALERTA / SEGUIMIENTO DE CLIENTES
-- ============================================================================

create table if not exists alert_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  days_since_last_visit int not null check (days_since_last_visit > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table alert_rules is
  'Reglas configurables para marcar a un cliente como "esporádico" o "inactivo" '
  'según los días transcurridos desde su última visita.';

-- Unique en name para que la regla de ejemplo de abajo no se duplique si este
-- archivo se corre más de una vez.
create unique index if not exists uq_alert_rules_name on alert_rules (name);

-- Regla de ejemplo (opcional, se puede borrar o editar desde la UI del admin)
insert into alert_rules (name, days_since_last_visit, active)
values ('Cliente inactivo', 45, true)
on conflict (name) do nothing;

-- ============================================================================
-- 7. VISTA: ESTADÍSTICAS POR CLIENTE
-- ============================================================================
-- Calcula, para cada cliente: última visita, cantidad total de visitas,
-- gasto total histórico (según price_charged, nunca recalculado con precios
-- actuales) y el promedio de días entre visitas. El frontend consulta esta
-- vista directamente en vez de reimplementar la lógica.

-- `create or replace view` no permite renombrar/reordenar columnas de una
-- vista existente (solo agregar al final) — como acá `full_name` pasa a
-- ser `first_name`/`last_name`/`client_number`, hay que dropear la versión
-- vieja primero.
drop view if exists client_stats;

create view client_stats as
with visit_gaps as (
  select
    v.client_id,
    v.visit_date,
    v.price_charged,
    v.visit_date - lag(v.visit_date) over (
      partition by v.client_id order by v.visit_date
    ) as days_since_previous_visit
  from visits v
)
select
  c.id as client_id,
  c.first_name,
  c.last_name,
  c.client_number,
  count(vg.visit_date) as total_visits,
  max(vg.visit_date) as last_visit_date,
  (current_date - max(vg.visit_date)) as days_since_last_visit,
  coalesce(sum(vg.price_charged), 0) as total_spent,
  round(avg(vg.days_since_previous_visit)) as avg_days_between_visits
from clients c
left join visit_gaps vg on vg.client_id = c.id
group by c.id, c.first_name, c.last_name, c.client_number;

comment on view client_stats is
  'Estadísticas calculadas por cliente para detectar frecuencia y disparar alertas. '
  'No es una tabla: se recalcula en cada consulta a partir de visits.';

-- Recién acá es seguro dropear full_name (sección 2.1): client_stats, la
-- única vista que dependía de esa columna, ya quedó redefinida arriba sin
-- usarla.
alter table clients drop column if exists full_name;

-- Cliente comodín para cortes casuales, legajo 0000 (sección 2.1). Va acá
-- y no más arriba porque necesita que full_name ya esté dropeada (si
-- todavía existiera como not null sin default, este insert fallaría).
-- Se busca igual que cualquier otro cliente (por legajo), sin lógica
-- especial en la app.
insert into clients (first_name, last_name, client_number, is_generic, active)
select 'Cliente', 'Genérico', 0, true, true
where not exists (select 1 from clients where client_number = 0);

-- ============================================================================
-- 8. SUCURSALES (preparado a futuro — hoy hay una sola)
-- ============================================================================
-- No es un requerimiento actual, pero es barato dejarlo preparado ahora y
-- caro agregarlo después si en algún momento se abre una segunda sucursal.
-- branch_id es nullable en todos lados: mientras haya una sola sucursal, la
-- app puede simplemente no pedirlo en los formularios.

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table branches is 'Sucursales del negocio. Hoy existe una sola.';

create unique index if not exists uq_branches_name on branches (name);

insert into branches (name)
values ('Sucursal principal')
on conflict (name) do nothing;

alter table barbers add column if not exists branch_id uuid references branches (id);
alter table clients add column if not exists branch_id uuid references branches (id);
alter table visits add column if not exists branch_id uuid references branches (id);

-- ============================================================================
-- 9. RETAIL / INVENTARIO DE PRODUCTOS
-- ============================================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  price numeric(10, 2) not null check (price >= 0),
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table products is 'Productos de reventa (ceras, shampoos, etc.).';

-- Registro de ventas de producto. Mismo patrón que visits.price_charged:
-- el precio se copia al momento de la venta y queda congelado, aunque el
-- precio de lista del producto cambie después.
create table if not exists product_sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete restrict,
  client_id uuid references clients (id) on delete set null,
  barber_id uuid references barbers (id) on delete set null,
  visit_id uuid references visits (id) on delete set null, -- opcional: vincular la venta a un corte
  quantity int not null default 1 check (quantity > 0),
  unit_price_charged numeric(10, 2) not null check (unit_price_charged >= 0),
  sold_at timestamptz not null default now()
);

comment on table product_sales is 'Ventas de producto, con precio congelado al momento de la venta.';

create index if not exists idx_product_sales_product_id on product_sales (product_id);
create index if not exists idx_product_sales_client_id on product_sales (client_id);

-- ============================================================================
-- 10. COMISIONES Y PROPINAS
-- ============================================================================

alter table barbers add column if not exists commission_rate numeric(5, 2)
  check (commission_rate is null or (commission_rate >= 0 and commission_rate <= 100));

comment on column barbers.commission_rate is
  'Porcentaje de comisión del barbero sobre el precio de los servicios. Null = sin comisión automática configurada.';

alter table visits add column if not exists tip_amount numeric(10, 2) not null default 0
  check (tip_amount >= 0);

comment on column visits.tip_amount is 'Propina cobrada en esa visita, aparte del precio del servicio.';

-- Vista de ingresos por barbero: cortes, propinas y comisión estimada.
create or replace view barber_earnings as
select
  b.id as barber_id,
  b.full_name,
  count(v.id) as total_visits,
  coalesce(sum(v.price_charged), 0) as total_services_revenue,
  coalesce(sum(v.tip_amount), 0) as total_tips,
  b.commission_rate,
  round(coalesce(sum(v.price_charged), 0) * coalesce(b.commission_rate, 0) / 100, 2) as estimated_commission
from barbers b
left join visits v on v.barber_id = b.id
group by b.id, b.full_name, b.commission_rate;

comment on view barber_earnings is
  'Ingresos, propinas y comisión estimada por barbero. estimated_commission es 0 si el barbero no tiene commission_rate configurado.';

-- ============================================================================
-- 11. PERFIL DE CLIENTE ENRIQUECIDO
-- ============================================================================

alter table clients add column if not exists photo_url text;
alter table clients add column if not exists preferred_style text;

comment on column clients.photo_url is 'Foto de referencia del cliente (ej. último corte), opcional.';
comment on column clients.preferred_style is 'Notas de estilo preferido del cliente, en texto libre.';

-- ============================================================================
-- 12. FIDELIZACIÓN (PUNTOS)
-- ============================================================================
-- Se modela como historial de eventos (no un contador simple en clients) para
-- que quede auditable y no se pueda desalinear con la realidad.

create table if not exists loyalty_point_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  points_delta int not null, -- positivo = suma puntos, negativo = canje
  reason text,
  visit_id uuid references visits (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table loyalty_point_events is 'Historial de puntos de fidelización por cliente (suma y canje).';

create index if not exists idx_loyalty_point_events_client_id on loyalty_point_events (client_id);

create or replace view client_loyalty_balance as
select client_id, coalesce(sum(points_delta), 0) as points_balance
from loyalty_point_events
group by client_id;

comment on view client_loyalty_balance is 'Saldo de puntos vigente por cliente, calculado a partir del historial.';

-- ============================================================================
-- 13. COLA DE ESPERA / WALK-INS
-- ============================================================================

create table if not exists waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients (id) on delete set null, -- null = walk-in sin ficha todavía
  walk_in_name text, -- nombre anotado a mano si la persona no está registrada como cliente
  preferred_barber_id uuid references barbers (id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting', 'in_service', 'done', 'cancelled')),
  joined_at timestamptz not null default now(),
  called_at timestamptz,
  finished_at timestamptz,
  check (client_id is not null or walk_in_name is not null)
);

comment on table waitlist_entries is 'Cola de clientes esperando ser atendidos (con o sin turno agendado).';

create index if not exists idx_waitlist_entries_status on waitlist_entries (status);

-- ============================================================================
-- 14. REGISTRO DE NOTIFICACIONES (recordatorios / reactivación)
-- ============================================================================
-- Esta tabla es solo el LOG de qué se le mandó a cada cliente y cuándo. El
-- envío real requiere integrar un proveedor externo (Twilio, WhatsApp
-- Business API, etc.) — eso es un desarrollo aparte, no parte de este schema.

create table if not exists client_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms', 'email', 'other')),
  message_type text not null check (message_type in ('appointment_reminder', 'reactivation', 'promo', 'other')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  related_alert_rule_id uuid references alert_rules (id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table client_notifications is
  'Log/cola de recordatorios y mensajes de reactivación por cliente. No envía nada por sí sola.';

create index if not exists idx_client_notifications_client_id on client_notifications (client_id);

-- ============================================================================
-- 15. updated_at automático (barbers, clients, services, products)
-- ============================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_barbers_updated_at on barbers;
create trigger trg_barbers_updated_at
  before update on barbers
  for each row execute function set_updated_at();

drop trigger if exists trg_clients_updated_at on clients;
create trigger trg_clients_updated_at
  before update on clients
  for each row execute function set_updated_at();

drop trigger if exists trg_services_updated_at on services;
create trigger trg_services_updated_at
  before update on services
  for each row execute function set_updated_at();

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- ============================================================================
-- 16. ROW LEVEL SECURITY (borrador inicial)
-- ============================================================================
-- Por ahora se deja RLS habilitado con una política abierta para usuarios
-- autenticados, como punto de partida. Falta definir roles reales (admin vs
-- barbero) antes de ir a producción. VERIFICAR sintaxis de auth.uid() /
-- roles contra la documentación actual de Supabase antes de usar esto tal cual.

alter table barbers enable row level security;
alter table clients enable row level security;
alter table client_contact_channels enable row level security;
alter table client_barber_preferences enable row level security;
alter table services enable row level security;
alter table service_prices enable row level security;
alter table visits enable row level security;
alter table alert_rules enable row level security;
alter table branches enable row level security;
alter table products enable row level security;
alter table product_sales enable row level security;
alter table loyalty_point_events enable row level security;
alter table waitlist_entries enable row level security;
alter table client_notifications enable row level security;

-- Política provisoria: cualquier usuario autenticado puede leer y escribir.
-- TODO: reemplazar por políticas separadas por rol (admin / barbero) cuando
-- se defina el modelo de roles definitivo (ver "Preguntas abiertas" en CLAUDE.md).
do $$
declare
  t text;
begin
  foreach t in array array[
    'barbers', 'clients', 'client_contact_channels',
    'client_barber_preferences', 'services', 'service_prices',
    'visits', 'alert_rules', 'branches', 'products', 'product_sales',
    'loyalty_point_events', 'waitlist_entries', 'client_notifications'
  ]
  loop
    execute format(
      'drop policy if exists "authenticated_full_access" on %I;', t
    );
    execute format(
      'create policy "authenticated_full_access" on %I '
      'for all to authenticated using (true) with check (true);', t
    );
  end loop;
end $$;

-- ============================================================================
-- FIN — versión 0.1
-- ============================================================================
