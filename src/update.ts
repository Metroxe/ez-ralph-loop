import chalk from "chalk";
import { stat, chmod, rename, readFile } from "node:fs/promises";
import { VERSION } from "./version.js";

const REPO = "Metroxe/cig-loop";
const BIN_NAME = "cig-loop";

async function needsBaseline(): Promise<boolean> {
  if (process.platform !== "linux" || process.arch !== "x64") return false;
  try {
    const cpuinfo = await readFile("/proc/cpuinfo", "utf-8");
    return !cpuinfo.includes("avx2");
  } catch {
    return false;
  }
}

async function detectPlatform(): Promise<string> {
  const os = process.platform === "darwin" ? "darwin" : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const base = `${os}-${arch}`;
  if (await needsBaseline()) return `${base}-baseline`;
  return base;
}

export async function runUpdate() {
  const platform = await detectPlatform();
  const assetName = `${BIN_NAME}-${platform}`;
  const execPath = process.execPath;

  console.log(chalk.bold("cig-loop update"));
  console.log(`  Current:  v${VERSION}`);
  console.log(`  Platform: ${platform}`);
  console.log(`  Binary:   ${execPath}`);
  console.log();

  // Fetch latest release
  console.log("Fetching latest release...");
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
  if (!res.ok) {
    console.error(chalk.red(`Failed to fetch release info: ${res.status} ${res.statusText}`));
    process.exit(1);
  }

  const release = (await res.json()) as { tag_name: string; assets: { name: string; browser_download_url: string }[] };
  const tag = release.tag_name;
  const latestVersion = tag.replace(/^v/, "");

  console.log(`  Latest:   ${tag}`);
  console.log();

  // Skip if already on latest
  if (VERSION !== "dev" && VERSION === latestVersion) {
    console.log(chalk.green("Already up to date."));
    return;
  }

  // Find the matching asset
  const asset = release.assets.find((a) => a.name === assetName);
  if (!asset) {
    console.error(chalk.red(`No binary found for platform: ${platform}`));
    console.error(`Available assets: ${release.assets.map((a) => a.name).join(", ")}`);
    process.exit(1);
  }

  // Download the binary
  console.log(`Downloading ${assetName}...`);
  const download = await fetch(asset.browser_download_url);
  if (!download.ok) {
    console.error(chalk.red(`Download failed: ${download.status} ${download.statusText}`));
    process.exit(1);
  }

  const binary = await download.arrayBuffer();

  // Write to a temp file first, then move into place (atomic-ish replace)
  const tmpPath = `${execPath}.tmp`;
  await Bun.write(tmpPath, binary);

  // Copy permissions from current binary, then swap
  const { mode } = await stat(execPath);
  await chmod(tmpPath, mode);
  await rename(tmpPath, execPath);

  console.log();
  console.log(chalk.green(`Updated to ${tag} successfully.`));
}
