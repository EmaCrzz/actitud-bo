-- =============================================================================
-- Seed para entorno de desarrollo
-- =============================================================================
-- Pegar este archivo en el SQL Editor de Supabase (proyecto DEV).
--
-- Inserta:
--   * 100 customers (person_id con prefijo SEED-)
--   *  90 customer_membership: ~70% activos, ~20% vencidos. 10 sin membresía.
--   * Asistencias variadas por cliente, con assistance_count sincronizado.
--
-- Es idempotente: identifica los registros del seed por person_id LIKE 'SEED-%'
-- y los borra al inicio. Re-ejecutarlo no acumula filas. No toca registros
-- reales (los que no tengan ese prefijo).
-- =============================================================================

BEGIN;

-- 1. Limpieza previa (idempotencia) -------------------------------------------
DELETE FROM assistance
 WHERE customer_id IN (SELECT id FROM customers WHERE person_id LIKE 'SEED-%');

DELETE FROM customer_membership
 WHERE customer_id IN (SELECT id FROM customers WHERE person_id LIKE 'SEED-%');

DELETE FROM customers
 WHERE person_id LIKE 'SEED-%';

-- 2. Insertar 100 customers ---------------------------------------------------
WITH first_names AS (
  SELECT ARRAY[
    'Sofia','Mateo','Valentina','Santiago','Camila','Sebastian','Isabella','Nicolas',
    'Lucia','Daniel','Martina','Joaquin','Emma','Tomas','Renata','Benjamin',
    'Catalina','Lucas','Antonia','Maximo','Julieta','Bruno','Florencia','Felipe',
    'Mia','Agustin','Olivia','Diego','Emilia','Gabriel','Victoria','Alejandro',
    'Paula','Ignacio','Aitana','Hector','Romina','Javier','Bianca','Mauro',
    'Carolina','Andres','Delfina','Pablo','Constanza','Cristian','Anabella',
    'Lautaro','Mariana','Fernando','Sara','Rodrigo','Abril','Gonzalo','Magdalena'
  ] AS arr
),
last_names AS (
  SELECT ARRAY[
    'Gomez','Rodriguez','Fernandez','Lopez','Martinez','Sanchez','Perez','Diaz',
    'Romero','Ruiz','Suarez','Alvarez','Torres','Vega','Castro','Ortiz',
    'Ramirez','Flores','Rojas','Acosta','Medina','Cabrera','Herrera','Aguirre',
    'Molina','Silva','Vargas','Reyes','Mendoza','Cardenas','Salazar','Pena',
    'Lara','Campos','Sosa','Navarro'
  ] AS arr
),
nums AS (
  SELECT n
  FROM generate_series(1, 100) AS n
)
INSERT INTO customers (first_name, last_name, person_id, phone, email, assistance_count, created_at)
SELECT
  (SELECT arr[1 + ((n * 13) % array_length(arr, 1))] FROM first_names),
  (SELECT arr[1 + ((n * 7)  % array_length(arr, 1))] FROM last_names),
  'SEED-' || lpad(n::text, 7, '0'),
  CASE WHEN (n % 10) < 7
       THEN '+591 7' || lpad((((n * 73) % 10000000))::text, 7, '0')
       ELSE NULL
  END,
  CASE WHEN (n % 2) = 0
       THEN 'seed' || n || '@example.test'
       ELSE NULL
  END,
  0, -- assistance_count: se actualiza en el paso 4
  now() - (interval '1 day' * ((n * 3) % 365))
FROM nums;

