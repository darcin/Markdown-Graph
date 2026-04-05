import { Command } from 'commander';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { MarkdownGraph } from '../../core/graph.js';
import type { Edge, GraphNode, TransformType } from '../../core/types.js';
import { TRANSFORM_TYPES } from '../../core/types.js';

export const recordCommand = new Command('record')
  .description('记录一条转换边（对应 /record）')
  .requiredOption('-t, --type <type>', `转换类型: ${TRANSFORM_TYPES.join(', ')}`)
  .requiredOption('-s, --source <files...>', '输入文件路径')
  .requiredOption('-o, --target <files...>', '输出文件路径')
  .option('-p, --prompt-file <files...>', 'Prompt 文件路径（作为 prompt_nodes）')
  .option('-d, --description <text>', '转换描述')
  .option('-m, --model <model>', '使用的模型')
  .option('-a, --agent <agent>', '使用的 agent')
  .option('--skills <skills...>', '使用的 skills')
  .option('--prompt <summary>', 'Prompt 摘要')
  .option('--session <id>', 'Session ID')
  .option('--supersedes <ids...>', '取代的前序边 ID')
  .option('--attempt <n>', '第几次尝试', parseInt)
  .option('-g, --graph <path>', '图文件路径', 'graphs/main.graph.json')
  .action((opts) => {
    const type = opts.type as TransformType;
    if (!TRANSFORM_TYPES.includes(type)) {
      console.error(`错误: 无效的转换类型 "${type}"。可选: ${TRANSFORM_TYPES.join(', ')}`);
      process.exit(1);
    }

    const graphPath = resolve(opts.graph);
    let graph: MarkdownGraph;
    try {
      graph = MarkdownGraph.load(graphPath);
    } catch {
      console.error(`错误: 无法加载图文件 "${graphPath}"。请先运行 \`mg init\``);
      process.exit(1);
    }

    const timestamp = new Date().toISOString();
    const suffix = randomBytes(3).toString('hex');
    const edgeId = `e-${timestamp.slice(0, 10).replace(/-/g, '')}-${suffix}`;

    // Auto-create nodes for source/target files
    const ensureNode = (filePath: string): string => {
      const nodeId = `n-${filePath.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')}`;
      if (!graph.getNode(nodeId)) {
        const node: GraphNode = {
          id: nodeId,
          path: filePath,
          title: filePath.split('/').pop()?.replace(/\.\w+$/, '') || filePath,
          created_at: timestamp,
        };
        graph.addNode(node);
        console.log(`✓ 创建节点 "${nodeId}" → ${filePath}`);
      }
      return nodeId;
    };

    const sourceIds = (opts.source as string[]).map(ensureNode);
    const targetIds = (opts.target as string[]).map(ensureNode);
    const promptNodeIds = opts.promptFile
      ? (opts.promptFile as string[]).map(ensureNode)
      : undefined;

    const edge: Edge = {
      id: edgeId,
      sources: sourceIds,
      ...(promptNodeIds && { prompt_nodes: promptNodeIds }),
      targets: targetIds,
      transform: {
        type,
        description: opts.description,
        agent: opts.agent,
        model: opts.model,
        skills: opts.skills,
        prompt_summary: opts.prompt,
      },
      ...(opts.session && { session_id: opts.session }),
      ...(opts.supersedes && { supersedes: opts.supersedes }),
      ...(opts.attempt && { attempt: opts.attempt }),
      timestamp,
    };

    graph.addEdge(edge);
    graph.save();

    console.log(`✓ 记录边 "${edgeId}": [${sourceIds.join(', ')}] --${type}--> [${targetIds.join(', ')}]`);
  });
