/**
 * Boilerplate command — fetch and copy boilerplate templates from the GitHub repo.
 */

import * as p from "@clack/prompts";
import chalk from "chalk";

const GITHUB_API = "https://api.github.com/repos/Metroxe/cig-loop/contents";

interface GitHubEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
}

/** Convert a folder name like "web-research" to "Web Research". */
function toDisplayName(dirName: string): string {
  return dirName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Fetch the list of boilerplate directories from GitHub. */
async function fetchBoilerplateList(): Promise<string[]> {
  const res = await fetch(`${GITHUB_API}/boilerplates`);
  if (!res.ok) {
    throw new Error(`Failed to fetch boilerplates: ${res.status} ${res.statusText}`);
  }
  const entries: GitHubEntry[] = await res.json();
  return entries.filter((e) => e.type === "dir").map((e) => e.name);
}

/** Recursively fetch all files in a boilerplate directory. Returns relative paths + download URLs. */
async function fetchBoilerplateFiles(
  dirName: string,
): Promise<Array<{ relativePath: string; downloadUrl: string }>> {
  const files: Array<{ relativePath: string; downloadUrl: string }> = [];

  async function walk(apiPath: string, prefix: string): Promise<void> {
    const res = await fetch(`${GITHUB_API}/${apiPath}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${apiPath}: ${res.status} ${res.statusText}`);
    }
    const entries: GitHubEntry[] = await res.json();

    for (const entry of entries) {
      if (entry.type === "file" && entry.download_url) {
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        files.push({ relativePath, downloadUrl: entry.download_url });
      } else if (entry.type === "dir") {
        const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
        await walk(entry.path, nextPrefix);
      }
    }
  }

  await walk(`boilerplates/${dirName}`, "");
  return files;
}

/** Download a file's raw content. */
async function downloadFile(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status}`);
  }
  return res.text();
}

/** Generate a timestamped output directory name, e.g. "research-20260211-143022". */
function makeOutputDir(dirName: string): string {
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  return `${dirName}-${ts}`;
}

/** Parse boilerplate subcommand args: `boilerplate [--name <name>]` */
function parseBoilerplateArgs(): { name?: string } {
  const args = process.argv.slice(3);
  let name: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--name" || args[i] === "-n") && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === "--list" || args[i] === "-l") {
      // handled separately
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(
        `Usage: cig-loop boilerplate [options]\n\n` +
        `Options:\n` +
        `  -n, --name <name>  boilerplate to use (skip interactive selection)\n` +
        `  -l, --list         list available boilerplates and exit\n` +
        `  -h, --help         show this help\n`,
      );
      process.exit(0);
    }
  }

  return { name };
}

function shouldList(): boolean {
  return process.argv.slice(3).some((a) => a === "--list" || a === "-l");
}

export async function runBoilerplate(): Promise<void> {
  const { name: requestedName } = parseBoilerplateArgs();
  const listOnly = shouldList();
  const interactive = !requestedName && !listOnly;

  if (interactive) {
    p.intro(chalk.bgCyan.black(" cig-loop boilerplate "));
  }

  // Fetch available boilerplates
  const spinner = interactive ? p.spinner() : null;
  spinner?.start("Fetching boilerplates...");
  if (!interactive) console.log("Fetching boilerplates...");

  let boilerplates: string[];
  try {
    boilerplates = await fetchBoilerplateList();
  } catch (err) {
    spinner?.stop("Failed to fetch boilerplates");
    console.error(
      chalk.red(`Could not fetch boilerplates from GitHub.\n`) +
      `  ${chalk.dim(String(err))}\n\n` +
      `  Check your internet connection and try again.`,
    );
    process.exit(1);
  }

  if (boilerplates.length === 0) {
    spinner?.stop("No boilerplates found");
    console.log("No boilerplates are available in the repository yet.");
    process.exit(0);
  }

  spinner?.stop(`Found ${boilerplates.length} boilerplate${boilerplates.length > 1 ? "s" : ""}`);

  // --list: just print names and exit
  if (shouldList()) {
    for (const name of boilerplates) {
      console.log(`  ${name}  ${chalk.dim(toDisplayName(name))}`);
    }
    process.exit(0);
  }

  // Determine which boilerplate to use
  let dirName: string;

  if (requestedName) {
    if (!boilerplates.includes(requestedName)) {
      console.error(
        chalk.red(`Boilerplate "${requestedName}" not found.\n`) +
        `Available: ${boilerplates.join(", ")}`,
      );
      process.exit(1);
    }
    dirName = requestedName;
    console.log(`Using boilerplate: ${chalk.bold(toDisplayName(dirName))}`);
  } else {
    const selected = await p.select({
      message: "Select a boilerplate",
      options: boilerplates.map((name) => ({
        value: name,
        label: toDisplayName(name),
      })),
    });

    if (p.isCancel(selected)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    dirName = selected as string;
  }

  // Fetch file list
  spinner?.start("Fetching files...");
  if (!interactive) console.log("Fetching files...");

  let files: Array<{ relativePath: string; downloadUrl: string }>;
  try {
    files = await fetchBoilerplateFiles(dirName);
  } catch (err) {
    spinner?.stop("Failed to fetch files");
    console.error(chalk.red(`Could not fetch boilerplate files: ${err}`));
    process.exit(1);
  }

  if (files.length === 0) {
    spinner?.stop("No files found");
    console.log("This boilerplate has no files.");
    process.exit(0);
  }

  spinner?.stop(`${files.length} file${files.length > 1 ? "s" : ""} to copy`);
  if (!interactive) console.log(`${files.length} file${files.length > 1 ? "s" : ""} to copy`);

  // Create a timestamped output directory
  const outputDir = makeOutputDir(dirName);
  await Bun.spawn(["mkdir", "-p", outputDir]).exited;

  // Download and write files into the output directory
  spinner?.start("Copying files...");
  if (!interactive) console.log("Copying files...");

  try {
    for (const file of files) {
      const content = await downloadFile(file.downloadUrl);
      const destPath = `${outputDir}/${file.relativePath}`;

      // Ensure parent directories exist
      const lastSlash = destPath.lastIndexOf("/");
      if (lastSlash !== -1) {
        const dir = destPath.substring(0, lastSlash);
        await Bun.spawn(["mkdir", "-p", dir]).exited;
      }

      await Bun.write(destPath, content);
    }
  } catch (err) {
    spinner?.stop("Failed to copy files");
    console.error(chalk.red(`Error writing files: ${err}`));
    process.exit(1);
  }

  spinner?.stop("Files copied");

  // Show what was copied
  for (const file of files) {
    const destPath = `${outputDir}/${file.relativePath}`;
    if (interactive) {
      p.log.success(destPath);
    } else {
      console.log(chalk.green(`  ✓ ${destPath}`));
    }
  }

  if (interactive) {
    p.outro(chalk.green(`Done! Files are in ${chalk.bold(outputDir)}/\nRun ${chalk.bold(`cd ${outputDir} && cig-loop`)} to start.`));
  } else {
    console.log(chalk.green(`\nDone! Files are in ${chalk.bold(outputDir)}/\nRun ${chalk.bold(`cd ${outputDir} && cig-loop`)} to start.`));
  }
}
