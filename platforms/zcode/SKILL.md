---
name: codespine-review
description: 用码脊做代码评审——运行 codespine ct 提取 diff 骨架，按 prompts/ANALYSIS.md 生成 spine.json，audit 验收后 render 出脊椎视图。当用户要求"评审这个 PR / 分析这次变更 / 出码脊视图"时使用。
---

# 码脊评审（ZCode）

## 工作流

1. 确认 codespine 已安装：`codespine version`（未装则 `npm i -g git+ssh://你的仓库/CodeSpine.git`）
2. 在目标 git 仓库根目录执行：
   ```sh
   codespine ct --base origin/master -o spine-raw.json
   ```
3. 读取包内 `prompts/ANALYSIS.md`（规则）与 `prompts/SCHEMA.md`（契约），参考 `prompts/fewshot/HR-9701/spine.json`（真实样例）
4. 基于 spine-raw.json 生成 spine.json（遵守 ANALYSIS.md 全部规则，行号只能来自 raw）
5. 验收：`codespine audit spine.json --repo .` —— 有错误必须修复后重验
6. 渲染：`codespine render spine.json -o review.html`，把 HTML 路径给用户
