// codespine ct —— 语言无关的完整 diff 提取（零语义：不做分层/不做调用分析，那是 AI 的事）
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const MAX_CONTENT_LINES = 4000; // 每文件内容快照上限，防大文件爆炸

function git(cwd, ...args) {
  return execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024,
  });
}

/** 解析 git diff 统一格式 → 结构化 files */
export function parseDiff(text) {
  const files = [];
  let cur = null;
  let hunk = null;
  let oldN = 0, newN = 0;

  const pushFile = () => { if (cur) files.push(cur); };

  for (const raw of text.split("\n")) {
    if (raw.startsWith("diff --git ")) {
      pushFile();
      cur = { path: null, prevPath: null, status: "M", binary: false, hunks: [], additions: 0, deletions: 0, content: null };
      hunk = null;
      continue;
    }
    if (!cur) continue;
    if (raw.startsWith("rename from ")) { cur.prevPath = raw.slice(12); cur.status = "R"; continue; }
    if (raw.startsWith("rename to ")) { cur.path = raw.slice(10); continue; }
    if (raw.startsWith("new file mode")) { cur.status = "A"; continue; }
    if (raw.startsWith("deleted file mode")) { cur.status = "D"; continue; }
    if (raw.startsWith("Binary files") || raw.startsWith("GIT binary patch")) { cur.binary = true; continue; }
    if (raw.startsWith("--- ")) {
      const p = raw.slice(4).replace(/^a\//, "");
      if (p !== "/dev/null" && !cur.prevPath) cur.prevPath = p;
      continue;
    }
    if (raw.startsWith("+++ ")) {
      const p = raw.slice(4).replace(/^b\//, "");
      if (p !== "/dev/null" && !cur.path) cur.path = p;
      continue;
    }
    const hm = raw.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@\s*(.*)$/);
    if (hm) {
      hunk = {
        header: raw,
        oldStart: +hm[1], oldLines: hm[2] === undefined ? 1 : +hm[2],
        newStart: +hm[3], newLines: hm[4] === undefined ? 1 : +hm[4],
        func: hm[5] || "",
        lines: [],
      };
      cur.hunks.push(hunk);
      oldN = hunk.oldStart; newN = hunk.newStart;
      continue;
    }
    if (!hunk) continue;
    if (raw.startsWith("+")) {
      hunk.lines.push({ kind: "add", text: raw.slice(1), newLine: newN++ });
      cur.additions++;
    } else if (raw.startsWith("-")) {
      hunk.lines.push({ kind: "del", text: raw.slice(1), oldLine: oldN++ });
      cur.deletions++;
    } else if (raw.startsWith(" ")) {
      hunk.lines.push({ kind: "ctx", text: raw.slice(1), oldLine: oldN++, newLine: newN++ });
    } else if (raw === "\\ No newline at end of file") {
      const last = hunk.lines[hunk.lines.length - 1];
      if (last) last.noNewline = true;
    }
  }
  pushFile();
  return files;
}

/** 自检：与 numstat 交叉核对 */
function crossCheck(cwd, base, head, files) {
  const num = git(cwd, "diff", "--numstat", "-M", base, head).trim();
  const expect = new Map(num.split("\n").filter(Boolean).map(l => {
    const m = l.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    return [m[3], { a: m[1], d: m[2] }];
  }));
  const issues = [];
  for (const f of files) {
    if (f.binary) continue;
    const e = expect.get(f.path);
    if (!e) issues.push(`numstat 缺少 ${f.path}`);
    else if (+e.a !== f.additions || +e.d !== f.deletions)
      issues.push(`${f.path}: 统计不一致 diff=${f.additions}/${f.deletions} numstat=${e.a}/${e.d}`);
  }
  return issues;
}

export async function runCt(args) {
  const cwd = args.C ? resolve(String(args.C)) : process.cwd();
  if (!existsSync(resolve(cwd, ".git"))) {
    throw new Error(`当前目录不是 git 仓库（${cwd}）。请在 git 项目根目录执行，或用 -C 指定路径。`);
  }
  const base = String(args.base || "origin/master");
  const headRef = String(args.head || "HEAD");
  const out = String(args.o || "spine-raw.json");
  const withContent = args["no-content"] !== true;

  try { git(cwd, "rev-parse", "--verify", base); }
  catch { throw new Error(`基准分支 ${base} 不存在。可用 --base 指定（如 --base origin/main）。`); }

  const baseSha = git(cwd, "rev-parse", base).trim();
  const headSha = git(cwd, "rev-parse", headRef).trim();
  const mergeBase = git(cwd, "merge-base", base, headRef).trim();
  let branch = "";
  try { branch = git(cwd, "rev-parse", "--abbrev-ref", headRef).trim(); } catch {}
  let remote = "";
  try { remote = git(cwd, "remote", "get-url", "origin").trim(); } catch {}

  const diffText = git(cwd, "diff", "--no-color", "-M", mergeBase, headSha);
  const files = parseDiff(diffText);

  // 新侧内容快照（供 AI 行号回读，避免二次读盘/环境依赖）
  if (withContent) {
    for (const f of files) {
      const p = resolve(cwd, f.path);
      if (f.status !== "D" && existsSync(p)) {
        const lines = readFileSync(p, "utf-8").split("\n");
        if (lines.length > MAX_CONTENT_LINES) lines.length = MAX_CONTENT_LINES;
        f.content = lines;
      }
    }
  }

  // 自检
  const issues = crossCheck(cwd, mergeBase, headSha, files);
  const additions = files.reduce((s, f) => s + f.additions, 0);
  const deletions = files.reduce((s, f) => s + f.deletions, 0);

  const doc = {
    schema: "codespine.raw/0.1",
    repo: { root: cwd, remote, branch },
    compare: { baseRef: base, headRef, baseSha, headSha, mergeBase },
    summary: { files: files.length, additions, deletions, hunks: files.reduce((s, f) => s + f.hunks.length, 0) },
    files,
  };
  writeFileSync(out, JSON.stringify(doc, null, 1));

  console.log(`✔ 码脊 CT 扫描完成`);
  console.log(`  分支   ${branch} → ${base}（merge-base ${mergeBase.slice(0, 8)}）`);
  console.log(`  变更   ${files.length} 文件 · ${doc.summary.hunks} hunks · +${additions} −${deletions}`);
  console.log(`  自检   ${issues.length === 0 ? "通过（与 numstat 交叉核对一致）" : issues.length + " 个问题：\n    " + issues.join("\n    ")}`);
  console.log(`  产出   ${out}${withContent ? "（含新侧内容快照）" : ""}`);
  return issues.length ? 2 : 0;
}
