**English** | [中文](README.zh-CN.md)

# Markdown Graph

> Model AI conversations as a directed graph for traceable markdown document engineering.

## Core Idea

Each round of AI conversation is essentially a transformation function:

```
f(x, y, z, ...) → x', y', ...
```

- **Node**: A Markdown document (or document fragment) — a vertex in the graph
- **Directed Edge**: A conversation / transformation operation — connecting input documents to output documents
- **Edge Properties**: Full context of the transformation — agent, model, skills, transform type, prompt summary, etc.

With this model, every document evolution becomes traceable, reproducible, branchable, and mergeable.

## Data Model

```
┌─────────┐    Edge (conversation)     ┌─────────┐
│  doc_a   │ ──────────────────────────→│  doc_a'  │
│  doc_b   │   transform: "merge"      │          │
│  doc_c   │   agent: "copilot"        └─────────┘
└─────────┘   model: "claude-opus-4"
              skills: ["writing"]
```

### Node

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `path` | string | Relative path to the document |
| `title` | string | Document title |
| `tags` | string[] | Tags for categorization |
| `created_at` | ISO 8601 | Creation timestamp |
| `checksum` | string | Content hash for version tracking |

### Edge

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `sources` | string[] | Input node IDs |
| `targets` | string[] | Output node IDs |
| `transform` | Transform | Transformation descriptor |
| `context` | string | Additional context / system prompt summary |
| `timestamp` | ISO 8601 | Execution timestamp |

### Transform

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Transform type (see enumeration below) |
| `description` | string | Directional description of this conversation |
| `agent` | string | Agent used |
| `model` | string | Model used |
| `skills` | string[] | Skills / plugins invoked |
| `prompt_summary` | string | Brief summary of the prompt |

### Transform Types

| Type | Description | Example |
|------|-------------|---------|
| `extract` | Extract / Summarize | Extract key points from a long article |
| `expand` | Expand | Expand an outline into full paragraphs |
| `create` | Create | Generate a document from scratch |
| `rewrite` | Rewrite | Adjust style, tone, or format |
| `merge` | Merge | Combine multiple documents into one |
| `compare` | Compare | Generate comparative analysis |
| `compress` | Compress | Condense content |
| `split` | Split | Break one document into multiple |
| `translate` | Translate | Language conversion |
| `format` | Format | Convert to Markdown tables, lists, etc. |
| `annotate` | Annotate | Add notes and comments |
| `chain` | Chain | Multi-step composite transformation |
| `custom` | Custom | Other unlisted transform types |

## Project Structure

```
markdown-graph/
├── README.md                   # This file (English)
├── README.zh-CN.md             # 中文版
├── schema/
│   ├── node.schema.json        # Node JSON Schema
│   ├── edge.schema.json        # Edge JSON Schema
│   └── graph.schema.json       # Graph JSON Schema (references above)
├── docs/                       # Document node storage
│   └── .gitkeep
├── graphs/                     # Graph definition files
│   └── example.graph.json      # Example graph
└── examples/                   # Usage examples
    └── simple-merge/           # Example: merging two documents
        ├── input-a.md / input-a.en.md
        ├── input-b.md / input-b.en.md
        ├── output.md / output.en.md
        └── edge.json
```

## Quick Start

1. Place your Markdown documents in `docs/`
2. Create graph definition files in `graphs/` to describe transformation relationships
3. After each AI conversation, record an edge in the graph

```jsonc
// graphs/my-project.graph.json
{
  "nodes": [
    { "id": "n1", "path": "docs/raw-notes.md", "title": "Raw Notes" },
    { "id": "n2", "path": "docs/summary.md", "title": "Refined Summary" }
  ],
  "edges": [
    {
      "id": "e1",
      "sources": ["n1"],
      "targets": ["n2"],
      "transform": {
        "type": "extract",
        "description": "Extract core insights from raw notes",
        "agent": "copilot",
        "model": "claude-opus-4",
        "skills": [],
        "prompt_summary": "Extract key information, preserve core arguments"
      },
      "timestamp": "2026-04-05T10:00:00Z"
    }
  ]
}
```

## Design Philosophy

- **Docs as Code**: Manage document versions with Git, describe relationships with JSON
- **Traceable**: Every transformation has complete context records
- **Composable**: Transformations can be chained to build complex document engineering pipelines
- **Model-agnostic**: Not tied to any specific AI model or tool, focused on transformation description
- **Progressive**: Start with manual recording, build automation tools later

## Roadmap

- [x] Data model design & Schema definitions
- [ ] CLI tool: automatically record conversations as edges
- [ ] Graph visualization (Mermaid / D3.js)
- [ ] VS Code extension: auto-append edges after conversations
- [ ] Graph validation & consistency checks
- [ ] Subgraph / template reuse support

## License

MIT
