import { spawn, type Subprocess } from "bun";
import { config, chromeCdpPort } from "../config";
import { cleanupChromeLocks } from "../cleanup";
import { log } from "../log";

export async function startChrome(): Promise<Subprocess> {
  cleanupChromeLocks();

  const args = [
    ...(config.headless ? ["--headless=new", "--disable-gpu"] : []),
    "--remote-debugging-address=0.0.0.0",
    `--remote-debugging-port=${chromeCdpPort}`,
    `--user-data-dir=${config.home}/.chrome`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=TranslateUI",
    "--disable-breakpad",
    "--disable-crash-reporter",
    "--metrics-recording-only",
    "--no-sandbox",
    "--enable-features=NetworkService,NetworkServiceInProcess",
    "--disable-blink-features=AutomationControlled",
    "about:blank",
  ];

  const proc = spawn({
    cmd: ["google-chrome", ...args],
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      DISPLAY: config.display,
      HOME: config.home,
      XDG_CONFIG_HOME: `${config.home}/.config`,
      XDG_CACHE_HOME: `${config.home}/.cache`,
    },
  });

  // Wait for Chrome to be ready
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(
        `http://127.0.0.1:${chromeCdpPort}/json/version`,
        { signal: AbortSignal.timeout(1000) }
      );
      if (res.ok) {
        log(`Chrome is ready on port ${chromeCdpPort}`);
        return proc;
      }
    } catch {}
    await Bun.sleep(100);
  }

  log("Warning: Chrome may not be fully ready");
  return proc;
}
