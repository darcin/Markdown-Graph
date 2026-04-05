import { Command } from 'commander';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const initCommand = new Command('init')
  .description('初始化 Markdown Graph 项目结构')
  .option('-d, --dir <path>', '项目目录', '.')
  .action((opts) => {
    const baseDir = resolve(opts.dir);

    const dirs = ['docs', 'graphs', 'templates', 'prompts', 'inline'];
    for (const dir of dirs) {
      const fullPath = resolve(baseDir, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
        console.log(`✓ 创建目录 ${dir}/`);
      } else {
        console.log(`· 目录已存在 ${dir}/`);
      }
    }

    // Create empty graph file
    const graphPath = resolve(baseDir, 'graphs', 'main.graph.json');
    if (!existsSync(graphPath)) {
      const emptyGraph = {
        version: '0.1.0',
        name: 'main',
        description: '',
        nodes: [],
        edges: [],
      };
      writeFileSync(graphPath, JSON.stringify(emptyGraph, null, 2) + '\n', 'utf-8');
      console.log('✓ 创建 graphs/main.graph.json');
    } else {
      console.log('· graphs/main.graph.json 已存在');
    }

    console.log('\n初始化完成。使用 `mg record` 记录第一条边。');
  });
