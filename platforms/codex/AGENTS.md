# 码脊评审（Codex）

当用户要求评审 PR / 分析代码变更时，使用码脊（CodeSpine）工具链：

1. `codespine ct --base origin/master -o spine-raw.json`（在目标 git 仓库根目录；工具安装：`npm i -g git+ssh://你的仓库/CodeSpine.git`）
2. 阅读已安装包内的 `prompts/ANALYSIS.md`（分析规则）与 `prompts/SCHEMA.md`（数据契约）
3. 把 spine-raw.json 转化为 spine.json：链路组织、逻辑块切分、行号锚点全部来自 raw，禁止编造
4. `codespine audit spine.json --repo .` 验收，错误清零才算完成
5. `codespine render spine.json -o review.html`，交付 HTML 给用户
