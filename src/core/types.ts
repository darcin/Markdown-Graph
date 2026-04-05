// ============================================================
// Markdown Graph — Core Type Definitions
// Generated from JSON Schema in /schema/
// ============================================================

export type TransformType =
  | 'extract' | 'expand' | 'create' | 'rewrite'
  | 'merge' | 'compare' | 'compress' | 'split'
  | 'translate' | 'format' | 'annotate'
  | 'analyze' | 'project' | 'decide' | 'decompose' | 'verify'
  | 'chain' | 'custom';

export const TRANSFORM_TYPES: TransformType[] = [
  'extract', 'expand', 'create', 'rewrite',
  'merge', 'compare', 'compress', 'split',
  'translate', 'format', 'annotate',
  'analyze', 'project', 'decide', 'decompose', 'verify',
  'chain', 'custom',
];

// ---- Node ----

export type SourceType = 'file' | 'paste' | 'clipboard' | 'stdin';

export interface GraphNode {
  id: string;
  path: string;
  title?: string;
  tags?: string[];
  created_at?: string;
  checksum?: string;
  source_type?: SourceType;
  phantom?: boolean;
  metadata?: Record<string, unknown>;
}

// ---- Transform ----

export interface Transform {
  type: TransformType;
  description?: string;
  agent?: string;
  model?: string;
  skills?: string[];
  prompt_summary?: string;
}

// ---- Review ----

export interface QAPair {
  q: string;
  a: string;
}

export type ReviewStatus = 'accepted' | 'revised' | 'rejected';
export type FinalAction = 'accepted' | 'revised_and_accepted' | 'rejected';

export interface Review {
  status: ReviewStatus;
  revision_notes?: string;
  qa?: QAPair[];
  final_action?: FinalAction;
}

// ---- Analytics ----

export type AdoptionStatus = 'adopted' | 'partial' | 'abandoned';

export interface Adoption {
  status?: AdoptionStatus;
  adopted_ratio?: number;
  time_to_adopt?: string;
  downstream_edges?: string[];
}

export interface QualitySignals {
  revision_count?: number;
  user_rating?: number;
  was_template_created?: boolean;
}

export interface Analytics {
  edge_id: string;
  adoption?: Adoption;
  quality_signals?: QualitySignals;
}

// ---- Edge ----

export interface Edge {
  id: string;
  sources: string[];
  prompt_nodes?: string[];
  targets: string[];
  transform: Transform;
  context?: string;
  session_id?: string;
  supersedes?: string[];
  attempt?: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
  review?: Review;
  analytics?: Analytics;
  template_ref?: string;
}

// ---- Template ----

export interface TemplateTransform {
  type: TransformType;
  prompt_template?: string;
  recommended_model?: string;
  recommended_agent?: string;
  tags?: string[];
}

export interface TemplateMetrics {
  usage_count: number;
  adoption_rate: number;
  avg_revision_rounds: number;
  derived_from?: string | null;
}

export interface EdgeTemplate {
  template_id: string;
  name: string;
  description?: string;
  transform: TemplateTransform;
  metrics?: TemplateMetrics;
}

// ---- Graph ----

export interface GraphData {
  version?: string;
  name?: string;
  description?: string;
  nodes: GraphNode[];
  edges: Edge[];
  metadata?: Record<string, unknown>;
}

// ---- Health ----

export interface HealthDimensions {
  coverage: number;
  traceDepth: number;
  brokenLinks: number;
  freshness: number;
  reviewCoverage: number;
  templateRatio: number;
}

export interface HealthIssue {
  type: 'orphan_node' | 'broken_ref' | 'missing_file' | 'stale' | 'no_review' | 'cycle';
  severity: 'error' | 'warning' | 'info';
  message: string;
  related?: string[];
}

export interface HealthReport {
  score: number;
  dimensions: HealthDimensions;
  issues: HealthIssue[];
  suggestions: string[];
}

export interface SessionHealthDimensions {
  contextSize: number;
  uniqueDocsReferenced: number;
  transformTypeDiversity: number;
  topicDrift: number;
  redundancy: number;
}

export interface SessionHealthReport {
  score: number;
  dimensions: SessionHealthDimensions;
  splitSuggestions: string[];
  suggestions: string[];
}

// ---- Stats ----

export interface StatsReport {
  nodeCount: number;
  edgeCount: number;
  transformDistribution: Record<string, number>;
  modelDistribution: Record<string, number>;
  agentDistribution: Record<string, number>;
  adoptionRate: number;
  avgRevisionRounds: number;
  topNodes: Array<{ id: string; title?: string; inDegree: number; outDegree: number }>;
}

// ---- Mermaid ----

export interface MermaidOptions {
  direction?: 'LR' | 'TB' | 'RL' | 'BT';
  colorByTransformType?: boolean;
  focusNode?: string;
  depth?: number;
  showLabels?: boolean;
}

export interface PromptGraphOptions extends MermaidOptions {
  minUsage?: number;
  templateOnly?: boolean;
}
