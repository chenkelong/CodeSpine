# 码脊 CodeSpine

> CT-scan your code changes —— 确定性提取 diff 骨架，AI 完成语义分析，渲染可循行号的评审视图。

**一个内核，两种形态：**

| 形态 | 组成 | 适合 |
|---|---|---|
| agent 模式 | codespine 包 + skill 装进你的 AI（zcode/codex） | 重度 AI 用户 |
| 独立模式（规划中） | codespine + 配置 API key | CI / 不用 agent 的同学 |

## 快速开始

```sh
npm i -g git+ssh://git@github.com/chenkelong/CodeSpine.git
cd 你的项目
codespine ct                  # ① 断层扫描 → spine-raw.json（语言无关，含行级 diff + 内容快照）
# ② AI 按 prompts/ANALYSIS.md 把 raw 转成 spine.json（skill 见 platforms/）
codespine audit spine.json --repo .   # ③ 验收：行号回读，骨架层零容错
codespine render spine.json -o review.html   # ④ 脊椎视图（链路图 + 代码走廊）
```

## 命令

- `codespine ct` —— diff 断层扫描（`--base origin/master --head HEAD -o out.json --no-content`）
- `codespine audit` —— 验收 spine.json（错误=编造行号/越界；警告=概括行）
- `codespine render` —— 渲染 HTML（样式内置模板，AI 不可改，保证评审界面稳定）

## 分层哲学

```
命令层（确定性）: ct 提取骨架 · audit 守门 · render 渲染
Skill 层（AI）  : 语义分析——链路组织/逻辑块命名/覆盖率闭包（prompts/ANALYSIS.md）
契约            : spine-raw.json → spine.json（SCHEMA.md）
红线            : 骨架层是事实（行号/调用关系零容错）；概率只住在语义层
```

## 目录

```
bin/ src/          命令实现
templates/         脊椎视图模板（随包分发，样式升级=发版）
prompts/           ANALYSIS.md 分析规则 · SCHEMA.md 契约 · fewshot/ 真实样例
platforms/         zcode / codex 宿主壳
examples/HR-9701/  完整真实案例
```
