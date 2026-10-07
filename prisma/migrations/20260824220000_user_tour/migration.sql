-- Tour del comprador: cuántas veces lo ha visto y si pidió no volver a verlo.
ALTER TABLE "public"."user" ADD COLUMN "tour_seen_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."user" ADD COLUMN "tour_dismissed" BOOLEAN NOT NULL DEFAULT false;
