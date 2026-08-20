import { type Db } from "@tts/core";

/**
 * SQLite-backed queue of scheduled posts. Pure data access — no network.
 */

export type PostStatus = "pending" | "publishing" | "posted" | "failed" | "canceled";

export interface ScheduledPost {
  id: number;
  caption: string;
  videoUrl: string | null;
  productIds: string[];
  scheduledAt: number;
  status: PostStatus;
  publishId: string | null;
  error: string | null;
  createdAt: number;
  postedAt: number | null;
}

interface PostRow {
  id: number;
  caption: string;
  video_url: string | null;
  product_ids: string | null;
  scheduled_at: number;
  status: string;
  publish_id: string | null;
  error: string | null;
  created_at: number;
  posted_at: number | null;
}

function toPost(row: PostRow): ScheduledPost {
  return {
    id: row.id,
    caption: row.caption,
    videoUrl: row.video_url,
    productIds: row.product_ids ? (JSON.parse(row.product_ids) as string[]) : [],
    scheduledAt: row.scheduled_at,
    status: row.status as PostStatus,
    publishId: row.publish_id,
    error: row.error,
    createdAt: row.created_at,
    postedAt: row.posted_at,
  };
}

export interface NewPost {
  caption: string;
  videoUrl?: string;
  productIds?: string[];
  scheduledAt: number;
}

export function enqueue(db: Db, post: NewPost): number {
  const info = db
    .prepare(
      `INSERT INTO scheduled_posts (caption, video_url, product_ids, scheduled_at, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      post.caption,
      post.videoUrl ?? null,
      post.productIds ? JSON.stringify(post.productIds) : null,
      post.scheduledAt,
      Date.now(),
    );
  return Number(info.lastInsertRowid);
}

export function listPosts(db: Db, status?: PostStatus): ScheduledPost[] {
  const rows = (
    status
      ? db.prepare(`SELECT * FROM scheduled_posts WHERE status = ? ORDER BY scheduled_at`).all(status)
      : db.prepare(`SELECT * FROM scheduled_posts ORDER BY scheduled_at DESC`).all()
  ) as PostRow[];
  return rows.map(toPost);
}

/** Posts that are pending and due (scheduled_at <= now). */
export function duePosts(db: Db, now = Date.now()): ScheduledPost[] {
  const rows = db
    .prepare(`SELECT * FROM scheduled_posts WHERE status = 'pending' AND scheduled_at <= ? ORDER BY scheduled_at`)
    .all(now) as PostRow[];
  return rows.map(toPost);
}

export function markStatus(
  db: Db,
  id: number,
  status: PostStatus,
  fields: { publishId?: string; error?: string; postedAt?: number } = {},
): void {
  db.prepare(
    `UPDATE scheduled_posts
       SET status = ?, publish_id = COALESCE(?, publish_id), error = ?, posted_at = COALESCE(?, posted_at)
     WHERE id = ?`,
  ).run(status, fields.publishId ?? null, fields.error ?? null, fields.postedAt ?? null, id);
}

export function cancel(db: Db, id: number): void {
  db.prepare(`UPDATE scheduled_posts SET status = 'canceled' WHERE id = ? AND status = 'pending'`).run(id);
}
