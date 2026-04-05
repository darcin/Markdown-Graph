# 实施计划

基于 DESIGN.md 的设计，按依赖顺序逐步实施。

---

## Step 1：补充 Schema（Review + Template + Analytics）

**目标**：完善数据模型，让后续所有功能有统一的数据结构可依赖。

### 1.1 review.schema.json

```jsonc
{
  "status": "accepted | revised | rejected",
  "revision_notes": "string",
  "qa": [{ "q": "string", "a": "string" }],
  "final_action": "accepted | revised_and_accepted | rejected"
}
```

### 1.2 template.schema.json

```jsonc
{
  "template_id": "string",
  "name": "string",
  "transform": { /* 同 edge transform，但 prompt 改为 prompt_template */ },
  "metrics": {
    "usage_count": 0,
    "adoption_rate": 0.0,
    "avg_revision_rounds": 0.0,
    "derived_from": "edge_id | null"
  }
}
```

### 1.3 更新 edge.schema.json

增加可选字段：`review`、`analytics`、`template_ref`。

### 1.4 analytics.schema.json

```jsonc
{
  "edge_id": "string",
  "adoption": { "status", "adopted_ratio", "time_to_adopt", "downstream_edges" },
  "quality_signals": { "revision_count", "user_rating", "was_template_created" }
}
```

**交付物**：`schema/` 下新增 3 个文件，更新 1 个文件。

---

## Step 2：CLI 基础架子（Node.js + TypeScript）

**目标**：搭建 `mg` CLI 框架，实现基础命令。

### 技术选型

- 语言：TypeScript（与后续 VS Code 扩展共享代码）
- CLI 框架：Commander.js（轻量、成熟）
- 包名：`markdown-graph-cli`
- 入口：`mg`

### 目录结构

```
src/
├── cli/
│   ├── index.ts              # CLI 入口
│   ├── commands/
│   │   ├── init.ts           # mg init
│   │   ├── record.ts         # mg record（对应 /record）
│   │   ├── validate.ts       # mg validate
│   │   ├── stats.ts          # mg stats
│   │   ├── viz.ts            # mg viz（对应 /markdowngraph）
│   │   ├── prompt-graph.ts   # mg prompt-graph（对应 /promptgraph）
│   │   ├── design-health.ts  # mg design-health（对应 /designhealth）
│   │   └── session-health.ts # mg session-health（对应 /sessionhealth）
│   └── utils/
│       ├── graph-loader.ts   # 加载/解析 graph.json
│       ├── validator.ts      # Schema 校验
│       └── mermaid.ts        # Mermaid 图生成
├── core/                     # 核心逻辑（CLI 和 VS Code 扩展共享）
│   ├── types.ts              # TypeScript 类型定义
│   ├── graph.ts              # 图操作（CRUD、查询、遍历）
│   ├── health.ts             # 健康度计算
│   ├── analytics.ts          # 采用率分析
│   └── template.ts           # 模板管理
├── package.json
└── tsconfig.json
```

### 命令清单

| 命令 | 实现优先级 | 依赖 |
|------|-----------|------|
| `mg init` | P0 | 无 |
| `mg record` | P0 | graph-loader |
| `mg validate` | P0 | graph-loader, validator |
| `mg stats` | P1 | graph-loader |
| `mg viz` | P1 | graph-loader, mermaid |
| `mg prompt-graph` | P2 | graph-loader, mermaid |
| `mg design-health` | P2 | graph-loader, health |
| `mg session-health` | P2 | graph-loader, health |

---

## Step 3：核心库实现（src/core/）

### 3.1 types.ts — 类型定义

从 JSON Schema 生成 TypeScript 接口：Node, Edge, Transform, Review, Template, Analytics, Graph。

### 3.2 graph.ts — 图操作

```typescript
class MarkdownGraph {
  // 加载
  static load(path: string): MarkdownGraph
  static loadAll(dir: string): MarkdownGraph  // 合并多个 graph.json

  // CRUD
  addNode(node: Node): void
  addEdge(edge: Edge): void
  removeNode(id: string): void
  removeEdge(id: string): void

  // 查询
  getNode(id: string): Node | undefined
  getEdge(id: string): Edge | undefined
  getSourcesOf(nodeId: string): Edge[]       // 哪些边指向这个节点
  getTargetsOf(nodeId: string): Edge[]       // 从这个节点出发的边
  getAncestors(nodeId: string, depth?: number): Node[]  // 溯源
  getDescendants(nodeId: string, depth?: number): Node[]

  // 遍历
  topologicalSort(): Node[]
  findCycles(): Edge[][]
  getOrphanNodes(): Node[]                   // 未被任何边引用的节点
  getBrokenEdges(): Edge[]                   // 引用了不存在节点的边

  // 输出
  toMermaid(options?: MermaidOptions): string
  toJSON(): GraphJSON
  save(path: string): void
}
```

