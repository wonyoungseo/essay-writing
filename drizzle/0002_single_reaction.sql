ALTER TABLE "reactions" DROP CONSTRAINT "reactions_emoji_allowed";--> statement-breakpoint
-- 반응 종류를 ✅ 하나로 축소: 기존 반응은 삭제하지 않고 ✅ 로 변환한다 (사용자당 1개 제약이라 충돌 없음)
UPDATE "reactions" SET "emoji" = '✅' WHERE "emoji" <> '✅';--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_emoji_allowed" CHECK ("reactions"."emoji" in ('✅'));
