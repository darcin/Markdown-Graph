#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { recordCommand } from './commands/record.js';
import { validateCommand } from './commands/validate.js';
import { statsCommand } from './commands/stats.js';
import { vizCommand } from './commands/viz.js';
import { promptGraphCommand } from './commands/prompt-graph.js';
import { designHealthCommand } from './commands/design-health.js';
import { sessionHealthCommand } from './commands/session-health.js';

const program = new Command();

program
  .name('mg')
  .description('Markdown Graph — AI 文档工程的有向图管理工具')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(recordCommand);
program.addCommand(validateCommand);
program.addCommand(statsCommand);
program.addCommand(vizCommand);
program.addCommand(promptGraphCommand);
program.addCommand(designHealthCommand);
program.addCommand(sessionHealthCommand);

program.parse();
