import { recordRun, log, type Db } from "@tts/core";
import { ContentApi } from "./client.js";
import { duePosts, markStatus, type ScheduledPost } from "./queue.js";

/**
 * The dispatcher: on each tick, publish every due post via the Content Posting
 * API. Designed to be called on an interval by a long-running worker so the
 * server "does not turn off" — it keeps draining the queue as posts come due.
 *
 * Dry-run logs the intended publish without calling TikTok.
 */

export interface DispatchResult {
  processed: number;
  published: number;
  failed: number;
}

export class Dispatcher {
  constructor(
    private readonly api: ContentApi,
    private readonly db: Db,
    private readonly dryRun: boolean,
  ) {}

  async tick(now = Date.now()): Promise<DispatchResult> {
    const due = duePosts(this.db, now);
    let published = 0;
    let failed = 0;

    for (const post of due) {
      try {
        await this.publishOne(post);
        published++;
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : String(err);
        markStatus(this.db, post.id, "failed", { error: message });
        recordRun(this.db, {
          module: "scheduler",
          action: "publish_failed",
          target: String(post.id),
          dryRun: this.dryRun,
          detail: { error: message },
        });
        log.error("publish failed", { postId: post.id, error: message });
      }
    }
    return { processed: due.length, published, failed };
  }

  private async publishOne(post: ScheduledPost): Promise<void> {
    if (!post.videoUrl) {
      throw new Error("post has no video_url");
    }
    recordRun(this.db, {
      module: "scheduler",
      action: "publish",
      target: String(post.id),
      dryRun: this.dryRun,
      detail: { caption: post.caption, scheduledAt: post.scheduledAt },
    });

    if (this.dryRun) {
      markStatus(this.db, post.id, "posted", { postedAt: Date.now(), publishId: "dry-run" });
      log.info("scheduler dry-run publish", { postId: post.id });
      return;
    }

    markStatus(this.db, post.id, "publishing");
    const publishId = await this.api.initDirectPost(post.caption, post.videoUrl);
    markStatus(this.db, post.id, "posted", { publishId, postedAt: Date.now() });
    log.info("scheduler published", { postId: post.id, publishId });
  }
}

/**
 * Run the dispatcher forever on an interval. This is the "keep the server
 * running" loop — it never resolves; stop it by terminating the process.
 */
export async function runForever(
  dispatcher: Dispatcher,
  intervalMs: number,
  signal?: AbortSignal,
): Promise<void> {
  log.info("dispatcher loop started", { intervalMs });
  while (!signal?.aborted) {
    try {
      const result = await dispatcher.tick();
      if (result.processed > 0) {
        log.info("dispatcher tick", { ...result });
      }
    } catch (err) {
      log.error("dispatcher tick error", { error: err instanceof Error ? err.message : String(err) });
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  log.info("dispatcher loop stopped");
}
