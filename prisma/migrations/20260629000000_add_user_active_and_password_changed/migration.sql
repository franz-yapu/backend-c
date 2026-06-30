-- AlterTable
ALTER TABLE "public"."user" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "password_changed_at" TIMESTAMP(3);

-- DropEnum
DROP TYPE "public"."UserRole";
