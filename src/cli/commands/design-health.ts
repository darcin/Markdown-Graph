import { Command } from 'commander';
import { resolve } from 'node:path';
import { MarkdownGraph } from '../../core/graph.js';
import { evaluateDesignHealth } from '../../core/health.js';

export const designHealthCommand = new Command('design-health')
  .description('文档健康度 & 可溯源性评估（对应 /designhealth）')
  .option('-g, --graph <path>', '图文件路径', 'graphs/main.graph.json')
  .option('--docs-dir <path>', '文档目录', '.')
  .action((opts) => {
    const graphPath = resolve(opts.graph);
    let graph: MarkdownGraph;
    try {
      graph = MarkdownGraph.load(graphPath);
    } catch {
      console.error(`错误: 无法加载图文件 "${graphPath}"`);
      process.exit(1);
    }

    const baseDir = opts.docsDir === '.' ? process.cwd() : resolve(opts.docsDir);
    const report = evaluateDesignHealth(graph, baseDir);

    // Score display
    const scoreColor = report.score >= 80 ? '🟢' : report.score >= 50 ? '🟡' : '🔴';
    console.log(`\n${scoreColor} 文档健康度评分: ${report.score}/100\n`);

    // Dimensions
    console.log('--- 各维度评分 ---');
    const dims = report.dimensions;
    const dimLabels: Array<[string, number]> = [
      ['覆盖率', dims.coverage],
      ['溯源深度', dims.traceDepth],
      ['链接完整性', dims.brokenLinks],
      ['新鲜度', dims.freshness],
      ['Review 覆盖率', dims.reviewCoverage],
      ['模板化程度', dims.templateRatio],
    ];
    for (const [label, value] of dimLabels) {
      const bar = '█'.repeat(Math.round(value * 20));
      const empty = '░'.repeat(20 - Math.round(value * 20));
      console.log(`  ${label.padEnd(14)} ${bar}${empty} ${(value * 100).toFixed(0)}%`);
    }

    // Issues
    if (report.issues.length > 0) {
      console.log(`\n--- 问题 (${report.issues.length}) ---`);
      for (const issue of report.issues) {
        const icon = issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ';
        console.log(`  ${icon} [${issue.severity}] ${issue.message}`);
      }
    }

    // Suggestions
    if (report.suggestions.length > 0) {
      console.log('\n--- 改进建议 ---');
      for (const s of report.suggestions) {
        console.log(`  → ${s}`);
      }
    }
  });
