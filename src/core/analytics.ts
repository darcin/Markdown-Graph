import { MarkdownGraph } from './graph.js';
import type { StatsReport, Edge } from './types.js';

/**
 * Compute statistics for a graph.
 */
export function computeStats(graph: MarkdownGraph): StatsReport {
  const { nodes, edges } = graph.data;

  // Transform type distribution
  const transformDistribution: Record<string, number> = {};
  for (const edge of edges) {
    const t = edge.transform.type;
    transformDistribution[t] = (transformDistribution[t] || 0) + 1;
  }

  // Model distribution
  const modelDistribution: Record<string, number> = {};
  for (const edge of edges) {
    const m = edge.transform.model || 'unknown';
    modelDistribution[m] = (modelDistribution[m] || 0) + 1;
  }

  // Agent distribution
  const agentDistribution: Record<string, number> = {};
  for (const edge of edges) {
    const a = edge.transform.agent || 'unknown';
    agentDistribution[a] = (agentDistribution[a] || 0) + 1;
  }

  // Adoption rate
  const withReview = edges.filter(e => e.review);
  const accepted = withReview.filter(
    e => e.review!.status === 'accepted' || e.review!.final_action === 'revised_and_accepted'
  );
  const adoptionRate = withReview.length > 0 ? accepted.length / withReview.length : 0;

  // Average revision rounds
  const withAnalytics = edges.filter(e => e.analytics?.quality_signals?.revision_count !== undefined);
  const avgRevisionRounds = withAnalytics.length > 0
    ? withAnalytics.reduce((sum, e) => sum + (e.analytics!.quality_signals!.revision_count || 0), 0) / withAnalytics.length
    : 0;

  // Top nodes by degree
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    for (const t of edge.targets) {
      inDegree.set(t, (inDegree.get(t) || 0) + 1);
    }
    for (const s of edge.sources) {
      outDegree.set(s, (outDegree.get(s) || 0) + 1);
    }
    // Prompt nodes count as outgoing (they are inputs to the edge)
    if (edge.prompt_nodes) {
      for (const p of edge.prompt_nodes) {
        outDegree.set(p, (outDegree.get(p) || 0) + 1);
      }
    }
  }

  const topNodes = nodes
    .map(n => ({
      id: n.id,
      title: n.title,
      inDegree: inDegree.get(n.id) || 0,
      outDegree: outDegree.get(n.id) || 0,
    }))
    .sort((a, b) => (b.inDegree + b.outDegree) - (a.inDegree + a.outDegree))
    .slice(0, 10);

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    transformDistribution,
    modelDistribution,
    agentDistribution,
    adoptionRate,
    avgRevisionRounds,
    topNodes,
  };
}
