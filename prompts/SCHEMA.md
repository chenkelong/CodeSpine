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
meta:      { title, branch, files, additions, deletions, summary, generatedBy }
entries[]: # 每个受影响 HTTP 入口一条链（+1 个特殊链路入口）
  id / http / path / urls[] / group
  state: grey(入口未变更,下游有变更) | solid(入口自身变更)
  impact / impactNote
  params: { dto, state, note, newFields[], objects[{name, where, note, path, fields[{n,k(new|modified|deleted),t,d}]}] }
  chain[]: # 节点树
    cls / kind(new|changed|unchanged|external) / method / path / stats[a,d]
    badge?            # 复用创建链 / @Autowired 嵌套 / static 契约
    refOnly?          # 枢纽去重：第二次出现折叠为引用芯片
    hub? / hot?
    callLines[]       # 未变更节点：≤3 行关键调用 {ln, text, next}
    blocks[]          # 平铺逻辑块（普通方法）
    phases[]          # 大方法一层分组 {name, blocks[]}
      block: { name(动宾短语), in(所在方法), range("L393-403"), kind(new|changed),
               desc, via[{m, ln, path}], snippet[{ln, k(+|-|空), code}], calls[{fn, kind, d, at?, def?}] }
    children[]        # 下游节点
  exit: { response, responseChanged, persistence?, newFields[] }
orphans[]: # 未挂链变更（特殊链路） cls / kind / stats / reason / note / blocks
coverage:  { total, chained, strip, note, inventory[{cls, type, loc}] }
```

## 字段语义要点

- `via` = 进入"块所在方法"的调用链，每跳 = 一个调用点（语义：调用方#方法 → 被调方法，ln 为调用行）
- `snippet.code` 必须保留真实缩进（从 raw content 回读，禁止手打）
- `in` = 变更发生的方法名；跨方法块写 "A 调用 · B 定义"
- audit 校验：行号回读（±4 容差）、越界、kind 合法性——不过即打回
