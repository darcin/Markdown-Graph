import { Command } from 'commander';
import { resolve } from 'node:path';
import { MarkdownGraph } from '../../core/graph.js';
import { evaluateSessionHealth } from '../../core/health.js';

export const sessionHealthCommand = new Command('session-health')
  .description('Session 上下文健康度评估（对应 /sessionhealth）')
  .option('-g, --graph <path>', '图文件路径', 'graphs/main.graph.json')
  .option('--edges <ids...>', '指定 edge ID 集合作为一个 session')
  .option('--last <n>', '分析最近 N 条边', '0')
  .action((opts) => {
    const graphPath = resolve(opts.graph);
    let graph: MarkdownGraph;
    try {
      graph = MarkdownGraph.load(graphPath);
    } catch {
      console.error(`错误: 无法加载图文件 "${graphPath}"`);
      process.exit(1);
    }

    let sessionEdges = graph.data.edges;

    if (opts.edges) {
      const ids = new Set(opts.edges as string[]);
      sessionEdges = graph.data.edges.filter(e => ids.has(e.id));
      if (sessionEdges.length === 0) {
        console.error('错误: 未找到指定的 edge ID');
        process.exit(1);
      }
    } else if (parseInt(opts.last) > 0) {
      const n = parseInt(opts.last);
      sessionEdges = graph.data.edges.slice(-n);
    }

    const report = evaluateSessionHealth(graph, sessionEdges);

    // Score display
    const scoreColor = report.score >= 80 ? '🟢' : report.score >= 50 ? '🟡' : '🔴';
    console.log(`\n${scoreColor} Session 健康度评分: ${report.score}/100\n`);

    // Dimensions
    console.log('--- 各维度 ---');
    const dims = report.dimensions;
    console.log(`  边数:             ${dims.contextSize}`);
    console.log(`  引用文档数:       ${dims.uniqueDocsReferenced}`);
    console.log(`  转换类型多样性:   ${dims.transformTypeDiversity} 种`);
    console.log(`  主题漂移指数:     ${(dims.topicDrift * 100).toFixed(0)}%`);
    console.log(`  冗余度:           ${(dims.redundancy * 100).toFixed(0)}%`);

    // Split suggestions
    if (report.splitSuggestions.length > 0) {
      console.log('\n--- 建议拆分点 ---');
      for (const s of report.splitSuggestions) {
        console.log(`  ✂ ${s}`);
      }
    }

    // Suggestions
    if (report.suggestions.length > 0) {
      console.log('\n--- 优化建议 ---');
      for (const s of report.suggestions) {
        console.log(`  → ${s}`);
      }
    }
  });
