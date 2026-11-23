// codespine render —— 数据进、HTML 出；样式全部来自内置模板，AI 碰不到
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TPL = resolve(dirname(fileURLToPath(import.meta.url)), "../templates/spine.html");

export function runRender(args) {
  const spinePath = args._[0] || "spine.json";
  const out = String(args.o || spinePath.replace(/\.json$/, "") + ".html");
  const data = JSON.parse(readFileSync(spinePath, "utf-8"));
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
