-- Limpieza de los datos que deja la suite e2e.
--
-- Criterio: el prefijo '[E2E]' en `customers.first_name`, desde la Fase 10 en
-- `types_memberships.name` y desde 2026-10-02 en `discount_rules.name`. Ese
-- prefijo lo pone `e2e/support/data.ts` y es la razón por la que existe — sin
-- él no habría forma de distinguir un dato de test de uno real, porque la DB
-- de dev es un backup de producción.
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

-- Ventas de producto (Fase 12). Van antes que los clientes: la FK de
-- `sales.customer_id` es NO ACTION —borrar un cliente no puede borrar el
-- registro de que esa plata entró—, así que un cliente de test con una venta
-- no se podría borrar. Las ventas sin cliente se limpian por su detalle.
DELETE FROM sales WHERE customer_id IN (SELECT id FROM e2e_victims);
DELETE FROM sales WHERE description LIKE '[E2E]%';
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

-- Gastos creados por el spec de la Fase 11. No dependen de nada, así que el
-- orden acá da igual; van al final por seguir el mismo criterio del prefijo.
\echo 'Gastos de test encontrados:'
SELECT count(*) AS gastos FROM expenses WHERE description LIKE '[E2E]%';

DELETE FROM expenses WHERE description LIKE '[E2E]%';

-- Promociones creadas por el spec de renovación (2026-10-02). Van después de
-- los pagos: `membership_payments.discount_rule_id` es ON DELETE SET NULL, y un
-- pago con descuento que pierde su regla viola el CHECK que exige regla o
-- motivo. Borrados los pagos de test antes, no queda nada que las referencie.
\echo 'Promociones de test encontradas:'
SELECT count(*) AS promociones FROM discount_rules WHERE name LIKE '[E2E]%';

DELETE FROM discount_rules WHERE name LIKE '[E2E]%';

COMMIT;

\echo 'Limpieza completada.'
