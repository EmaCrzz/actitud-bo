-- Limpieza de los datos que deja la suite e2e.
--
-- Criterio: el prefijo '[E2E]' en `customers.first_name` y, desde la Fase 10,
-- en `types_memberships.name`. Ese prefijo lo pone `e2e/support/data.ts` y es
-- la razón por la que existe — sin él no habría forma de distinguir un dato de
-- test de uno real, porque la DB de dev es un backup de producción.
--
-- El orden importa: primero las filas que referencian al cliente, después el
-- cliente, y **los planes al final**. Desde la migración 20260928110544 la FK
-- de `customer_membership.membership_type` es ON DELETE RESTRICT, así que
-- borrar un plan antes que las membresías que lo usan falla — que es
-- exactamente para lo que se puso.
--
-- En LIKE de Postgres los corchetes son literales, así que '[E2E]%' matchea
-- exactamente lo que parece.

BEGIN;

CREATE TEMP TABLE e2e_victims AS
SELECT id FROM customers WHERE first_name LIKE '[E2E]%';

\echo 'Clientes de test encontrados:'
SELECT count(*) AS clientes FROM e2e_victims;

DELETE FROM membership_payments WHERE customer_id IN (SELECT id FROM e2e_victims);
DELETE FROM assistance          WHERE customer_id IN (SELECT id FROM e2e_victims);
DELETE FROM customer_membership WHERE customer_id IN (SELECT id FROM e2e_victims);
DELETE FROM customer_group_members WHERE customer_id IN (SELECT id FROM e2e_victims);
DELETE FROM customers           WHERE id IN (SELECT id FROM e2e_victims);

-- Planes creados por el spec de membresías. Van al final por la FK RESTRICT.
-- Si alguno quedara referenciado por una membresía que no es de test, el
-- DELETE falla y aborta la transacción — preferible a borrarla en silencio.
\echo 'Planes de test encontrados:'
SELECT count(*) AS planes FROM types_memberships WHERE name LIKE '[E2E]%';

DELETE FROM types_memberships WHERE name LIKE '[E2E]%';

COMMIT;

\echo 'Limpieza completada.'
