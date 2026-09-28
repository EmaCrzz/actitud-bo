-- Limpieza de los datos que deja la suite e2e.
--
-- Criterio único: `customers.first_name` arranca con '[E2E]'. Ese prefijo lo
-- pone `e2e/support/data.ts` y es la razón por la que existe — sin él no habría
-- forma de distinguir un cliente de test de una persona real, porque la DB de
-- dev es un backup de producción.
--
-- El orden importa: primero las filas que referencian al cliente, después el
-- cliente. En LIKE de Postgres los corchetes son literales, así que '[E2E]%'
-- matchea exactamente lo que parece.

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

COMMIT;

\echo 'Limpieza completada.'
