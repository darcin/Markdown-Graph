import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { MarkdownGraph } from './graph.js';
import type { HealthReport, HealthIssue, HealthDimensions, SessionHealthReport, SessionHealthDimensions, Edge } from './types.js';

/**
 * Evaluate the health of a document graph.
 */
export function evaluateDesignHealth(graph: MarkdownGraph, baseDir: string): HealthReport {
  const issues: HealthIssue[] = [];
  const suggestions: string[] = [];

  // 1. Coverage: how many files in docs/ are referenced by the graph?
  const docsDir = resolve(baseDir, 'docs');
  let totalDocs = 0;
  let referencedDocs = 0;
  if (existsSync(docsDir)) {
    const allFiles = readdirSync(docsDir, { recursive: true })
      .map(f => String(f))
      .filter(f => f.endsWith('.md'));
    totalDocs = allFiles.length;
    const nodePaths = new Set(graph.data.nodes.map(n => n.path));
    referencedDocs = allFiles.filter(f => nodePaths.has(`docs/${f}`)).length;
  }
  const coverage = totalDocs > 0 ? referencedDocs / totalDocs : 1;

  // Orphan nodes
  const orphans = graph.getOrphanNodes();
  if (orphans.length > 0) {
    issues.push({
      type: 'orphan_node',
      severity: 'warning',
      message: `${orphans.length} 个节点未被任何边引用`,
      related: orphans.map(n => n.id),
    });
    suggestions.push('考虑为孤立节点添加转换边，或移除不需要的节点');
  }

  // 2. Broken refs
  const broken = graph.getBrokenEdges();
  if (broken.length > 0) {
    for (const { edge, missingIds } of broken) {
      issues.push({
        type: 'broken_ref',
        severity: 'error',
        message: `边 "${edge.id}" 引用了不存在的节点: ${missingIds.join(', ')}`,
        related: [edge.id, ...missingIds],
      });
    }
    suggestions.push('修复断链：删除无效引用或补充缺失的节点');
  }

  // 3. Missing files
  const missing = graph.getMissingFiles(baseDir);
  if (missing.length > 0) {
    for (const node of missing) {
      issues.push({
        type: 'missing_file',
        severity: 'error',
        message: `节点 "${node.id}" 的文件不存在: ${node.path}`,
        related: [node.id],
      });
    }
    suggestions.push('创建缺失的文件或更新节点路径');
  }

  // 4. Trace depth (average max ancestor depth per node)
  let totalTraceDepth = 0;
  const nodesWithEdges = graph.data.nodes.filter(
    n => graph.getIncomingEdges(n.id).length > 0 || graph.getOutgoingEdges(n.id).length > 0
  );
  for (const node of nodesWithEdges) {
    const ancestors = graph.getAncestors(node.id);
    totalTraceDepth += ancestors.length;
  }
  const traceDepth = nodesWithEdges.length > 0 ? totalTraceDepth / nodesWithEdges.length : 0;

  // 5. Freshness
  let freshness = 0;
  if (graph.data.edges.length > 0) {
    const timestamps = graph.data.edges
      .filter(e => e.timestamp)
      .map(e => new Date(e.timestamp!).getTime());
    if (timestamps.length > 0) {
      const latest = Math.max(...timestamps);
      const daysSince = (Date.now() - latest) / (1000 * 60 * 60 * 24);
      freshness = Math.max(0, 1 - daysSince / 30); // Decay over 30 days
    }
  }
  if (freshness < 0.3) {
    issues.push({
      type: 'stale',
      severity: 'info',
      message: '图已超过 3 周未更新',
    });
    suggestions.push('图长期未更新，考虑是否有新的文档转换未记录');
  }

  // 6. Review coverage
  const edgesWithReview = graph.data.edges.filter(e => e.review).length;
  const reviewCoverage = graph.data.edges.length > 0
    ? edgesWithReview / graph.data.edges.length
    : 1;
  if (reviewCoverage < 0.5) {
    issues.push({
      type: 'no_review',
      severity: 'warning',
      message: `仅 ${Math.round(reviewCoverage * 100)}% 的边有 review 记录`,
    });
    suggestions.push('为更多的转换添加 review 记录，提高可追溯性');
  }

  // 7. Template ratio
  const edgesWithTemplate = graph.data.edges.filter(e => e.template_ref).length;
  const templateRatio = graph.data.edges.length > 0
    ? edgesWithTemplate / graph.data.edges.length
    : 0;

  // 8. Cycles
  if (graph.hasCycles()) {
    issues.push({
      type: 'cycle',
      severity: 'warning',
      message: '图中存在环，可能导致无限溯源',
    });
    suggestions.push('检查是否存在意外的循环引用');
  }

  // Calculate score
  const dimensions: HealthDimensions = {
    coverage,
    traceDepth: Math.min(traceDepth / 3, 1), // Normalize: 3+ depth = perfect
    brokenLinks: broken.length === 0 && missing.length === 0 ? 1 : Math.max(0, 1 - (broken.length + missing.length) / graph.data.nodes.length),
    freshness,
    reviewCoverage,
    templateRatio,
  };

  const weights = { coverage: 20, traceDepth: 15, brokenLinks: 25, freshness: 15, reviewCoverage: 15, templateRatio: 10 };
  const score = Math.round(
    dimensions.coverage * weights.coverage +
    dimensions.traceDepth * weights.traceDepth +
    dimensions.brokenLinks * weights.brokenLinks +
    dimensions.freshness * weights.freshness +
    dimensions.reviewCoverage * weights.reviewCoverage +
    dimensions.templateRatio * weights.templateRatio
  );

  return { score, dimensions, issues, suggestions };
}

