import { execSync } from "node:child_process";

const TARGET_REMOTE_URL = "https://github.com/angibeom0985-arch/youtube";

const run = (command, options = {}) => {
  return execSync(command, {
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  }).trim();
};

const safeRun = (command, options = {}) => {
  try {
    return { ok: true, output: run(command, options) };
  } catch (error) {
    return {
      ok: false,
      output: error?.stdout?.toString?.() || "",
      error: error?.stderr?.toString?.() || error?.message || String(error),
    };
  }
};

const formatDate = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

const rawArgs = process.argv.slice(2);
const dryRun = rawArgs.includes("--dry-run");
const userMessage = rawArgs.filter((arg) => arg !== "--dry-run").join(" ").trim();
const commitMessage = userMessage || `chore: finish work (${formatDate()})`;

const inGit = safeRun("git rev-parse --is-inside-work-tree");
if (!inGit.ok || inGit.output !== "true") {
  console.error("[finish] 현재 위치가 git 저장소가 아닙니다.");
  process.exit(1);
}

const remote = safeRun("git remote get-url origin");
if (!remote.ok) {
  console.error("[finish] origin 원격 저장소를 찾을 수 없습니다.");
  console.error(remote.error);
  process.exit(1);
}

const normalizedRemote = remote.output.replace(/\.git$/, "").toLowerCase();
if (normalizedRemote !== TARGET_REMOTE_URL.toLowerCase()) {
  console.error("[finish] origin URL이 지정한 저장소와 다릅니다.");
  console.error(`[finish] current: ${remote.output}`);
  console.error(`[finish] target : ${TARGET_REMOTE_URL}`);
  process.exit(1);
}

const branch = safeRun("git rev-parse --abbrev-ref HEAD");
if (!branch.ok || !branch.output) {
  console.error("[finish] 현재 브랜치를 확인할 수 없습니다.");
  process.exit(1);
}

const status = safeRun("git status --porcelain");
if (!status.ok) {
  console.error("[finish] 작업 상태를 확인할 수 없습니다.");
  console.error(status.error);
  process.exit(1);
}

if (status.output.length > 0) {
  if (dryRun) {
    console.log("[finish] dry-run: 변경사항이 있어 add/commit 대상입니다.");
  } else {
    const addResult = safeRun("git add -A");
    if (!addResult.ok) {
      console.error("[finish] git add 실패");
      console.error(addResult.error);
      process.exit(1);
    }

    const commitResult = safeRun(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
    if (!commitResult.ok) {
      console.error("[finish] git commit 실패");
      console.error(commitResult.error || commitResult.output);
      process.exit(1);
    }
    console.log(`[finish] commit 완료: ${commitMessage}`);
  }
} else {
  console.log("[finish] 커밋할 변경사항이 없습니다. push만 진행합니다.");
}

if (dryRun) {
  console.log(`[finish] dry-run: push 대상 브랜치 origin/${branch.output}`);
  process.exit(0);
}

const pushResult = safeRun(`git push origin ${branch.output}`);
if (!pushResult.ok) {
  const firstPush = safeRun(`git push -u origin ${branch.output}`);
  if (!firstPush.ok) {
    console.error("[finish] git push 실패");
    console.error(firstPush.error || firstPush.output);
    process.exit(1);
  }
  console.log(`[finish] push 완료 (upstream 설정): origin/${branch.output}`);
} else {
  console.log(`[finish] push 완료: origin/${branch.output}`);
}
