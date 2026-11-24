// codespine render —— 数据进、HTML 出；样式全部来自内置模板，AI 碰不到
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

function branchDir() {
  try {
    const b = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf-8" }).trim();
    return String(b).replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  } catch {
    try {
      const dirs = readdirSync(".codespine").filter(x => !x.startsWith("."));
      if (dirs.length === 1) return dirs[0];
    } catch {}
    return "";
  }
}

const TPL = resolve(dirname(fileURLToPath(import.meta.url)), "../templates/spine-v2.html");

export function runRender(args) {
  const d = branchDir();
  const spinePath = args._[0] || (d ? `.codespine/${d}/spine.json` : "spine.json");
  const out = String(args.o || (d ? `.codespine/${d}/review.html` : spinePath.replace(/\.json$/, "") + ".html"));
  const data = JSON.parse(readFileSync(spinePath, "utf-8"));
  // 自动加载同目录 spine-raw.json（供 diff 视图构建方法边界表）
  const rawPath = spinePath.replace("spine.json", "spine-raw.json");
  if (existsSync(rawPath)) {
    data.__raw = JSON.parse(readFileSync(rawPath, "utf-8"));
  }
  let tpl = readFileSync(TPL, "utf-8");

  const meta = data.meta || {};
  const entries = data.entries || [];
  const grey = entries.length > 0 && entries.every(e => (e.state || "grey") === "grey");
  const entriesBadge = "<span>" + entries.length + " 个受影响入口" + (grey ? " · 入口均未变更（灰色）" : "") + "</span>";
  const cov = data.coverage;
  const covText = cov
    ? "覆盖 " + cov.chained + "/" + cov.total + " · 未挂链 " + (data.orphans || []).length
    : ((data.orphans || []).length ? (data.orphans.length) + " 项未挂链" : "");
  const reps = {
    __TITLE__: meta.title || "CodeSpine 评审",
    __BRANCH__: meta.branch || "",
    __FILES__: meta.files ?? "?",
    __ADD__: meta.additions ?? 0,
    __DEL__: meta.deletions ?? 0,
    __ENTRIES_BADGE__: entriesBadge,
    __COVERAGE_BADGE__: covText ? "<span>" + covText + "</span>" : "",
    __SUMMARY__: meta.summary || "",
    __GENBY__: meta.generatedBy || "CodeSpine render v0.1",
    __DATA__: JSON.stringify(data),
  };
  for (const [k, v] of Object.entries(reps)) tpl = tpl.split(k).join(String(v));
  writeFileSync(out, tpl);
  console.log("✔ 渲染完成 " + out + "（" + (tpl.length / 1024).toFixed(0) + " KB）");
  return 0;
}
