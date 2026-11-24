#!/usr/bin/env node
import { runCt } from "../src/ct.js";
import { runAudit } from "../src/audit.js";
import { runRender } from "../src/render.js";

const [cmd, ...rest] = process.argv.slice(2);
const args = { _: [] };
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith("--")) {
    const eq = a.indexOf("=");
    if (eq > 0) args[a.slice(2, eq)] = a.slice(eq + 1);
    else args[a.slice(2)] = rest[i + 1] && !rest[i + 1].startsWith("-") ? rest[++i] : true;
  } else if (/^-[A-Za-z]$/.test(a)) {
    args[a.slice(1)] = rest[i + 1] && !rest[i + 1].startsWith("-") ? rest[++i] : true;
  } else args._.push(a);
}

if (cmd === "ct") {
  runCt(args).then(c => process.exit(c)).catch(e => { console.error("✗", e.message); process.exit(1); });
} else if (cmd === "audit") {
  process.exit(runAudit(args));
} else if (cmd === "render") {
  runRender(args);
} else if (cmd === "version" || cmd === "--version") {
  console.log("codespine (码脊) 0.1.0");
} else {
  console.log(`码脊 CodeSpine —— 代码断层扫描 v0.1.0

用法（在 git 项目目录下执行）:
  codespine ct      断层扫描 → .codespine/<分支>/spine-raw.json（默认对比 master/main）
                    选项: --base origin/xxx  --head HEAD  -o 路径  --no-content
  codespine audit   验收 spine.json（默认 .codespine/<分支>/，--raw 默认读同目录快照）
  codespine render  渲染 → .codespine/<分支>/review.html（样式内置，AI 不可改）
  所有产物都在 .codespine/<分支名>/ 下归档，建议将 .codespine/ 加入 .gitignore

完整流程（AI 由你的 agent 提供，见 prompts/ 与 platforms/）:
  codespine ct → AI 按 prompts/ANALYSIS.md 生成 spine.json → codespine audit → codespine render`);
  process.exit(cmd ? 1 : 0);
}
