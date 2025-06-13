#! /usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 导入命令实现
import { createProject, validateCreateOptions } from '../lib/commands/create.js';
import { configCommand, showConfigHelp } from '../lib/commands/config.js';
import { templateCommand, showTemplateHelp } from '../lib/commands/template.js';

// 导入核心模块
import logger from '../lib/utils/logger.js';
import errorHandler from '../lib/core/ErrorHandler.js';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取package.json获取版本信息
async function getVersion() {
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch {
    return '1.0.0';
  }
}

// 主程序
async function main() {
  try {
    // 安装全局错误处理器
    errorHandler.installProcessHandlers();

    const program = new Command();
    const version = await getVersion();

    // 程序基本信息
    program
      .name('terrafe')
      .description('TerraFE - 现代化前端项目脚手架工具')
      .version(version, '-v, --version', '显示版本号')
      .helpOption('-h, --help', '显示帮助信息');

    // 全局选项
    program
      .option('--verbose', '显示详细输出')
      .option('--silent', '静默模式，减少输出')
      .hook('preAction', (thisCommand, actionCommand) => {
        const options = thisCommand.opts();

        // 设置日志级别
        if (options.verbose) {
          logger.setVerbose(true);
          errorHandler.setDebugMode(true);
        }

        if (options.silent) {
          // 可以在这里设置静默模式的逻辑
        }
      });

    // create 命令
    program
      .command('create <project-name>')
      .alias('c')
      .description('创建新项目')
      .option('-t, --template <name>', '指定内置模板名称')
      .option('-p, --template-path <path>', '指定本地模板路径')
      .option('-r, --repo <repo>', '指定 GitHub 仓库 (owner/repo)')
      .option('-m, --package-manager <pm>', '指定包管理器 (auto, npm, yarn, pnpm)', 'auto')
      .option('-d, --description <desc>', '项目描述')
      .option('-a, --author <author>', '项目作者')
      .option('--version <version>', '项目版本', '1.0.0')
      .option('-l, --license <license>', '项目许可证', 'MIT')
      .option('-f, --force', '强制覆盖现有目录')
      .option('-y, --yes', '跳过交互式询问，使用默认值')
      .option('--skip-git', '跳过Git初始化')
      .option('--skip-install', '跳过依赖安装')
      .action(async (projectName, options) => {
        // 合并全局选项
        const globalOptions = program.opts();
        const mergedOptions = { ...options, ...globalOptions };

        // 处理GitHub仓库选项
        if (options.repo) {
          mergedOptions.customRepo = options.repo;
        }

        // 验证参数
        if (!validateCreateOptions(projectName, mergedOptions)) {
          process.exit(1);
        }

        // 执行创建命令
        await createProject(projectName, mergedOptions);
      });

    // config 命令组
    const configCmd = program.command('config').alias('cfg').description('配置管理');

    configCmd
      .command('list')
      .alias('ls')
      .description('列出所有配置')
      .action(async (options) => {
        const globalOptions = program.opts();
        await configCommand('list', null, null, { ...options, ...globalOptions });
      });

    configCmd
      .command('get <key>')
      .description('获取配置值')
      .action(async (key, options) => {
        const globalOptions = program.opts();
        await configCommand('get', key, null, { ...options, ...globalOptions });
      });

    configCmd
      .command('set <key> <value>')
      .description('设置配置值')
      .action(async (key, value, options) => {
        const globalOptions = program.opts();
        await configCommand('set', key, value, { ...options, ...globalOptions });
      });

    configCmd
      .command('delete <key>')
      .alias('del')
      .description('删除配置')
      .action(async (key, options) => {
        const globalOptions = program.opts();
        await configCommand('delete', key, null, { ...options, ...globalOptions });
      });

    configCmd
      .command('reset')
      .description('重置所有配置')
      .option('-f, --force', '强制重置')
      .action(async (options) => {
        const globalOptions = program.opts();
        await configCommand('reset', null, null, { ...options, ...globalOptions });
      });

    configCmd
      .command('export <file>')
      .description('导出配置到文件')
      .action(async (file, options) => {
        const globalOptions = program.opts();
        await configCommand('export', file, null, { ...options, ...globalOptions });
      });

    configCmd
      .command('import <file>')
      .description('从文件导入配置')
      .action(async (file, options) => {
        const globalOptions = program.opts();
        await configCommand('import', file, null, { ...options, ...globalOptions });
      });

    // 添加配置命令的默认行为
    configCmd.action(() => {
      showConfigHelp();
    });

    // template 命令组
    const templateCmd = program.command('template').alias('tpl').description('模板管理');

    templateCmd
      .command('list')
      .alias('ls')
      .description('列出所有模板')
      .option('--category <type>', '模板类别 (official|community|custom|all)', 'all')
      .action(async (options) => {
        const globalOptions = program.opts();
        await templateCommand('list', null, null, { ...options, ...globalOptions });
      });

    templateCmd
      .command('add [name] [repo]')
      .description('添加自定义模板')
      .option('--description <desc>', '模板描述')
      .option('--tags <tags>', '标签 (用逗号分隔)')
      .option('--no-test', '跳过模板下载测试')
      .action(async (name, repo, options) => {
        const globalOptions = program.opts();
        await templateCommand('add', name, repo, { ...options, ...globalOptions });
      });

    templateCmd
      .command('remove [name]')
      .alias('rm')
      .description('删除模板（支持所有类型）')
      .option('-f, --force', '强制删除')
      .action(async (name, options) => {
        const globalOptions = program.opts();
        await templateCommand('remove', name, null, { ...options, ...globalOptions });
      });

    templateCmd
      .command('restore [category]')
      .description('恢复默认模板 (official|community|all)')
      .option('-f, --force', '强制恢复')
      .action(async (category, options) => {
        const globalOptions = program.opts();
        await templateCommand('restore', category, null, { ...options, ...globalOptions });
      });

    templateCmd
      .command('search <keyword>')
      .description('搜索模板')
      .option('--category <type>', '搜索范围 (official|community|custom|all)', 'all')
      .action(async (keyword, options) => {
        const globalOptions = program.opts();
        await templateCommand('search', keyword, null, { ...options, ...globalOptions });
      });

    templateCmd
      .command('info <name>')
      .description('显示模板详细信息')
      .action(async (name, options) => {
        const globalOptions = program.opts();
        await templateCommand('info', name, null, { ...options, ...globalOptions });
      });

    templateCmd
      .command('test <name>')
      .description('测试模板下载')
      .action(async (name, options) => {
        const globalOptions = program.opts();
        await templateCommand('test', name, null, { ...options, ...globalOptions });
      });

    // 添加模板命令的默认行为
    templateCmd.action(() => {
      showTemplateHelp();
    });

    // 自定义帮助信息
    program.on('--help', () => {
      logger.newLine();
      logger.info('示例:');
      logger.info(`  ${chalk.cyan('terrafe create my-app')}                      创建新项目`);
      logger.info(`  ${chalk.cyan('terrafe create my-vue-app -t vue3')}          使用Vue3模板创建项目`);
      logger.info(`  ${chalk.cyan('terrafe template add my-vue antfu/vitesse')}  添加自定义模板`);
      logger.info(`  ${chalk.cyan('terrafe template list')}                      查看所有模板`);
      logger.info(`  ${chalk.cyan('terrafe config list')}                        查看所有配置`);
      logger.info(`  ${chalk.cyan('terrafe config set packageManager yarn')}    设置包管理器为yarn`);
      logger.newLine();
      logger.info('获取更多帮助:');
      logger.info(`  ${chalk.cyan('terrafe <command> --help')}                   查看命令详细帮助`);
      logger.newLine();
    });

    // 处理未知命令
    program.on('command:*', (operands) => {
      const unknownCommand = operands[0];
      logger.error(`未知命令: ${chalk.red(unknownCommand)}`);
      logger.info(`运行 ${chalk.cyan('terrafe --help')} 查看可用命令`);
      process.exit(1);
    });

    // 如果没有提供任何参数，显示帮助信息
    if (process.argv.length <= 2) {
      showWelcome();
      program.help();
    }

    // 解析命令行参数
    await program.parseAsync(process.argv);
  } catch (error) {
    errorHandler.handle(error);
  }
}

/**
 * 显示欢迎信息
 */
function showWelcome() {
  logger.newLine();
  logger.info(chalk.bold.cyan('🌍 欢迎使用 TerraFE'));
  logger.info(chalk.gray('现代化前端项目脚手架工具'));
  logger.newLine();
}

// 运行主程序
main().catch((error) => {
  errorHandler.handle(error);
});