/**
 * Evaluate session health based on a set of edges from one session.
 */
export function evaluateSessionHealth(graph: MarkdownGraph, sessionEdges?: Edge[]): SessionHealthReport {
  const edges = sessionEdges || graph.data.edges;
  const suggestions: string[] = [];
  const splitSuggestions: string[] = [];

  // 1. Context size: number of unique documents referenced
  const allDocs = new Set<string>();
  for (const edge of edges) {
    edge.sources.forEach(s => allDocs.add(s));
    edge.targets.forEach(t => allDocs.add(t));
    edge.prompt_nodes?.forEach(p => allDocs.add(p));
  }
  const uniqueDocsReferenced = allDocs.size;

  // 2. Context size score (more docs = higher context load)
  const contextSize = edges.length;
  const contextScore = Math.max(0, 1 - (contextSize - 5) / 20); // Optimal: 5 edges, degrades after 25

  // 3. Transform type diversity
  const types = new Set(edges.map(e => e.transform.type));
  const transformTypeDiversity = types.size;
  const diversityScore = Math.min(transformTypeDiversity / 3, 1); // Normalize: 3+ types = diverse enough

  // 4. Topic drift: how many different transform types appear sequentially?
  let driftCount = 0;
  for (let i = 1; i < edges.length; i++) {
    if (edges[i].transform.type !== edges[i - 1].transform.type) {
      driftCount++;
    }
  }
  const topicDrift = edges.length > 1 ? driftCount / (edges.length - 1) : 0;

  // 5. Redundancy: duplicate source references
  const sourceFreq = new Map<string, number>();
  for (const edge of edges) {
    for (const src of edge.sources) {
      sourceFreq.set(src, (sourceFreq.get(src) || 0) + 1);
    }
  }
  const duplicateRefs = [...sourceFreq.values()].filter(v => v > 2).length;
  const redundancy = sourceFreq.size > 0 ? duplicateRefs / sourceFreq.size : 0;

  // Suggestions
  if (contextSize > 15) {
    suggestions.push('Session 边数过多，考虑拆分为多个子图');
  }
  if (uniqueDocsReferenced > 10) {
    suggestions.push('引用文档过多，上下文可能已过载');
  }
  if (topicDrift > 0.7) {
    suggestions.push('主题漂移严重，建议将不同方向的工作拆分为独立 session');

    // Find split points
    for (let i = 1; i < edges.length; i++) {
      if (edges[i].transform.type !== edges[i - 1].transform.type) {
        splitSuggestions.push(
          `在边 "${edges[i - 1].id}" 和 "${edges[i].id}" 之间拆分（${edges[i - 1].transform.type} → ${edges[i].transform.type}）`
        );
      }
    }
  }
  if (redundancy > 0.3) {
    suggestions.push('存在较多重复引用，考虑合并相关操作');
  }

  // Score
  const dimensions: SessionHealthDimensions = {
    contextSize: Math.max(0, contextScore),
    uniqueDocsReferenced,
    transformTypeDiversity,
    topicDrift,
    redundancy,
  };

  const score = Math.round(
    contextScore * 30 +
    diversityScore * 20 +
    (1 - topicDrift) * 25 +
    (1 - redundancy) * 25
  );

  return { score: Math.max(0, Math.min(100, score)), dimensions, splitSuggestions, suggestions };
}
