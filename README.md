# 码脊 CodeSpine

> CT-scan your code changes —— 确定性提取 diff 骨架，AI 完成语义分析，渲染可循行号的评审视图。

**一个内核，两种形态：**

| 形态 | 组成 | 适合 |
|---|---|---|
| agent 模式 | codespine 包 + skill 装进你的 AI（zcode/codex） | 重度 AI 用户 |
| 独立模式（规划中） | codespine + 配置 API key（DeepSeek 等） | CI / 不用 agent 的同学 |

## 快速开始

```sh
npm i -g git+ssh://git@github.com/chenkelong/CodeSpine.git
cd 你的项目
codespine ct                  # ① 断层扫描 → .codespine/<分支>/spine-raw.json
# ② AI 按 prompts/ANALYSIS.md 把 raw 转成 spine.json（skill 见 platforms/）
codespine audit --raw         # ③ 验收：行号回读，骨架层零容错
codespine render              # ④ 脊椎视图 → .codespine/<分支>/review.html
```

所有产物归档在 `.codespine/<分支名>/` 下，建议将该目录加入 `.gitignore`（ct 会自动询问）。

## 命令

| 命令 | 说明 | 默认行为 |
|---|---|---|
| `codespine ct` | diff 断层扫描 | 智能默认基准分支（origin/master → origin/main → master → main），产出含内容快照 |
| `codespine audit` | 验收 spine.json | 默认读当前分支目录，`--raw` 自动找同目录快照 |
| `codespine render` | 渲染 HTML | 样式内置模板（AI 不可改），默认输出 `review.html` |

选项：`--base <ref>` / `--head <ref>` / `-o <path>` / `--no-content` / `-C <dir>` / `-y`（跳过 gitignore 询问）

## 五视图评审界面

| 视图 | 内容 |
|---|---|
| **变更概览** | 变更说明 + 核心变更点（可跳转链路）+ 基线信息 + 评审关注点 + 证据图例 |
| **影响链路** | 入口卡片 + 纵向调用链（精简/完整）+ 右栏双卡详情（路径复制 + 关键代码） |
| **代码差异** | 左侧文件树 + 右侧**函数级完整方法体** diff（绿+红− + 已省略折叠） |
| **独立变更** | 非链路变更独立卡片 + 全量文件索引（无遗漏） |
| **验证情况** | 验证项目（行号回读✓ / 调用链路? / 业务影响?）+ 尚未覆盖范围 |

## 分层哲学

```
命令层（确定性）: ct 提取骨架 · audit 守门 · render 渲染
Skill 层（AI）  : 语义分析——链路组织/逻辑块命名/覆盖率闭包（prompts/ANALYSIS.md）
契约            : spine-raw.json → spine.json（SCHEMA.md）
红线            : 骨架层是事实（行号/调用关系零容错）；概率只住在语义层
```

## 证据分级

| 标识 | 含义 |
|---|---|
| 🟢 源码事实 | 可直接由代码或配置确认 |
| 🟡 分析推断 | 基于上下文得出的判断 |
| 🔴 待确认 | 需要作者或评审者确认 |
| 🔵 已验证 | 有执行结果及证据支持 |

## 目录

```
bin/ src/            命令实现（ct / audit / render）
templates/           评审视图模板（五视图 + diff + 链路，随包分发）
prompts/             ANALYSIS.md 分析规则 · SCHEMA.md 数据契约 · fewshot/ 样例
docs/DESIGN.md       UI 设计决策（视觉/交互/术语/历史否决记录）
platforms/           zcode / codex 宿主壳
examples/HR-9701/    完整真实案例
```

## 核心设计决策

| 决策 | 理由 |
|---|---|
| 调用图必须确定性生成，不允许 AI 凭印象 | 漏一跳用户就断线（踩过两次坑） |
| 方法检测只匹配 public/private/protected + `{` | 宽松匹配会把 `xxx.add()` 语句碎片化方法体 |
| 块排序 = 调用链行号字典序（逻辑推进序） | 评审按代码执行顺序走，不按文件物理行序 |
| 代码差异显示完整方法体（非仅 diff 行） | 孤立的 diff 行缺乏上下文，无法判断变更影响 |
| 样式全部内置模板，AI 不可改 | 换任何模型跑 skill，界面永远一样 |
| "已省略"替代"未变更" | 摘录跳过 ≠ 代码没变，不能误导 |
