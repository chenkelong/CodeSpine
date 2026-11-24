# 码脊 CodeSpine —— 数据契约（SCHEMA）

## spine-raw.json（codespine ct 产出，AI 的只读输入）

```
schema: "codespine.raw/0.1"
repo:      { root, remote, branch }
compare:   { baseRef, headRef, baseSha, headSha, mergeBase }
summary:   { files, additions, deletions, hunks }
files[]:
  path / prevPath / status(A|M|D|R) / binary
  additions / deletions
  content[]        # 新侧全文行数组（1-based = 下标+1），行号回读以此为准
  hunks[]:
    header / oldStart / oldLines / newStart / newLines / func
    lines[]: { kind: add|del|ctx, text, oldLine?, newLine? }
```

## spine.json（AI 产出，render 的输入）

```
meta:      { title, branch, files, additions, deletions, summary, generatedBy,
             plainSummary: { what, why, impact, branch, ticket, commits[] } }  # 通俗版核心描述
entries[]: # 每个受影响 HTTP 入口一条链
  id / http / path / urls[] / group
  state: grey(入口未变更,下游有变更) | solid(入口自身变更)
  impact / impactNote          # "下游 N 处变更 · M 文件"
  params: { dto, state, note, newFields[], objects[{name, where, note, path, fields[{n,k(new|modified|deleted),t,d}]}] }
  chain[]: # 节点树
    cls / kind(new|changed|unchanged|external) / method / path / stats[a,d]
    badge?            # 复用创建链 / @Autowired 嵌套 / static 契约
    refOnly?          # 枢纽去重：第二次出现折叠为引用芯片
    hub? / hot?
    paramChanged?     # 参数变更标签（琥珀色）
    pcNote?           # 参数变更说明（hover 显示）
    callLines[]       # 未变更节点：≤3 行关键调用 {ln, text, next}
    blocks[]          # 平铺逻辑块（普通方法）
    phases[]          # 大方法一层分组 {name, blocks[]}
      block: { name(动宾短语), in(所在方法), range("L393-403"), kind(new|changed),
               desc, via[{m, ln, path}], snippet[{ln, k(+|-|空), code}],
               calls[{fn, kind, d, at{path,line,code}, def{line,snippet}}],
               paramChanged?, pcNote? }
    children[]        # 下游节点
  exit: { response, responseChanged, persistence?, newFields[] }
orphans[]: # 独立变更（非链路）
  cls / kind / stats / reason / note / blocks
coverage:  { total, chained, strip, note, inventory[{cls, type, loc}] }
```

## 五视图结构（模板渲染契约）

render 内置五个视图标签，spine.json 的数据分布到各视图：

| 视图 | 数据来源 | 说明 |
|---|---|---|
| **变更概览** | meta.summary + entries[].impactNote + coverage | 首页：变更说明 + 核心变更点 + 基线信息 + 评审关注点 + 证据图例 |
| **影响链路** | entries[].chain + params + exit | 入口卡片行 + 纵向调用链 + 右栏双卡详情 |
| **代码差异** | raw 的 hunks（直接读取，非 spine.json 精选） | 左侧文件树 + 右侧按方法分组的完整方法体 diff |
| **独立变更** | orphans + coverage.inventory | 非链路变更独立卡片 + 全量文件索引 |
| **验证情况** | audit 结果 + 预设检查项 | 行号回读✓ / 调用链路? / 业务影响? + 未覆盖范围 |

## 代码差异视图的渲染规则（render 内置，AI 不参与）

代码差异视图直接从 `__raw`（注入的 spine-raw.json）读取完整 diff，不依赖 spine.json 的精选行：

1. **左侧文件树**：A/M 状态标 + 完整文件名 + 增删统计（+N −M）
2. **右侧按方法分组**：
   - 方法检测：只匹配 `public/private/protected` 开头 + `{` 结尾的真正方法声明
   - 方法块标题：`文件名#函数名()` + 起始行号-结束行号 + 变更数
   - **完整方法体渲染**：从签名到闭括号 `}`，非仅 diff 行
   - diff 行（绿 `+` / 红 `−`）嵌在方法体中，上下文行灰显
   - 方法体内长段未变更区域折叠：`⋯ N 行未变更 ⋯`（保留 diff 前后各 2 行）
   - **方法体最后 5 行永不折叠**（确保 `return` 和 `}` 始终可见）
3. **属性与导入**独立分组（📦 标识），不散落在方法间

## 字段语义要点

- `via` = 进入"块所在方法"的调用链，每跳 = 一个调用点（语义：调用方#方法 → 被调方法，ln 为调用行）
- `snippet.code` 必须保留真实缩进（从 raw content 回读，禁止手打）
- `in` = 变更发生的方法名；跨方法块写 "A 调用 · B 定义"
- `calls[].at` = 调用点定位 `{path, line, code}`；`calls[].def` = 被调方定义 `{line, snippet}`
- `paramChanged` / `pcNote` = 方法签名变更标记，渲染为琥珀色标签提醒评审关注
- audit 校验：行号回读（±4 容差）、越界、kind 合法性——不过即打回

## 产物归档规则

所有产出文件统一存放在 `.codespine/<分支名>/` 目录：

```
.codespine/
├── feat-HR-9701-xxx/
│   ├── spine-raw.json    # ct 产出
│   ├── spine.json        # AI 分析产出
│   └── review.html       # render 产出
└── local-jitui-xxx/
    └── ...
```

- 分支名中的 `/` 等特殊字符自动转 `-`
- `ct` 自动创建目录（含 `.gitignore` y/n 交互）
- `audit` 默认找当前分支目录，`--raw` 默认读同目录快照
- `render` 默认输出到同目录 `review.html`
