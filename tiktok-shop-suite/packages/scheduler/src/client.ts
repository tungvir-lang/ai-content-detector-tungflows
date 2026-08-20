import { ContentClient, type ContentConfig, type Db } from "@tts/core";

/**
 * Content Posting API wrapper for publishing videos to the seller's own TikTok
 * account via the PULL_FROM_URL flow (TikTok fetches the hosted video file).
 *
 * The publish is a two-phase handshake: initialize returns a publish_id, then
 * status can be polled. Direct-post requires the app to hold the
 * video.publish scope and the account to be in good standing.
 */

export interface InitPublishResult {
  publish_id: string;
}

export interface PublishStatus {
  status: string;
  fail_reason?: string;
  publicaly_available_post_id?: string[];
}

export class ContentApi {
  private readonly content: ContentClient;

  constructor(cfg: ContentConfig, db: Db, accountId: string) {
    this.content = new ContentClient(cfg, db, accountId);
  }

  /**
   * Initialize a direct video post pulled from a public URL.
   *
   * @param caption   Post caption / title.
   * @param videoUrl  Publicly reachable URL of the video file (must be on a
   *                  domain verified in the TikTok developer portal).
   */
  async initDirectPost(caption: string, videoUrl: string): Promise<string> {
    const res = await this.content.post<{ data: InitPublishResult; error?: { code: string; message: string } }>(
      "/post/publish/video/init/",
      {
        post_info: {
          title: caption,
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_comment: false,
          disable_duet: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: videoUrl,
        },
      },
    );
    if (res.error && res.error.code !== "ok") {
      throw new Error(`Content init failed [${res.error.code}]: ${res.error.message}`);
    }
    return res.data.publish_id;
  }

  async getStatus(publishId: string): Promise<PublishStatus> {
    const res = await this.content.post<{ data: PublishStatus }>("/post/publish/status/fetch/", {
      publish_id: publishId,
    });
    return res.data;
  }
}
