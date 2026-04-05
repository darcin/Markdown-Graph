import { Command } from 'commander';
import { resolve } from 'node:path';
import { MarkdownGraph } from '../../core/graph.js';
import { computeStats } from '../../core/analytics.js';

export const statsCommand = new Command('stats')
  .description('统计分析（对应 /stats）')
  .option('-g, --graph <path>', '图文件路径', 'graphs/main.graph.json')
  .option('-f, --format <format>', '输出格式: table | json', 'table')
  .action((opts) => {
    const graphPath = resolve(opts.graph);
    let graph: MarkdownGraph;
    try {
      graph = MarkdownGraph.load(graphPath);
    } catch {
      console.error(`错误: 无法加载图文件 "${graphPath}"`);
      process.exit(1);
    }

    const stats = computeStats(graph);

    if (opts.format === 'json') {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }

    // Table format
    console.log('=== Markdown Graph 统计 ===\n');
    console.log(`节点数: ${stats.nodeCount}`);
    console.log(`边数:   ${stats.edgeCount}`);

    console.log('\n--- 转换类型分布 ---');
    const sortedTypes = Object.entries(stats.transformDistribution)
      .sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedTypes) {
      const bar = '█'.repeat(Math.ceil(count / Math.max(...Object.values(stats.transformDistribution)) * 20));
      console.log(`  ${type.padEnd(12)} ${bar} ${count}`);
    }

    console.log('\n--- 模型分布 ---');
    for (const [model, count] of Object.entries(stats.modelDistribution)) {
      console.log(`  ${model.padEnd(20)} ${count}`);
    }

    console.log('\n--- Agent 分布 ---');
    for (const [agent, count] of Object.entries(stats.agentDistribution)) {
      console.log(`  ${agent.padEnd(20)} ${count}`);
    }

    if (stats.adoptionRate > 0) {
      console.log(`\n采纳率: ${(stats.adoptionRate * 100).toFixed(1)}%`);
    }
    if (stats.avgRevisionRounds > 0) {
      console.log(`平均修订轮数: ${stats.avgRevisionRounds.toFixed(1)}`);
    }

    if (stats.topNodes.length > 0) {
      console.log('\n--- 最活跃节点 ---');
      for (const n of stats.topNodes.slice(0, 5)) {
        console.log(`  ${(n.title || n.id).padEnd(30)} 入度=${n.inDegree} 出度=${n.outDegree}`);
      }
    }
  });
