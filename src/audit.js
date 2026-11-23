// codespine audit —— 验收器：行号回读 + 边界检查（骨架层是事实，错一格都不行）
// 回读顺序：--raw 内容快照（推荐，不依赖工作区状态）→ --repo 工作区 → 当前目录
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export function runAudit(args) {
  const spinePath = args._[0] || "spine.json";
  const repo = resolve(String(args.repo || "."));
  const data = JSON.parse(readFileSync(spinePath, "utf-8"));
  const raw = args.raw ? JSON.parse(readFileSync(String(args.raw), "utf-8")) : null;
  const rawByPath = new Map((raw ? raw.files || [] : []).filter(f => f.content).map(f => [f.path, f.content]));
  const errors = [], warnings = [];
  const cache = {};
  const lines = p => {
    if (!(p in cache)) {
      if (rawByPath.has(p)) cache[p] = rawByPath.get(p);
      else {
        const f = resolve(repo, p);
        cache[p] = existsSync(f) ? readFileSync(f, "utf-8").split("\n") : null;
      }
    }
    return cache[p];
  };
  const checkLine = (p, ln, text, where) => {
    if (!p || !ln) return;
    const ls = lines(p);
    if (!ls) { errors.push(`${where}: 文件不存在 ${p}`); return; }
    if (ln < 1 || ln > ls.length) { errors.push(`${where}: L${ln} 越界（${String(p).split("/").pop()} 共 ${ls.length} 行）`); return; }
    const c = String(text || "").trim();
    if (!c) return;
    for (let d = -4; d <= 4; d++) {
      const j = ln + d;
      if (j >= 1 && j <= ls.length) {
        const t = ls[j - 1].trim();
        if (t === c || (c.length >= 16 && t.startsWith(c.slice(0, 20)))) return;
      }
    }
    warnings.push(`${where}: L${ln} 与文件行不匹配（可能为概括行）: ${c.slice(0, 36)}…`);
  };
  const walk = (nodes, entryId) => {
    for (const n of nodes || []) {
      const w = `[${entryId}] ${n.cls || "?"}`;
      if (!n.cls) errors.push(`${w}: 缺少 cls`);
      if (!["new", "changed", "unchanged", "external"].includes(n.kind)) errors.push(`${w}: kind 非法 ${n.kind}`);
      (n.callLines || []).forEach(c => checkLine(n.path, c.ln, c.text, `${w} 关键调用行`));
      const blocks = [...(n.blocks || []), ...((n.phases || []).flatMap(p => p.blocks || []))];
      for (const b of blocks) {
        if (!b.name || !b.range) errors.push(`${w}: 块缺 name/range`);
        (b.snippet || []).forEach(s => checkLine(n.path, s.ln, s.code, `${w}·${b.name}`));
        (b.via || []).forEach((v, i) => {
          const ls = v.path ? lines(v.path) : null;
          if (v.path && !ls) errors.push(`${w}·${b.name} via跳${i + 1}: 文件不存在 ${v.path}`);
          else if (ls && (v.ln < 1 || v.ln > ls.length)) errors.push(`${w}·${b.name} via跳${i + 1}: L${v.ln} 越界`);
        });
      }
      walk(n.children, entryId);
    }
  };
  for (const e of data.entries || []) walk(e.chain, e.id || e.path || "?");
  for (const o of data.orphans || []) walk([o], "未挂链");

  console.log(`码脊 audit —— ${spinePath}${raw ? "（回读：" + String(args.raw) + "）" : ""}`);
  console.log(`  错误 ${errors.length} · 警告 ${warnings.length}`);
  errors.forEach(x => console.log("  ✗ " + x));
  warnings.slice(0, 20).forEach(x => console.log("  ⚠ " + x));
  if (warnings.length > 20) console.log(`  ⚠ …及其余 ${warnings.length - 20} 条`);
  console.log(errors.length === 0 ? "  ✔ 通过" : "  ✘ 未通过");
  return errors.length ? 1 : 0;
}
