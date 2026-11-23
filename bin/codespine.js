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
  codespine ct      断层扫描：完整提取 diff 原始数据 → spine-raw.json
                    选项: --base origin/master  --head HEAD  -o spine-raw.json  --no-content
  codespine audit   验收 AI 产出的 spine.json（行号回读 + 边界检查）
                    选项: spine.json 路径  --repo 仓库根路径
  codespine render  渲染 spine.json → 脊椎视图 HTML（样式内置，AI 不可改）
                    选项: spine.json 路径  -o review.html

完整流程（AI 由你的 agent 提供，见 prompts/ 与 platforms/）:
  codespine ct → AI 按 prompts/ANALYSIS.md 生成 spine.json → codespine audit → codespine render`);
  process.exit(cmd ? 1 : 0);
}
