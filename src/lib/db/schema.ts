import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* -------------------------------------------------------------------------- */
/* 인증 (Better Auth 관리 테이블)                                               */
/* 객체 키는 Better Auth 필드명, 컬럼명은 서비스 스키마(docs/erd.md)를 따른다.   */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("display_name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("avatar_url"),
    // admin 플러그인 필드: role = 'user' | 'admin', banned = 정지 상태
    role: text("role").notNull().default("user"),
    banned: boolean("banned").notNull().default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("users_display_name_idx").using("gin", sql`${t.name} gin_trgm_ops`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
    ...timestamps,
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("accounts_user_id_idx").on(t.userId)],
);

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

/* -------------------------------------------------------------------------- */
/* 서비스 도메인                                                               */
/* -------------------------------------------------------------------------- */

export const sourceFormat = pgEnum("source_format", ["docx", "markdown"]);
export const postVisibility = pgEnum("post_visibility", ["public", "private"]);
// hidden: 관리자가 숨김 처리한 글 (작성자 본인만 열람 가능)
export const postStatus = pgEnum("post_status", ["draft", "published", "hidden"]);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // 정규화된 본문 (Markdown). 렌더링 시 서버에서 sanitize 된 HTML 로 변환한다.
    content: text("content").notNull(),
    // 렌더링된 본문의 순수 텍스트. 검색/미리보기/하이라이트 검증에 사용한다.
    contentText: text("content_text").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    sourceFormat: sourceFormat("source_format").notNull(),
    // 원본 파일은 보관하지 않는다(docs/decisions.md). 확장 대비 컬럼만 유지.
    sourceFilePath: text("source_file_path"),
    visibility: postVisibility("visibility").notNull().default("public"),
    status: postStatus("status").notNull().default("published"),
    ...timestamps,
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    index("posts_author_idx").on(t.authorId, t.createdAt.desc()),
    index("posts_public_feed_idx")
      .on(t.publishedAt.desc())
      .where(sql`${t.status} = 'published' and ${t.visibility} = 'public'`),
    index("posts_title_trgm_idx").using("gin", sql`${t.title} gin_trgm_ops`),
    check("posts_title_length", sql`char_length(${t.title}) between 1 and 200`),
  ],
);

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postTags = pgTable(
  "post_tags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index("post_tags_tag_idx").on(t.tagId)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    ...timestamps,
  },
  (t) => [
    index("comments_post_idx").on(t.postId, t.createdAt),
    index("comments_author_idx").on(t.authorId, t.createdAt.desc()),
    check("comments_content_length", sql`char_length(${t.content}) between 1 and 3000`),
  ],
);

export const highlights = pgTable(
  "highlights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    selectedText: text("selected_text").notNull(),
    startOffset: integer("start_offset").notNull(),
    endOffset: integer("end_offset").notNull(),
    contextBefore: text("context_before").notNull().default(""),
    contextAfter: text("context_after").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // 정책: 같은 사용자가 같은 글의 같은 구간을 두 번 저장할 수 없다
    uniqueIndex("highlights_user_post_range_uq").on(t.userId, t.postId, t.startOffset, t.endOffset),
    index("highlights_user_created_idx").on(t.userId, t.createdAt.desc()),
    check("highlights_range_valid", sql`${t.startOffset} >= 0 and ${t.endOffset} > ${t.startOffset}`),
    check("highlights_text_length", sql`char_length(${t.selectedText}) between 1 and 1000`),
  ],
);

export const notificationType = pgEnum("notification_type", ["comment"]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").references(() => comments.id, { onDelete: "cascade" }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_recipient_idx").on(t.recipientId, t.isRead, t.createdAt.desc())],
);

export const reportTargetType = pgEnum("report_target_type", ["post", "comment"]);
export const reportStatus = pgEnum("report_status", ["open", "resolved", "dismissed"]);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: reportTargetType("target_type").notNull(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").references(() => comments.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    status: reportStatus("status").notNull().default("open"),
    resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // 같은 대상에 대한 중복 신고 방지 (comment_id 가 null 이면 글 신고)
    uniqueIndex("reports_reporter_target_uq").on(
      t.reporterId,
      t.postId,
      sql`coalesce(${t.commentId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
    ),
    index("reports_status_idx").on(t.status, t.createdAt.desc()),
    check("reports_reason_length", sql`char_length(${t.reason}) between 1 and 500`),
    check(
      "reports_target_consistency",
      sql`(${t.targetType} = 'post' and ${t.commentId} is null) or (${t.targetType} = 'comment' and ${t.commentId} is not null)`,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/* 관계                                                                        */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  postTags: many(postTags),
  comments: many(comments),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Highlight = typeof highlights.$inferSelect;
