import { Command } from 'commander';
import { resolve } from 'node:path';
import { MarkdownGraph } from '../../core/graph.js';

export const promptGraphCommand = new Command('prompt-graph')
  .description('可视化 Prompt 转换链路图（对应 /promptgraph）')
  .option('-g, --graph <path>', '图文件路径', 'graphs/main.graph.json')
  .option('--template-only', '仅显示已模板化的边')
  .option('--direction <dir>', '图方向: LR | TB', 'LR')
  .option('--file <path>', '输出到文件')
  .action((opts) => {
    const graphPath = resolve(opts.graph);
    let graph: MarkdownGraph;
    try {
      graph = MarkdownGraph.load(graphPath);
    } catch {
      console.error(`错误: 无法加载图文件 "${graphPath}"`);
      process.exit(1);
    }

    const mermaid = graph.toPromptGraph({
      direction: opts.direction,
      templateOnly: opts.templateOnly,
    });

    if (opts.file) {
      const { writeFileSync } = require('node:fs');
      writeFileSync(resolve(opts.file), `\`\`\`mermaid\n${mermaid}\n\`\`\`\n`, 'utf-8');
      console.log(`✓ 已输出到 ${opts.file}`);
    } else {
      console.log(mermaid);
    }
  });
