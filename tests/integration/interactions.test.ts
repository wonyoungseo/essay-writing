import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import type { Viewer } from "@/lib/permissions";
import { createComment, deleteComment, listComments, listCommentsByAuthor, listCommentsOnMyPosts, updateComment } from "@/features/comments/service";
import { countUnread, listNotifications, markRead } from "@/features/notifications/service";
import { updatePost } from "@/features/posts/service";
import { createHighlight, deleteHighlight, listHighlightsForPost, listMyHighlights } from "@/features/highlights/service";
import { buildAnchor } from "@/features/highlights/anchor";
import { createReport, listReports, resolveReport } from "@/features/reports/service";
import { getPostForViewer } from "@/features/posts/service";
import { expectAppError, makePost, makeUser, resetDb } from "./helpers";

let author: Viewer;
let reader: Viewer;
let admin: Viewer;
let postId: string;

beforeEach(async () => {
  await resetDb();
  author = await makeUser("Author");
  reader = await makeUser("Reader");
  admin = await makeUser("Admin", "admin");
  postId = (await makePost(author)).id;
});

describe("댓글", () => {
  it("작성, 조회, 수정, 삭제", async () => {
    const c = await createComment(reader, { postId, content: "  마음에 남는 글이에요  " });
    expect(c.content).toBe("마음에 남는 글이에요");
    expect(await listComments(null, postId)).toHaveLength(1);
    await updateComment(reader, { commentId: c.id, content: "수정한 감상" });
    expect((await listComments(null, postId))[0].content).toBe("수정한 감상");
    await deleteComment(reader, c.id);
    expect(await listComments(null, postId)).toHaveLength(0);
  });

  it("다른 사람의 댓글은 수정/삭제할 수 없고, 관리자는 삭제만 할 수 있다", async () => {
    const c = await createComment(reader, { postId, content: "감상" });
    await expectAppError(updateComment(author, { commentId: c.id, content: "x" }), "FORBIDDEN");
    await expectAppError(deleteComment(author, c.id), "FORBIDDEN");
    await expectAppError(updateComment(admin, { commentId: c.id, content: "x" }), "FORBIDDEN");
    await deleteComment(admin, c.id);
    expect(await listComments(null, postId)).toHaveLength(0);
  });

  it("볼 수 없는 비공개 글에는 댓글을 달 수 없다", async () => {
    const { id } = await makePost(author, { visibility: "private" });
    await expectAppError(createComment(reader, { postId: id, content: "몰래" }), "NOT_FOUND");
    await expectAppError(listComments(reader, id), "NOT_FOUND");
  });

  it("빈 댓글은 거부한다", async () => {
    await expectAppError(createComment(reader, { postId, content: "   " }), "VALIDATION");
  });

  it("내가 남긴/받은 피드백 목록", async () => {
    await createComment(reader, { postId, content: "독자의 감상" });
    await createComment(author, { postId, content: "작가의 답글" });
    expect((await listCommentsByAuthor(reader)).map((c) => c.content)).toEqual(["독자의 감상"]);
    expect((await listCommentsOnMyPosts(author)).length).toBe(2);
    expect(await listCommentsOnMyPosts(reader)).toHaveLength(0);
  });
});

