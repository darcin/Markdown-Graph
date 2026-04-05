[English](README.md) | **中文**

# Markdown Graph

> 将 AI 对话建模为有向图，实现 Markdown 文档工程的可追溯管理。

## 核心思想

每一轮 AI 对话本质上是一个转换函数：

```
f(x, y, z, ...) → x', y', ...
```

- **节点 (Node)**：Markdown 文档（或文档片段），是图中的顶点
- **有向边 (Edge)**：一轮对话 / 一次转换操作，连接输入文档到输出文档
- **边属性**：描述这次转换的完整上下文 —— 使用的 agent、model、skills、转换类型、prompt 摘要等

通过这种建模，文档的每一次演变都可被追溯、复现、分支和合并。

## 数据模型

```
┌─────────┐    Edge (conversation)     ┌─────────┐
│  doc_a   │ ──────────────────────────→│  doc_a'  │
│  doc_b   │   transform: "merge"      │          │
│  doc_c   │   agent: "copilot"        └─────────┘
└─────────┘   model: "claude-opus-4"
              skills: ["writing"]
```

### Node（文档节点）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识 |
| `path` | string | 文档相对路径 |
| `title` | string | 文档标题 |
| `tags` | string[] | 标签 |
| `created_at` | ISO 8601 | 创建时间 |
| `checksum` | string | 内容哈希，用于版本追踪 |

### Edge（转换边）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识 |
| `sources` | string[] | 输入节点 ID 列表 |
| `targets` | string[] | 输出节点 ID 列表 |
| `transform` | Transform | 转换描述 |
| `context` | string | 额外上下文 / system prompt 摘要 |
| `timestamp` | ISO 8601 | 执行时间 |

### Transform（转换描述）

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | 转换类型（见下方枚举） |
| `description` | string | 本轮对话的方向性描述 |
| `agent` | string | 使用的 agent |
| `model` | string | 使用的模型 |
| `skills` | string[] | 使用的 skills |
| `prompt_summary` | string | prompt 摘要（非完整 prompt） |

### 转换类型枚举

| 类型 | 说明 | 示例 |
|------|------|------|
| `extract` | 提炼 / 摘要 | 从长文中提取关键点 |
| `expand` | 扩写 | 将大纲扩写为完整段落 |
| `create` | 新建 | 从零开始生成文档 |
| `rewrite` | 改写 | 调整风格、语气、格式 |
| `merge` | 整合 | 多文档合并为一 |
| `compare` | 对比 | 生成对比分析 |
| `compress` | 压缩 | 精简内容 |
| `split` | 拆分 | 一个文档拆为多个 |
| `translate` | 翻译 | 语言转换 |
| `format` | 格式化 | 转为 Markdown 表格、列表等 |
| `annotate` | 标注 | 添加注释、批注 |
| `chain` | 链式 | 多步骤复合转换 |
| `custom` | 自定义 | 其他未列举的转换类型 |

## 项目结构

```
markdown-graph/
├── README.md                   # English version
├── README.zh-CN.md             # 本文件（中文版）
├── schema/
│   ├── node.schema.json        # 节点 JSON Schema
│   ├── edge.schema.json        # 边 JSON Schema
│   └── graph.schema.json       # 图 JSON Schema（引用上述两者）
├── docs/                       # 文档节点存放目录
│   └── .gitkeep
├── graphs/                     # 图定义文件
│   └── example.graph.json      # 示例图
└── examples/                   # 使用示例
    └── simple-merge/           # 示例：合并两个文档
        ├── input-a.md / input-a.en.md
        ├── input-b.md / input-b.en.md
        ├── output.md / output.en.md
        └── edge.json
```

## 快速开始

1. 在 `docs/` 中放置你的 Markdown 文档
2. 在 `graphs/` 中创建图定义文件，描述文档间的转换关系
3. 每次 AI 对话后，记录一条 edge 到图中

```jsonc
// graphs/my-project.graph.json
{
  "nodes": [
    { "id": "n1", "path": "docs/raw-notes.md", "title": "原始笔记" },
    { "id": "n2", "path": "docs/summary.md", "title": "精炼摘要" }
  ],
  "edges": [
    {
      "id": "e1",
      "sources": ["n1"],
      "targets": ["n2"],
      "transform": {
        "type": "extract",
        "description": "从原始笔记中提炼核心观点",
        "agent": "copilot",
        "model": "claude-opus-4",
        "skills": [],
        "prompt_summary": "提取关键信息，保留核心论点"
      },
      "timestamp": "2026-04-05T10:00:00Z"
    }
  ]
}
```

## 设计理念

> 详细设计、入口点和功能路线图，请参阅 [DESIGN.zh-CN.md](DESIGN.zh-CN.md)（[English](DESIGN.md)）

- **文档即代码**：用 Git 管理文档版本，用 JSON 描述文档间关系
- **可追溯**：每次转换都有完整的上下文记录
- **可组合**：转换可以链式组合，构建复杂的文档工程流水线
- **模型无关**：不绑定特定 AI 模型或工具，只关注转换的描述
- **渐进式**：先手动记录，后续可开发工具自动化

## Roadmap

- [x] 数据模型设计 & Schema 定义
- [ ] CLI 工具：自动记录对话为 edge
- [ ] 图可视化（基于 Mermaid / D3.js）
- [ ] VS Code 扩展：对话结束后自动追加 edge
- [ ] 图的校验 & 一致性检查
- [ ] 支持子图 / 模板复用

## License

MIT
