// BUILD_VERSION is replaced at compile time via --define in build.ts
// When running locally (not compiled), it falls back to "dev"
declare const BUILD_VERSION: string;

export const VERSION: string =
  typeof BUILD_VERSION !== "undefined" ? BUILD_VERSION : "dev";

/**
 * Check GitHub for a newer release. Returns the latest tag if newer, or null.
 * Non-blocking — caller should not await this in the critical path.
 */
export async function checkForUpdate(): Promise<string | null> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/Metroxe/cig-loop/releases/latest",
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return null;

    const release = (await res.json()) as { tag_name: string };
    const latest = release.tag_name.replace(/^v/, "");

    if (VERSION === "dev" || VERSION === latest) return null;

    // Simple semver comparison: split and compare numerically
    const cur = VERSION.split(".").map(Number);
    const lat = latest.split(".").map(Number);

    for (let i = 0; i < 3; i++) {
      if ((lat[i] ?? 0) > (cur[i] ?? 0)) return latest;
      if ((lat[i] ?? 0) < (cur[i] ?? 0)) return null;
    }

    return null;
  } catch {
    return null;
  }
}
