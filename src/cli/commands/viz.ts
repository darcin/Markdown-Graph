import { Command } from 'commander';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { MarkdownGraph } from '../../core/graph.js';

export const vizCommand = new Command('viz')
  .description('可视化文档关系图（对应 /markdowngraph）')
  .option('-g, --graph <path>', '图文件路径', 'graphs/main.graph.json')
  .option('-o, --output <type>', '输出类型: mermaid | html', 'mermaid')
  .option('--direction <dir>', '图方向: LR | TB | RL | BT', 'LR')
  .option('--focus <nodeId>', '聚焦到某个节点')
  .option('--depth <n>', '聚焦时的跳数深度', '3')
  .option('--no-labels', '不显示边标签')
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

    const mermaid = graph.toMermaid({
      direction: opts.direction,
      showLabels: opts.labels !== false,
      focusNode: opts.focus,
      depth: opts.focus ? parseInt(opts.depth) : undefined,
    });

    if (opts.output === 'html') {
      const html = generateHtml(mermaid, graph.data.name || 'Markdown Graph');
      if (opts.file) {
        writeFileSync(resolve(opts.file), html, 'utf-8');
        console.log(`✓ 已输出到 ${opts.file}`);
      } else {
        const defaultPath = 'graph.html';
        writeFileSync(defaultPath, html, 'utf-8');
        console.log(`✓ 已输出到 ${defaultPath}`);
      }
    } else {
      if (opts.file) {
        writeFileSync(resolve(opts.file), `\`\`\`mermaid\n${mermaid}\n\`\`\`\n`, 'utf-8');
        console.log(`✓ 已输出到 ${opts.file}`);
      } else {
        console.log(mermaid);
      }
    }
  });

function generateHtml(mermaidCode: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0; padding: 20px;
      background: #0d1117; color: #c9d1d9;
    }
    h1 { text-align: center; margin-bottom: 30px; }
    .mermaid { display: flex; justify-content: center; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="mermaid">
${mermaidCode}
  </div>
  <script>mermaid.initialize({ startOnLoad: true, theme: 'dark' });</script>
</body>
</html>`;
}
