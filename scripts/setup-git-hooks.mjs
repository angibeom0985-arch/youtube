import { execSync } from "node:child_process";

const run = (command) => execSync(command, { stdio: "inherit" });

try {
  run("git rev-parse --is-inside-work-tree");
  run("git config core.hooksPath .githooks");
  console.log("[hooks] core.hooksPath=.githooks configured");
} catch (error) {
  console.error("[hooks] failed to configure hooks path");
  process.exit(1);
}
