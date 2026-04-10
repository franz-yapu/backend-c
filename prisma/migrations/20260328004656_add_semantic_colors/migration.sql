-- AlterTable
ALTER TABLE "public"."branding" ADD COLUMN     "danger_color" TEXT NOT NULL DEFAULT '#EF4444',
ADD COLUMN     "info_color" TEXT NOT NULL DEFAULT '#3B82F6',
ADD COLUMN     "success_color" TEXT NOT NULL DEFAULT '#10B981',
ADD COLUMN     "surface_color" TEXT NOT NULL DEFAULT '#FFFFFF',
ADD COLUMN     "text_color" TEXT NOT NULL DEFAULT '#1F2937',
ADD COLUMN     "warning_color" TEXT NOT NULL DEFAULT '#F59E0B';
