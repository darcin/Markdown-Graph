import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { GraphData, GraphNode, Edge, MermaidOptions, PromptGraphOptions } from './types.js';

export class MarkdownGraph {
  public data: GraphData;
  private filePath?: string;

  constructor(data?: Partial<GraphData>, filePath?: string) {
    this.data = {
      version: '0.1.0',
      nodes: [],
      edges: [],
      ...data,
    };
    this.filePath = filePath;
  }

  // ---- Load / Save ----

  static load(path: string): MarkdownGraph {
    const abs = resolve(path);
    const raw = readFileSync(abs, 'utf-8');
    const data = JSON.parse(raw) as GraphData;
    return new MarkdownGraph(data, abs);
  }

  static loadAll(dir: string): MarkdownGraph {
    const { readdirSync } = await_import_fs();
    const files = readdirSync(dir).filter(f => f.endsWith('.graph.json'));
    const merged = new MarkdownGraph();
    for (const f of files) {
      const g = MarkdownGraph.load(resolve(dir, f));
      merged.data.nodes.push(...g.data.nodes);
      merged.data.edges.push(...g.data.edges);
    }
    return merged;
  }

  save(path?: string): void {
    const target = path ? resolve(path) : this.filePath;
    if (!target) throw new Error('No file path specified');
    writeFileSync(target, JSON.stringify(this.data, null, 2) + '\n', 'utf-8');
    this.filePath = target;
  }

  // ---- CRUD ----

  addNode(node: GraphNode): void {
    if (this.data.nodes.some(n => n.id === node.id)) {
      throw new Error(`Node "${node.id}" already exists`);
    }
    this.data.nodes.push(node);
  }

  addEdge(edge: Edge): void {
    if (this.data.edges.some(e => e.id === edge.id)) {
      throw new Error(`Edge "${edge.id}" already exists`);
    }
    this.data.edges.push(edge);
  }

  removeNode(id: string): void {
    this.data.nodes = this.data.nodes.filter(n => n.id !== id);
  }

  removeEdge(id: string): void {
    this.data.edges = this.data.edges.filter(e => e.id !== id);
  }

  // ---- Query ----

  getNode(id: string): GraphNode | undefined {
    return this.data.nodes.find(n => n.id === id);
  }

  getEdge(id: string): Edge | undefined {
    return this.data.edges.find(e => e.id === id);
  }

  /** Edges where nodeId appears in targets (edges pointing TO this node) */
  getIncomingEdges(nodeId: string): Edge[] {
    return this.data.edges.filter(e => e.targets.includes(nodeId));
  }

  /** Edges where nodeId appears in sources (edges FROM this node) */
  getOutgoingEdges(nodeId: string): Edge[] {
    return this.data.edges.filter(e => e.sources.includes(nodeId));
  }