-- 3. Insertar memberships (90 customers, 10 sin membresia) --------------------
-- Distribucion por tipo: ~30% VIP, ~30% 5_DAYS, ~25% 3_DAYS, ~15% DAILY
-- Distribucion por estado: ~70% activos, ~20% vencidos (sobre los 90)
WITH seeded AS (
  SELECT
    id,
    -- Ordeno por person_id para tener un ranking estable y reproducible
    row_number() OVER (ORDER BY person_id) AS rn
  FROM customers
  WHERE person_id LIKE 'SEED-%'
),
classified AS (
  SELECT
    id,
    rn,
    -- 10% (rn 91..100) NO recibe membresia
    CASE
      WHEN rn <= 30 THEN 'MEMBERSHIP_TYPE_VIP'
      WHEN rn <= 60 THEN 'MEMBERSHIP_TYPE_5_DAYS'
      WHEN rn <= 80 THEN 'MEMBERSHIP_TYPE_3_DAYS'
      WHEN rn <= 90 THEN 'MEMBERSHIP_TYPE_DAILY'
      ELSE NULL
    END AS membership_type,
    -- De los 90 con membresia, 70 activos y 20 vencidos
    CASE
      WHEN rn <= 70 THEN 'active'
      WHEN rn <= 90 THEN 'expired'
      ELSE NULL
    END AS status
  FROM seeded
)
INSERT INTO customer_membership (customer_id, membership_type, last_payment_date, expiration_date)
SELECT
  id,
  membership_type,
  CASE status
    WHEN 'active'  THEN (current_date - ((rn * 2) % 25 + 1) * interval '1 day')::date
    WHEN 'expired' THEN (current_date - ((rn * 3) % 50 + 30) * interval '1 day')::date
  END,
  CASE status
    WHEN 'active'  THEN (current_date + ((rn * 5) % 55 + 5) * interval '1 day')::date
    WHEN 'expired' THEN (current_date - ((rn * 2) % 50 + 1)  * interval '1 day')::date
  END
FROM classified
WHERE membership_type IS NOT NULL;

-- 4. Insertar asistencias -----------------------------------------------------
-- Para clientes ACTIVOS: 1-15 asistencias en los ultimos 30 dias
-- Para clientes VENCIDOS: 1-5 asistencias hace 60-90 dias
WITH seeded AS (
  SELECT
    c.id,
    cm.membership_type,
    cm.expiration_date,
    row_number() OVER (ORDER BY c.person_id) AS rn,
    CASE
      WHEN cm.expiration_date IS NULL THEN 'none'
      WHEN cm.expiration_date >= current_date THEN 'active'
      ELSE 'expired'
    END AS status
  FROM customers c
  LEFT JOIN customer_membership cm ON cm.customer_id = c.id
  WHERE c.person_id LIKE 'SEED-%'
),
visit_counts AS (
  SELECT
    id,
    status,
    rn,
    CASE status
      WHEN 'active'  THEN ((rn * 7) % 15) + 1   -- 1..15
      WHEN 'expired' THEN ((rn * 3) % 5)  + 1   -- 1..5
      ELSE 0
    END AS visits
  FROM seeded
),
expanded AS (
  SELECT
    v.id,
    v.status,
    v.rn,
    g.visit_index
  FROM visit_counts v
  CROSS JOIN LATERAL generate_series(1, v.visits) AS g(visit_index)
  WHERE v.visits > 0
)
INSERT INTO assistance (customer_id, assistance_date)
SELECT
  id,
  CASE status
    WHEN 'active'  THEN now() - (((rn + visit_index) * 31 % 30) || ' days')::interval
                              - ((visit_index * 47) % 12 || ' hours')::interval
    WHEN 'expired' THEN now() - (60 + ((rn + visit_index) * 13 % 30) || ' days')::interval
                              - ((visit_index * 29) % 12 || ' hours')::interval
  END
FROM expanded;

-- 5. Sincronizar assistance_count en customers --------------------------------
UPDATE customers c
SET assistance_count = sub.cnt
FROM (
  SELECT customer_id, count(*)::int AS cnt
  FROM assistance
  WHERE customer_id IN (SELECT id FROM customers WHERE person_id LIKE 'SEED-%')
  GROUP BY customer_id
) sub
WHERE c.id = sub.customer_id;

COMMIT;

-- =============================================================================
-- Verificacion
-- =============================================================================
SELECT
  'customers'           AS tabla, count(*) AS total
FROM customers WHERE person_id LIKE 'SEED-%'
UNION ALL
SELECT 'customer_membership', count(*) FROM customer_membership
WHERE customer_id IN (SELECT id FROM customers WHERE person_id LIKE 'SEED-%')
UNION ALL
SELECT 'assistance',          count(*) FROM assistance
WHERE customer_id IN (SELECT id FROM customers WHERE person_id LIKE 'SEED-%');
