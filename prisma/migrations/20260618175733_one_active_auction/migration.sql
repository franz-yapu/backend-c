-- Invariante "solo UNA subasta activa a la vez" a nivel de BASE DE DATOS.
-- Garantía atómica frente a activaciones concurrentes (race check-then-act).

-- 1) Saneo defensivo: si por el bug previo hubiera más de una activa, deja
--    activa solo la más reciente (por start_date). (0 o 1 activa => no-op.)
UPDATE "auctions" SET "isActive" = false
WHERE "isActive" = true
  AND id <> (
    SELECT id FROM "auctions" WHERE "isActive" = true
    ORDER BY "start_date" DESC
    LIMIT 1
  );

-- 2) Índice único PARCIAL: como mucho una fila con isActive = true.
CREATE UNIQUE INDEX "one_active_auction" ON "auctions" ("isActive") WHERE "isActive" = true;