  /** Get ancestor nodes up to a given depth */
  getAncestors(nodeId: string, depth = Infinity): GraphNode[] {
    const visited = new Set<string>();
    const queue: Array<{ id: string; d: number }> = [{ id: nodeId, d: 0 }];
    const result: GraphNode[] = [];

    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (d > depth) continue;

      const incoming = this.getIncomingEdges(id);
      for (const edge of incoming) {
        for (const srcId of edge.sources) {
          if (!visited.has(srcId)) {
            visited.add(srcId);
            const node = this.getNode(srcId);
            if (node) result.push(node);
            queue.push({ id: srcId, d: d + 1 });
          }
        }
      }
    }
    return result;
  }

  /** Get descendant nodes up to a given depth */
  getDescendants(nodeId: string, depth = Infinity): GraphNode[] {
    const visited = new Set<string>();
    const queue: Array<{ id: string; d: number }> = [{ id: nodeId, d: 0 }];
    const result: GraphNode[] = [];

    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (d > depth) continue;

      const outgoing = this.getOutgoingEdges(id);
      for (const edge of outgoing) {
        for (const tgtId of edge.targets) {
          if (!visited.has(tgtId)) {
            visited.add(tgtId);
            const node = this.getNode(tgtId);
            if (node) result.push(node);
            queue.push({ id: tgtId, d: d + 1 });
          }
        }
      }
    }
    return result;
  }

  /** Nodes not referenced by any edge (neither as source, target, nor prompt_node) */
  getOrphanNodes(): GraphNode[] {
    const referenced = new Set<string>();
    for (const edge of this.data.edges) {
      edge.sources.forEach(s => referenced.add(s));
      edge.targets.forEach(t => referenced.add(t));
      edge.prompt_nodes?.forEach(p => referenced.add(p));
    }
    return this.data.nodes.filter(n => !referenced.has(n.id));
  }

  /** Edges referencing non-existent node IDs (in sources, targets, or prompt_nodes) */
  getBrokenEdges(): Array<{ edge: Edge; missingIds: string[] }> {
    const nodeIds = new Set(this.data.nodes.map(n => n.id));
    const result: Array<{ edge: Edge; missingIds: string[] }> = [];
    for (const edge of this.data.edges) {
      const missing = [
        ...edge.sources.filter(s => !nodeIds.has(s)),
        ...edge.targets.filter(t => !nodeIds.has(t)),
        ...(edge.prompt_nodes || []).filter(p => !nodeIds.has(p)),
      ];
      if (missing.length > 0) {
        result.push({ edge, missingIds: missing });
      }
    }
    return result;
  }

  /** Detect cycles using DFS */
  hasCycles(): boolean {
    const adjList = new Map<string, string[]>();
    for (const edge of this.data.edges) {
      for (const src of edge.sources) {
        if (!adjList.has(src)) adjList.set(src, []);
        adjList.get(src)!.push(...edge.targets);
      }
    }

    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const n of this.data.nodes) color.set(n.id, WHITE);

    const dfs = (u: string): boolean => {
      color.set(u, GRAY);
      for (const v of (adjList.get(u) || [])) {
        if (color.get(v) === GRAY) return true;
        if (color.get(v) === WHITE && dfs(v)) return true;
      }
      color.set(u, BLACK);
      return false;
    };

    for (const n of this.data.nodes) {
      if (color.get(n.id) === WHITE && dfs(n.id)) return true;
    }
    return false;
  }

  /** Nodes whose file path doesn't exist on disk (skips phantom nodes) */
  getMissingFiles(baseDir: string): GraphNode[] {
    return this.data.nodes.filter(n => {
      if (n.phantom) return false;
      const fullPath = resolve(baseDir, n.path);
      return !existsSync(fullPath);
    });
  }

  // ---- Mermaid ----

  toMermaid(options: MermaidOptions = {}): string {
    const { direction = 'LR', showLabels = true, focusNode, depth } = options;
    let nodes = this.data.nodes;
    let edges = this.data.edges;

    // Focus mode: only show nodes within N hops
    if (focusNode && depth !== undefined) {
      const relevantIds = new Set<string>([focusNode]);
      const ancestors = this.getAncestors(focusNode, depth);
      const descendants = this.getDescendants(focusNode, depth);
      ancestors.forEach(n => relevantIds.add(n.id));
      descendants.forEach(n => relevantIds.add(n.id));
      nodes = this.data.nodes.filter(n => relevantIds.has(n.id));
      edges = this.data.edges.filter(e =>
        e.sources.some(s => relevantIds.has(s)) && e.targets.some(t => relevantIds.has(t))
      );
    }

    const lines: string[] = [`graph ${direction}`];

    // Node definitions
    for (const node of nodes) {
      const label = node.title || node.id;
      lines.push(`    ${sanitizeMermaidId(node.id)}["${escapeMermaid(label)}"]`);
    }

    // Edge definitions
    for (const edge of edges) {
      const label = showLabels ? edge.transform.type : '';
      for (const src of edge.sources) {
        for (const tgt of edge.targets) {
          if (label) {
            lines.push(`    ${sanitizeMermaidId(src)} -->|${escapeMermaid(label)}| ${sanitizeMermaidId(tgt)}`);
          } else {
            lines.push(`    ${sanitizeMermaidId(src)} --> ${sanitizeMermaidId(tgt)}`);
          }
        }
      }
      // Prompt nodes: dashed lines
      if (edge.prompt_nodes) {
        for (const pn of edge.prompt_nodes) {
          for (const tgt of edge.targets) {
            lines.push(`    ${sanitizeMermaidId(pn)} -.->|prompt| ${sanitizeMermaidId(tgt)}`);
          }
        }
      }
    }

    return lines.join('\n');
  }

  toPromptGraph(options: PromptGraphOptions = {}): string {
    const { direction = 'LR', minUsage, templateOnly } = options;
    let edges = this.data.edges;

    if (templateOnly) {
      edges = edges.filter(e => e.template_ref);
    }

    const lines: string[] = [`graph ${direction}`];

    for (const node of this.data.nodes) {
      const label = node.title || node.id;
      lines.push(`    ${sanitizeMermaidId(node.id)}["${escapeMermaid(label)}"]`);
    }

    for (const edge of edges) {
      const label = edge.transform.prompt_summary || edge.transform.description || edge.transform.type;
      for (const src of edge.sources) {
        for (const tgt of edge.targets) {
          lines.push(`    ${sanitizeMermaidId(src)} -->|"${escapeMermaid(label)}"| ${sanitizeMermaidId(tgt)}`);
        }
      }
      // Prompt nodes with dashed lines
      if (edge.prompt_nodes) {
        for (const pn of edge.prompt_nodes) {
          for (const tgt of edge.targets) {
            lines.push(`    ${sanitizeMermaidId(pn)} -.->|"${escapeMermaid(label)}"| ${sanitizeMermaidId(tgt)}`);
          }
        }
      }
    }

    return lines.join('\n');
  }
}

// ---- Helpers ----

function sanitizeMermaidId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function escapeMermaid(text: string): string {
  return text.replace(/"/g, '#quot;').replace(/\n/g, ' ');
}

// Dynamic import helper for fs (synchronous readdirSync)
function await_import_fs() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('node:fs') as typeof import('node:fs');
}
