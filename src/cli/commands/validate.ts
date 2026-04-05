import { Command } from 'commander';
import { resolve } from 'node:path';
import { MarkdownGraph } from '../../core/graph.js';

export const validateCommand = new Command('validate')
  .description('校验图的一致性（对应 mg validate）')
  .option('-g, --graph <path>', '图文件路径', 'graphs/main.graph.json')
  .option('--fix', '自动修复（移除断链、补充缺失节点）')
  .action((opts) => {
    const graphPath = resolve(opts.graph);
    let graph: MarkdownGraph;
    try {
      graph = MarkdownGraph.load(graphPath);
    } catch {
      console.error(`错误: 无法加载图文件 "${graphPath}"`);
      process.exit(1);
    }

    let hasErrors = false;
    const baseDir = process.cwd();

    // 1. Broken references
    const broken = graph.getBrokenEdges();
    if (broken.length > 0) {
      hasErrors = true;
      console.log(`\n✗ 断链 (${broken.length}):`);
      for (const { edge, missingIds } of broken) {
        console.log(`  边 "${edge.id}" 引用了不存在的节点: ${missingIds.join(', ')}`);
        if (opts.fix) {
          for (const id of missingIds) {
            // Remove missing IDs from sources/targets/prompt_nodes
            edge.sources = edge.sources.filter(s => s !== id);
            edge.targets = edge.targets.filter(t => t !== id);
            if (edge.prompt_nodes) {
              edge.prompt_nodes = edge.prompt_nodes.filter(p => p !== id);
            }
          }
          // Remove edge if it has no sources AND no targets
          if (edge.targets.length === 0) {
            graph.removeEdge(edge.id);
            console.log(`    → 已删除边 "${edge.id}"（无有效 target）`);
          } else {
            console.log(`    → 已移除无效引用`);
          }
        }
      }
    }

    // 2. Missing files
    const missing = graph.getMissingFiles(baseDir);
    if (missing.length > 0) {
      console.log(`\n⚠ 文件缺失 (${missing.length}):`);
      for (const node of missing) {
        console.log(`  节点 "${node.id}" → ${node.path} (文件不存在)`);
      }
    }

    // 3. Orphan nodes
    const orphans = graph.getOrphanNodes();
    if (orphans.length > 0) {
      console.log(`\n⚠ 孤立节点 (${orphans.length}):`);
      for (const node of orphans) {
        console.log(`  "${node.id}" — 未被任何边引用`);
      }
    }

    // 4. Cycles
    if (graph.hasCycles()) {
      console.log('\n⚠ 检测到循环引用');
    }

    // 5. Duplicate IDs
    const nodeIds = graph.data.nodes.map(n => n.id);
    const dupNodes = nodeIds.filter((id, i) => nodeIds.indexOf(id) !== i);
    if (dupNodes.length > 0) {
      hasErrors = true;
      console.log(`\n✗ 重复节点 ID: ${[...new Set(dupNodes)].join(', ')}`);
    }

    const edgeIds = graph.data.edges.map(e => e.id);
    const dupEdges = edgeIds.filter((id, i) => edgeIds.indexOf(id) !== i);
    if (dupEdges.length > 0) {
      hasErrors = true;
      console.log(`\n✗ 重复边 ID: ${[...new Set(dupEdges)].join(', ')}`);
    }

    // Summary
    if (!hasErrors && missing.length === 0 && orphans.length === 0) {
      console.log('✓ 图校验通过，无问题');
    } else {
      console.log(`\n共 ${graph.data.nodes.length} 节点, ${graph.data.edges.length} 边`);
    }

    if (opts.fix) {
      graph.save();
      console.log('\n✓ 已保存修复后的图');
    }
  });
