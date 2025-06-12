#! /usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .command('create <app-name>') // 创建命令
  .description('create a new project') // 命令描述
  .action((name, options, cmd) => {
    console.log('执行 create 命令');
  });

program.on('--help', () => {
  console.log();
  console.log(`Run ${chalk.cyan('rippi <command> --help')} to show detail of this command`);
  console.log();
});

program
  // 说明版本
  .version(`terrafe-cli@1.0.0`)
  // 说明使用方式
  .usage('1212');

// 解析用户执行命令传入的参数
program.parse();
