/**
 * 개발용 데모 데이터. (운영 환경에서 실행하지 마세요)
 *   npm run db:seed
 * 데모 계정: writer@example.com / reader@example.com (비밀번호: demo-pass-1234)
 */
import "./env";
import { eq } from "drizzle-orm";

const DEMO_PASSWORD = "demo-pass-1234";

const ESSAYS = [
  {
    title: "아침 일곱 시의 부엌",
    tags: ["일상", "기록"],
    content: `물이 끓기 시작하는 소리는 하루 중 가장 정직한 소리다. 아무것도 꾸미지 않고, 아무것도 서두르지 않는다.

나는 그 소리를 들으며 오늘 해야 할 일을 하나씩 떠올린다. 대부분은 어제 하지 못한 일들이다. 미뤄 둔 일들은 이상하게도 아침에는 조금 가벼워 보인다.

창문 너머로 이웃집 고양이가 담장을 걷는다. 고양이에게도 해야 할 일이 있을까. 아마 그 일은 지금 저 담장을 끝까지 걷는 것일 테다.

**좋은 하루는 대단한 일로 시작되지 않는다.** 따뜻한 물 한 잔, 그리고 그 물을 기다리는 몇 분이면 충분하다.`,
  },
  {
    title: "오래된 편지를 정리하며",
    tags: ["관계", "기억"],
    content: `서랍 맨 아래 칸에서 편지 묶음을 발견했다. 고무줄은 삭아서 손을 대자마자 끊어졌다.

## 글씨는 사람을 닮는다

친구의 글씨는 여전히 오른쪽으로 기울어 있었다. 그 애는 늘 무언가를 향해 달려가는 사람이었다. 편지 속 문장들도 숨이 찼다.

> 우리가 어른이 되면, 지금 이 마음을 기억할 수 있을까?

그 질문에 나는 아직 답을 하지 못했다. 다만 기억하려고 애쓰는 마음만큼은, 그때와 다르지 않다는 것을 안다.

편지를 다시 묶으며 생각했다. 버리지 못하는 물건은 대개 물건이 아니라 시간이다.`,
  },
  {
    title: "낯선 도시에서 길을 잃는 법",
    tags: ["여행", "생각"],
    content: `지도를 끄고 걷기로 했다. 처음 십 분은 불안했고, 그다음 십 분은 조금 즐거웠다.

길을 잃는다는 것은 목적지를 잃는다는 뜻이지, 길 자체를 잃는다는 뜻은 아니다. 발아래의 길은 언제나 어딘가로 이어져 있었다.

- 빵 냄새가 나는 골목
- 빨래가 널린 좁은 계단
- 아무도 앉지 않은 공원 벤치

그날 내가 본 것들은 어떤 안내서에도 나오지 않았다. 그리고 나는 그것들을 가장 오래 기억하고 있다.`,
  },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("운영 환경에서는 데모 데이터를 넣을 수 없습니다.");
    process.exit(1);
  }
  const { auth } = await import("@/lib/auth/auth");
  const { db, pool } = await import("@/lib/db");
  const { users, posts } = await import("@/lib/db/schema");
  const { createPost } = await import("@/features/posts/service");
  const { createComment } = await import("@/features/comments/service");

  async function ensureUser(email: string, name: string) {
    const [found] = await db.select().from(users).where(eq(users.email, email));
    if (found) return found;
    await auth.api.createUser({ body: { email, name, password: DEMO_PASSWORD, role: "user" } });
    const [created] = await db.select().from(users).where(eq(users.email, email));
    return created;
  }
  const toViewer = (u: typeof users.$inferSelect) => ({ id: u.id, name: u.name, email: u.email, role: "user" as const, banned: false });

  const writer = toViewer(await ensureUser("writer@example.com", "윤서"));
  const reader = toViewer(await ensureUser("reader@example.com", "한결"));

  const already = await db.select({ id: posts.id }).from(posts).where(eq(posts.authorId, writer.id));
  if (already.length > 0) {
    console.log("데모 글이 이미 있습니다. 건너뜁니다.");
  } else {
    for (const [i, essay] of ESSAYS.entries()) {
      const { id } = await createPost(writer, { ...essay, visibility: "public", sourceFormat: "markdown" });
      if (i < 2) {
        await createComment(reader, { postId: id, content: i === 0 ? "아침의 물 끓는 소리를 이렇게 표현할 수 있다니, 오늘 아침이 조금 다르게 느껴졌어요." : "‘버리지 못하는 물건은 대개 시간이다’라는 문장이 오래 남네요." });
      }
    }
    await createPost(writer, {
      title: "아직 다듬는 중인 글",
      tags: ["초고"],
      content: "이 글은 비공개입니다. 작성자 본인만 볼 수 있습니다.",
      visibility: "private",
      sourceFormat: "markdown",
    });
    console.log("✓ 데모 글 4편(공개 3, 비공개 1)과 댓글을 만들었습니다.");
  }
  console.log(`데모 계정: writer@example.com, reader@example.com / 비밀번호 ${DEMO_PASSWORD}`);
  await pool.end();
}

main().catch((err) => {
  console.error("시드 실패:", err);
  process.exit(1);
});
