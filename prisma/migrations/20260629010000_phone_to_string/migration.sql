-- AlterTable: phone pasa de INT a TEXT (admite +, espacios, ceros a la izquierda
-- y evita el desbordamiento de INT4 con números largos). Se castea lo existente.
ALTER TABLE "public"."user" ALTER COLUMN "phone" TYPE TEXT USING "phone"::text;
