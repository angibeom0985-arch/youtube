import { readdirSync, statSync } from "fs";
import path from "path";
import { spawn } from "child_process";

function resolveCaseAwareDir(parts) {
  let current = process.cwd();

  for (const part of parts) {
    const entries = readdirSync(current, { withFileTypes: true });
    const match = entries.find(
      (entry) => entry.isDirectory() && entry.name.toLowerCase() === part.toLowerCase()
    );
    if (!match) return null;
    current = path.join(current, match.name);
  }

  return current;
}

const mode = process.argv[2] || "build";
const extraArgs = process.argv.slice(3);
const appRoot = resolveCaseAwareDir(["youtube", "youtube_script"]);

if (!appRoot || !statSync(appRoot).isDirectory()) {
  console.error("[vite-run] Could not find app root: youtube/youtube_script");
  process.exit(1);
}

const modeArgs =
  mode === "dev" ? [appRoot, ...extraArgs] : [mode, appRoot, ...extraArgs];

const viteBin = path.join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [viteBin, ...modeArgs], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
  console.error("[vite-run] Failed to start Vite:", error);
  process.exit(1);
});