describe("하이라이트", () => {
  async function anchorFor(text: string) {
    const post = await getPostForViewer(reader, postId);
    const start = post!.contentText.indexOf(text);
    expect(start).toBeGreaterThanOrEqual(0);
    return { postId, ...buildAnchor(post!.contentText, start, start + text.length) };
  }

  it("저장, 다시 방문 시 조회, 삭제", async () => {
    const { highlight, duplicate } = await createHighlight(reader, await anchorFor("강조된 문장"));
    expect(duplicate).toBe(false);
    expect(highlight.selectedText).toBe("강조된 문장");
    expect(await listHighlightsForPost(reader, postId)).toHaveLength(1);
    const mine = await listMyHighlights(reader);
    expect(mine.items[0]).toMatchObject({ selectedText: "강조된 문장", postTitle: "테스트 에세이", orphaned: false });
    await deleteHighlight(reader, highlight.id);
    expect(await listHighlightsForPost(reader, postId)).toHaveLength(0);
  });

  it("같은 구간을 다시 저장하면 중복으로 처리한다", async () => {
    const input = await anchorFor("첫 번째 문단입니다.");
    await createHighlight(reader, input);
    const again = await createHighlight(reader, input);
    expect(again.duplicate).toBe(true);
    expect(await listHighlightsForPost(reader, postId)).toHaveLength(1);
  });

  it("본문에 없는 텍스트는 저장을 거부한다", async () => {
    await expectAppError(
      createHighlight(reader, { postId, selectedText: "본문에 없는 말", startOffset: 0, endOffset: 7, contextBefore: "", contextAfter: "" }),
      "VALIDATION",
    );
  });

  it("오프셋이 어긋나도 같은 문장이 있으면 서버 기준 위치로 보정한다", async () => {
    const input = await anchorFor("강조된 문장");
    const { highlight } = await createHighlight(reader, { ...input, startOffset: 0, endOffset: input.selectedText.length });
    expect(highlight.startOffset).toBe(input.startOffset);
  });

  it("다른 사용자의 하이라이트는 보이지 않고 삭제할 수 없다", async () => {
    const { highlight } = await createHighlight(reader, await anchorFor("강조된 문장"));
    expect(await listHighlightsForPost(author, postId)).toHaveLength(0);
    expect((await listMyHighlights(author)).items).toHaveLength(0);
    await expectAppError(deleteHighlight(author, highlight.id), "NOT_FOUND");
    await expectAppError(deleteHighlight(admin, highlight.id), "NOT_FOUND");
    expect(await listHighlightsForPost(reader, postId)).toHaveLength(1);
  });

  it("본문이 바뀌어 문장이 사라지면 복원 실패(orphaned)로 표시한다", async () => {
    await createHighlight(reader, await anchorFor("강조된 문장"));
    await updatePost(author, postId, { title: "테스트 에세이", content: "완전히 새로 쓴 본문", tags: [], visibility: "public", sourceFormat: "markdown" });
    const mine = await listMyHighlights(reader);
    expect(mine.items[0].orphaned).toBe(true);
    expect(mine.items[0].selectedText).toBe("강조된 문장");
  });

  it("글이 비공개로 바뀌면 하이라이트 목록에서 숨긴다", async () => {
    await createHighlight(reader, await anchorFor("강조된 문장"));
    await updatePost(author, postId, { title: "테스트 에세이", content: "첫 번째 문단입니다.", tags: [], visibility: "private", sourceFormat: "markdown" });
    const mine = await listMyHighlights(reader);
    expect(mine.items).toHaveLength(0);
    expect(mine.hiddenCount).toBe(1);
  });

  it("하이라이트 검색", async () => {
    await createHighlight(reader, await anchorFor("강조된 문장"));
    await createHighlight(reader, await anchorFor("목록 하나"));
    expect((await listMyHighlights(reader, { q: "목록" })).items.map((h) => h.selectedText)).toEqual(["목록 하나"]);
  });
});

describe("알림", () => {
  it("다른 사람의 댓글은 알림을 만들고, 본인 활동은 만들지 않는다", async () => {
    await createComment(reader, { postId, content: "감상" });
    await createComment(admin, { postId, content: "다른 감상" });
    await createComment(author, { postId, content: "내 글에 내 댓글" });
    const list = await listNotifications(author);
    expect(list.map((n) => n.type)).toEqual(["comment", "comment"]);
    expect(await countUnread(author)).toBe(2);
    expect(await countUnread(reader)).toBe(0);
  });

  it("읽음 처리는 본인 알림에만 적용된다", async () => {
    await createComment(reader, { postId, content: "감상" });
    const [n] = await listNotifications(author);
    await markRead(reader, n.id); // 다른 사람: 효과 없음
    expect(await countUnread(author)).toBe(1);
    await markRead(author, n.id);
    expect(await countUnread(author)).toBe(0);
    const rows = await db.select().from(notifications);
    expect(rows).toHaveLength(1);
  });
});

describe("신고", () => {
  it("신고 접수, 중복 방지, 관리자 처리", async () => {
    await createReport(reader, { postId, reason: "부적절한 내용" });
    await expectAppError(createReport(reader, { postId, reason: "또" }), "CONFLICT");
    await expectAppError(createReport(author, { postId, reason: "내 글" }), "VALIDATION");
    await expectAppError(listReports(reader), "FORBIDDEN");
    const [report] = await listReports(admin);
    expect(report.reason).toBe("부적절한 내용");
    await expectAppError(resolveReport(reader, report.id, "resolved"), "FORBIDDEN");
    await resolveReport(admin, report.id, "resolved");
    expect(await listReports(admin, "open")).toHaveLength(0);
    expect(await listReports(admin, "resolved")).toHaveLength(1);
  });

  it("댓글 신고는 해당 글의 댓글만 가능", async () => {
    const c = await createComment(author, { postId, content: "작가 댓글" });
    const other = await makePost(author);
    await expectAppError(createReport(reader, { postId: other.id, commentId: c.id, reason: "x" }), "NOT_FOUND");
    await createReport(reader, { postId, commentId: c.id, reason: "욕설" });
    expect((await listReports(admin))[0].targetType).toBe("comment");
  });
});
