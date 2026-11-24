# 码脊 CodeSpine

用 CT 断层扫描的方式做代码评审——确定性提取 diff 骨架，AI 完成语义分析，渲染一份你不用翻文件就能看懂的评审视图。

[安装](#安装) · [2 分钟上手](#2-分钟上手) · [它是怎么工作的](#它是怎么工作的) · [为什么不用 XX](#为什么不用-xx)

---

## 你拿到什么

一条命令扫出整条变更链路，五张视图从粗到细：

| 视图 | 你看到的 |
|---|---|
| **变更概览** | 这次改了什么、影响哪些入口、建议先看哪个、哪些需要你重点判断 |
| **影响链路** | 从 HTTP 入口到落库出口的完整调用路径，每跳带行号，点击复制直接跳 IDE |
| **代码差异** | 按函数分组的完整方法体 diff（不是散落的代码行），左侧文件树右侧代码 |
| **独立变更** | 没挂上链路的文档/配置/枚举变更，全量文件索引保证一个不漏 |
| **验证情况** | AI 用通俗语言告诉你哪里可能有风险、为什么、建议怎么核实——你可以逐项标记"确认无风险"或"有风险" |

## 安装

```sh
npm i -g git+ssh://git@github.com/chenkelong/CodeSpine.git
```

或在仓库目录下 `npm link` 本地调试。

## 2 分钟上手

```sh
cd 你的项目
codespine ct          # ① 扫描 → .codespine/<分支>/spine-raw.json（秒级）
```

第②步是 AI 语义分析，目前两种方式：

- 装了 [ZCode](platforms/zcode/SKILL.md) 或 [Codex](platforms/codex/AGENTS.md) 的 skill → 对 agent 说"评审一下"
- 直接让我分析 → 把 `spine-raw.json` 路径发给 AI，按 [ANALYSIS.md](prompts/ANALYSIS.md) 规则产出 `spine.json`

```sh
codespine audit --raw  # ③ 验收：行号回读，AI 编的行号直接打回
codespine render       # ④ 打开 .codespine/<分支>/review.html
```

所有产物归档在 `.codespine/<分支名>/` 下（`ct` 会自动创建目录并询问 `.gitignore`）。

## 命令一览

| 命令 | 干什么 | 常用选项 |
|---|---|---|
| `codespine ct` | 断层扫描（行级 diff + 内容快照 + numstat 自检） | `--base origin/main` `--head HEAD` `-o` `--no-content` |
| `codespine audit` | 验收 AI 产出的 spine.json | `--raw spine-raw.json` `--repo /path` |
| `codespine render` | 渲染评审 HTML | `spine.json 路径` `-o output.html` |

智能默认：不传 `--base` 时自动探测 `origin/master → origin/main → master → main`。

## 它是怎么工作的

**三层分离，各干各的：**

- **命令层（确定性）**：`ct` 用 git diff 提取骨架，`audit` 用行号回读守门，`render` 用内置模板出页面。这三步零 AI、零猜测、可复现——同一份数据渲染两次，MD5 一致。
- **AI 层（语义）**：按 [ANALYSIS.md](prompts/ANALYSIS.md) 的规则把 raw 转成 spine.json——组织调用链路、切分逻辑块、命名（动宾短语）、识别风险点。产出必须过 `audit` 验收，行号编造直接打回。
- **模板层（样式）**：五视图界面全部写死在 [templates/spine-v2.html](templates/spine-v2.html)，随 npm 包分发。**AI 换任何模型、任何宿主，界面永远长一个样**。

**方法检测规则**（这个坑踩了三次才修对）：

只匹配 `public/private/protected` 开头 + `{` 结尾的真正方法声明。宽松匹配会把 `filteredTaskIds.add()` 这种**语句**误判为方法，导致方法体被碎片化切割，`return` 语句丢失。

**代码差异视图**直接读 raw 的完整 diff（不是 spine.json 的精选行），按方法分组渲染**完整方法体**——从签名到 `return` 到闭括号 `}`，中间未变更区域折叠（`⋯ N 行 ⋯`），但**方法体最后 5 行永不折叠**。

**风险分析**用通俗类比描述（"想象一条流水线，原来是先拆旧任务再分配指标…"），不用专业术语。每项可点击 ✓确认无风险 / ⚠有风险 / 跳过，响应存 localStorage 刷新自动恢复。

## 为什么不用 XX

| 你可能想用的 | 为什么我们自己做 |
|---|---|
| GitHub PR diff | 散行堆砌，没有链路叙事，不知道一个改动影响哪些入口 |
| Odin PR Review | Java 没有 resolver，图退化为"卡片平铺"；视图不可定制 |
| 纯 AI 评审 | AI 会编行号（实测 114 处错位）；没有确定性守门 |
| SonarQube | 代码质量检查，不是变更影响分析；不知道"这次改了什么" |

## 证据分级

每条 AI 判断都标注来源，低置信度标黄提醒人工重点看：

| 标识 | 含义 |
|---|---|
| 🟢 源码事实 | 可直接由代码或配置确认 |
| 🟡 分析推断 | 基于上下文得出的判断 |
| 🔴 待确认 | 需要作者或评审者确认 |
| 🔵 已验证 | 有执行结果及证据支持 |

## 文件说明

| 路径 | 干什么 |
|---|---|
| `bin/codespine.js` | 入口，解析子命令和参数 |
| `src/ct.js` | 断层扫描：git diff 解析 + 内容快照 + numstat 交叉自检 |
| `src/audit.js` | 验收器：行号回读（±4 容差）+ 越界检查 + kind 合法性 |
| `src/render.js` | 渲染器：自动注入同目录 spine-raw.json |
| `templates/spine-v2.html` | 五视图模板（概览/链路/差异/独立/验证 + 风险分析交互） |
| `prompts/ANALYSIS.md` | AI 分析规则：七步法 + 方法检测 + 术语规范 + 禁止事项 |
| `prompts/SCHEMA.md` | 数据契约：raw → spine.json 字段说明 + 渲染规则 |
| `prompts/fewshot/HR-9701/` | 真实样例（19 文件完整分析） |
| `docs/DESIGN.md` | UI 设计决策 + 8 条历史否决记录（泳道图/病灶/行号排序…） |
| `platforms/zcode/SKILL.md` | ZCode 宿主壳 |
| `platforms/codex/AGENTS.md` | Codex 宿主壳 |
| `examples/HR-9701/` | 完整案例（raw + 分析产出） |

## 当前限制

- 第②步 AI 分析目前需要人工或 agent 执行，独立模式（配 API key 全自动）规划中
- Java 方法检测用缩进 + 关键字匹配，不如 tree-sitter 精确（但已够用）
- 代码差异视图的语法高亮是纯着色（绿/红/灰），没有语法感知
- 前端（React/Vue）语言策略预留了接口但未实现
- 风险分析的响应存在 localStorage，不回写服务端

## Roadmap

- [ ] `codespine analyze` 子命令（配 DeepSeek API key，内置 LLM 调用 + audit 自动重试）
- [ ] tree-sitter 方法边界检测（替代正则匹配）
- [ ] React/Vue 前端链路支持（组件树 + import 图 + 路由溯源）
- [ ] 多模型投票（两个模型各分析一遍，分歧点标红人工裁决）
- [ ] 渲染快照回归（固定 spine.json 渲染 hash 对比，防样式意外漂移）

## 迭代历程

从"这个项目不是我想要的"到可用，30 轮真实评审迭代：

> v1 泳道图（被否）→ v2 入口+纵向链 → v3 逻辑块 → v4~v8 右栏+复制+覆盖率 → v9~v12 引用卡+代码+方法标注 → v13~v15 真实调用链+审计修正 → v16~v18 调用路径+逻辑推进序 → v19~v21 补漏+全量审计 → v22~v25 代码走廊+diff 风格 → v26~v29 按钮对齐+函数级 diff+完整方法体 → v30 通俗版风险分析

## License

MIT