### 3.3 health.ts — 健康度评估

```typescript
interface HealthReport {
  score: number           // 0-100
  dimensions: {
    coverage: number      // docs/ 被图引用的比例
    traceDepth: number    // 平均溯源深度
    brokenLinks: number   // 断链数
    freshness: number     // 最近 edge 的时间距今
    reviewCoverage: number // 有 review 的 edge 比例
    templateRatio: number // 被模板化的比例
  }
  issues: HealthIssue[]   // 具体问题
  suggestions: string[]   // 改进建议
}

function evaluateDesignHealth(graph: MarkdownGraph, docsDir: string): HealthReport
function evaluateSessionHealth(graph: MarkdownGraph, sessionEdges: Edge[]): SessionHealthReport
```

### 3.4 analytics.ts — 采用率分析

```typescript
interface StatsReport {
  nodeCount: number
  edgeCount: number
  transformDistribution: Record<TransformType, number>
  modelDistribution: Record<string, number>
  adoptionRate: number
  avgRevisionRounds: number
  topTemplates: Template[]
}

function computeStats(graph: MarkdownGraph): StatsReport
function computeAdoptionForEdge(edge: Edge): AdoptionMetrics
```

### 3.5 mermaid.ts — Mermaid 图生成

```typescript
interface MermaidOptions {
  direction?: 'LR' | 'TB'
  colorByTransformType?: boolean
  colorByAdoption?: boolean
  focusNode?: string
  depth?: number
  showLabels?: boolean
}

function toMermaid(graph: MarkdownGraph, options?: MermaidOptions): string
function toPromptGraph(graph: MarkdownGraph, options?: PromptGraphOptions): string
```

---

## Step 4：CLI 命令实现

### 4.1 mg init

```
mg init [--dir .]
```
- 创建 `graphs/`、`docs/`、`templates/` 目录
- 创建空的 `graphs/main.graph.json`
- 复制 schema 文件到项目

### 4.2 mg record

```
mg record --type <transform_type> --source <files...> --target <files...> [--description "..."]
```
- 交互式：不传参时逐步提示输入
- 自动生成 edge id（时间戳 + 随机后缀）
- 追加到指定 graph.json（默认 graphs/main.graph.json）
- 自动为新文件创建 node（如果不存在）

### 4.3 mg validate

```
mg validate [--graph <path>] [--fix]
```
- 检查所有节点的 path 指向的文件是否存在
- 检查所有边的 sources/targets 引用的节点是否存在
- 检查是否有环（可选，有些场景允许）
- `--fix`：自动修复（移除断链、补充缺失节点）

### 4.4 mg stats

```
mg stats [--graph <path>] [--format table|json]
```
- 节点数、边数
- Transform type 分布
- 模型分布
- 采用率统计
- 最活跃的文档（入度/出度最高）

### 4.5 mg viz

```
mg viz [--graph <path>] [--output mermaid|html] [--focus <node-id>] [--depth 3]
```
- 默认输出 Mermaid 到 stdout
- `--output html`：生成可交互的 HTML 文件
- 按 transform type 着色

### 4.6 mg prompt-graph

```
mg prompt-graph [--graph <path>] [--min-usage 2]
```
- 以 prompt_summary 为边标签
- 高亮高复用边
- 可过滤低使用次数的边

### 4.7 mg design-health

```
mg design-health [--graph <path>] [--docs-dir docs/]
```
- 输出健康度评分和各维度详情
- 列出具体问题和建议

### 4.8 mg session-health

```
mg session-health [--graph <path>] [--session <edge-ids...>]
```
- 分析指定 edge 集合的 session 健康度
- 如未指定，分析最近一组连续 edge

---

## Step 5：示例完善

- 为每种 transform type 各写一个示例（extract / expand / merge / compare / compress / split / rewrite / format）
- 每个示例包含：input.md → output.md + edge.json
- 写一个完整的多步骤示例（chain），展示文档从原始笔记到最终 PRD 的演变链路

---

## 实施顺序

```
Step 1  Schema       ──→ Step 2  CLI 架子   ──→ Step 3  核心库
  │                          │                      │
  └─ review.schema.json      └─ package.json        └─ types.ts
  └─ template.schema.json    └─ tsconfig.json       └─ graph.ts
  └─ analytics.schema.json   └─ commander setup     └─ health.ts
  └─ edge.schema.json 更新                           └─ analytics.ts
                                                     └─ mermaid.ts
      ↓
Step 4  CLI 命令实现
  │
  └─ P0: init, record, validate
  └─ P1: stats, viz
  └─ P2: prompt-graph, design-health, session-health
      ↓
Step 5  示例完善
```

**预计文件数**：~20 个新文件（4 schema + 1 package.json + 1 tsconfig + ~14 ts 文件）
