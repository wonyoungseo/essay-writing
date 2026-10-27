-- 반응 기능 제거 (2026-10-27 요청): 반응 데이터와 반응 알림을 삭제한다
DROP TABLE "reactions" CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DELETE FROM "notifications" WHERE "type" = 'reaction';--> statement-breakpoint
DROP TYPE "public"."notification_type";--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('comment');--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE "public"."notification_type" USING "type"::"public"."notification_type";
