import { log } from "@tts/core";
import { syncCampaignReports } from "@tts/marketing";
import { runForever } from "@tts/scheduler";
import { buildContext } from "./context.js";

/**
 * The always-on worker: "khi bật máy server không tắt".
 *
 * Three independent cadences run concurrently, each wrapped so a single failed
 * cycle never crashes the process:
 *
 *   - content dispatcher : drains due scheduled posts (default every 60s)
 *   - report sync        : pulls the last few days of ad reports (default hourly)
 *   - budget automation  : evaluates rules against the fresh snapshot (default 6h)
 *
 * The process stays alive until it receives SIGINT/SIGTERM, at which point the
 * loops are asked to stop via an AbortController and the DB is left consistent.
 */

const ctx = buildContext();

const DISPATCH_INTERVAL_MS = Number(process.env.TTS_DISPATCH_INTERVAL_MS ?? 60_000);
const REPORT_INTERVAL_MS = Number(process.env.TTS_REPORT_INTERVAL_MS ?? 3_600_000);
const AUTOMATION_INTERVAL_MS = Number(process.env.TTS_AUTOMATION_INTERVAL_MS ?? 21_600_000);

const controller = new AbortController();

function ymd(offsetDays: number): string {
  return new Date(Date.now() - offsetDays * 86400_000).toISOString().slice(0, 10);
}

/** Run `fn` now and then every `intervalMs`, swallowing per-cycle errors. */
function everyInterval(name: string, intervalMs: number, fn: () => Promise<void>): void {
  const cycle = async () => {
    if (controller.signal.aborted) return;
    try {
      await fn();
    } catch (err) {
      log.error(`${name} cycle failed`, { error: err instanceof Error ? err.message : String(err) });
    }
  };
  void cycle();
  const handle = setInterval(cycle, intervalMs);
  controller.signal.addEventListener("abort", () => clearInterval(handle));
}

async function reportSync(): Promise<void> {
  const summary = await syncCampaignReports(
    ctx.marketing,
    ctx.db,
    ctx.marketing.advertiserId,
    ymd(3),
    ymd(0),
  );
  log.info("worker report sync", { ...summary });
}

async function automation(): Promise<void> {
  const decisions = await ctx.automation.run();
  const fired = decisions.filter((d) => d.fired).length;
  log.info("worker automation run", { evaluated: decisions.length, fired, dryRun: ctx.cfg.dryRun });
}

function shutdown(sig: string): void {
  log.info("worker shutting down", { signal: sig });
  controller.abort();
  // Give in-flight ticks a moment, then exit.
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (err) => {
  log.error("uncaughtException (worker stays up)", { error: err.message });
});
process.on("unhandledRejection", (reason) => {
  log.error("unhandledRejection (worker stays up)", { reason: String(reason) });
});

log.info("worker starting", {
  dryRun: ctx.cfg.dryRun,
  dispatchMs: DISPATCH_INTERVAL_MS,
  reportMs: REPORT_INTERVAL_MS,
  automationMs: AUTOMATION_INTERVAL_MS,
});

everyInterval("report-sync", REPORT_INTERVAL_MS, reportSync);
everyInterval("automation", AUTOMATION_INTERVAL_MS, automation);

// The dispatcher loop keeps the event loop busy for the lifetime of the process.
void runForever(ctx.dispatcher, DISPATCH_INTERVAL_MS, controller.signal);
