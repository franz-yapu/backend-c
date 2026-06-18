-- Elimina las entidades de PLANTILLA que no pertenecen al flujo de subasta de café:
-- product, categoria (Category) y marca (Marca). "product" referencia a las otras
-- dos (y a user), así que se dropea primero para no violar las FKs.
DROP TABLE IF EXISTS "public"."product";
DROP TABLE IF EXISTS "public"."categoria";
DROP TABLE IF EXISTS "public"."marca";
