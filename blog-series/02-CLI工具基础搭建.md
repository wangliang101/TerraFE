# TerraFE 脚手架开发实战系列（二）：CLI 工具基础搭建

## 前言

在上一篇文章中，我们完成了 TerraFE 脚手架工具的架构设计和技术选型。现在开始进入实战阶段，本文将详细介绍如何从零开始搭建一个现代化的 CLI 工具基础框架。

## CLI 工具开发要点

### 1. Shebang 行的重要性

CLI 工具的第一行必须是 shebang（`#!`），它告诉系统使用哪个解释器来执行脚本：

```javascript
#! /usr/bin/env node
```

这行代码的含义：
- `#!`：shebang 标识符
- `/usr/bin/env node`：使用环境变量中的 node 来执行脚本

### 2. ES 模块的使用

现代 Node.js 项目推荐使用 ES 模块，需要在 `package.json` 中设置：

```json
{
  "type": "module"
}
```

## Commander.js 框架详解

### 基础用法

Commander.js 是最流行的 Node.js 命令行框架，提供了简洁的 API：

```javascript
import { Command } from 'commander';

const program = new Command();

program
  .name('terrafe')
  .description('TerraFE - 现代化前端项目脚手架工具')
  .version('1.0.0');
```

### 命令定义

#### 1. 基础命令

```javascript
program
  .command('create <project-name>')
  .description('创建新项目')
  .action((projectName) => {
    console.log(`创建项目: ${projectName}`);
  });
```

#### 2. 带选项的命令

```javascript
program
  .command('create <project-name>')
  .option('-t, --template <template>', '指定模板')
  .option('-f, --force', '强制覆盖现有目录')
  .action((projectName, options) => {
    console.log('项目名称:', projectName);
    console.log('选项:', options);
  });
```

#### 3. 命令别名

```javascript
program
  .command('create <project-name>')
  .alias('c')  // 支持 terrafe c my-project
  .description('创建新项目');
```

### 全局选项

全局选项在所有命令中都可用：

```javascript
program
  .option('--verbose', '显示详细输出')
  .option('--silent', '静默模式');
```

### 命令分组

对于复杂的 CLI 工具，可以使用子命令：

```javascript
// config 命令组
const configCmd = program
  .command('config')
  .description('配置管理');

configCmd
  .command('list')
  .description('列出所有配置')
  .action(() => {
    // 实现逻辑
  });

configCmd
  .command('set <key> <value>')
  .description('设置配置值')
  .action((key, value) => {
    // 实现逻辑
  });
```

## 实际代码实现

### 1. 入口文件 (bin/index.js)

```javascript
#! /usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 导入命令实现
import { createProject, validateCreateOptions } from '../lib/commands/create.js';
import { configCommand } from '../lib/commands/config.js';
import { templateCommand } from '../lib/commands/template.js';

// 导入工具模块
import logger from '../lib/utils/logger.js';
import errorHandler from '../lib/core/ErrorHandler.js';

// ES 模块中获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 package.json 获取版本信息
async function getVersion() {
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch {
    return '1.0.0';
  }
}

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
      .option('--silent', '静默模式')
      .hook('preAction', (thisCommand, actionCommand) => {
        const options = thisCommand.opts();
        
        if (options.verbose) {
          logger.setVerbose(true);
        }
      });

    // create 命令
    program
      .command('create <project-name>')
      .alias('c')
      .description('创建新项目')
      .option('-t, --template <name>', '指定内置模板名称')
      .option('-r, --repo <repo>', '指定 GitHub 仓库')
      .option('-f, --force', '强制覆盖现有目录')
      .option('-y, --yes', '跳过交互式询问，使用默认值')
      .action(async (projectName, options) => {
        const globalOptions = program.opts();
        const mergedOptions = { ...options, ...globalOptions };

        if (!validateCreateOptions(projectName, mergedOptions)) {
          process.exit(1);
        }

        await createProject(projectName, mergedOptions);
      });

    // 解析命令行参数
    program.parse();
  } catch (error) {
    logger.error('程序执行出错:', error.message);
    process.exit(1);
  }
}

// 欢迎信息
function showWelcome() {
  console.log(chalk.cyan.bold('🌍 TerraFE'));
  console.log(chalk.gray('现代化前端项目脚手架工具'));
  console.log();
}

// 启动程序
main().catch(error => {
  console.error(chalk.red('启动失败:'), error.message);
  process.exit(1);
});
```

### 2. 命令实现 (lib/commands/create.js)

```javascript
import inquirer from 'inquirer';
import chalk from 'chalk';
import { existsSync } from 'fs';
import path from 'path';

import logger from '../utils/logger.js';
import { validateProjectName } from '../utils/validate.js';
import Generator from '../core/Generator.js';

/**
 * 验证 create 命令的选项
 */
export function validateCreateOptions(projectName, options) {
  // 验证项目名称
  const nameValidation = validateProjectName(projectName);
  if (!nameValidation.valid) {
    logger.error('项目名称不合法:', nameValidation.message);
    return false;
  }

  // 检查目录是否存在
  const targetDir = path.resolve(projectName);
  if (existsSync(targetDir) && !options.force) {
    logger.error(`目录 ${projectName} 已存在，使用 --force 选项强制覆盖`);
    return false;
  }

  return true;
}

/**
 * 创建项目
 */
export async function createProject(projectName, options) {
  try {
    logger.info(`开始创建项目: ${chalk.cyan(projectName)}`);

    // 创建生成器实例
    const generator = new Generator(projectName, options);

    // 如果不是 yes 模式，进行交互式询问
    if (!options.yes) {
      const answers = await promptForOptions(options);
      Object.assign(options, answers);
    }

    // 生成项目
    await generator.generate();

    logger.success(`项目 ${chalk.cyan(projectName)} 创建成功！`);
    
    // 显示后续步骤
    showNextSteps(projectName, options);

  } catch (error) {
    logger.error('项目创建失败:', error.message);
    throw error;
  }
}

/**
 * 交互式询问选项
 */
async function promptForOptions(existingOptions) {
  const questions = [];

  // 如果没有指定模板，询问模板选择
  if (!existingOptions.template && !existingOptions.repo) {
    questions.push({
      type: 'list',
      name: 'framework',
      message: '请选择前端框架:',
      choices: [
        { name: 'React', value: 'react' },
        { name: 'Vue 3', value: 'vue' },
        { name: 'Angular', value: 'angular' },
        { name: 'Svelte', value: 'svelte' },
        { name: 'Vanilla JS', value: 'vanilla' }
      ]
    });

    questions.push({
      type: 'confirm',
      name: 'typescript',
      message: '是否使用 TypeScript?',
      default: true
    });
  }

  // 询问包管理器
  if (!existingOptions.packageManager) {
    questions.push({
      type: 'list',
      name: 'packageManager',
      message: '请选择包管理器:',
      choices: [
        { name: 'pnpm (推荐)', value: 'pnpm' },
        { name: 'yarn', value: 'yarn' },
        { name: 'npm', value: 'npm' }
      ],
      default: 'pnpm'
    });
  }

  // 询问是否初始化 Git
  questions.push({
    type: 'confirm',
    name: 'git',
    message: '是否初始化 Git 仓库?',
    default: true,
    when: () => !existingOptions.skipGit
  });

  // 询问是否安装依赖
  questions.push({
    type: 'confirm',
    name: 'install',
    message: '是否立即安装依赖?',
    default: true,
    when: () => !existingOptions.skipInstall
  });

  return await inquirer.prompt(questions);
}

/**
 * 显示后续步骤
 */
function showNextSteps(projectName, options) {
  console.log();
  logger.info('后续步骤:');
  console.log(chalk.gray(`  cd ${projectName}`));
  
  if (!options.install) {
    const pm = options.packageManager || 'npm';
    console.log(chalk.gray(`  ${pm} install`));
  }
  
  console.log(chalk.gray('  npm run dev'));
  console.log();
}
```

### 3. 日志工具 (lib/utils/logger.js)

```javascript
import chalk from 'chalk';

class Logger {
  constructor() {
    this.verbose = false;
  }

  setVerbose(verbose) {
    this.verbose = verbose;
  }

  info(message, ...args) {
    console.log(chalk.blue('ℹ'), message, ...args);
  }

  success(message, ...args) {
    console.log(chalk.green('✓'), message, ...args);
  }

  warn(message, ...args) {
    console.log(chalk.yellow('⚠'), message, ...args);
  }

  error(message, ...args) {
    console.log(chalk.red('✗'), message, ...args);
  }

  debug(message, ...args) {
    if (this.verbose) {
      console.log(chalk.gray('🐛'), message, ...args);
    }
  }

  log(message, ...args) {
    console.log(message, ...args);
  }
}

export default new Logger();
```

### 4. 验证工具 (lib/utils/validate.js)

```javascript
import validateNpmPackageName from 'validate-npm-package-name';

/**
 * 验证项目名称
 */
export function validateProjectName(name) {
  const validation = validateNpmPackageName(name);
  
  if (!validation.validForNewPackages) {
    return {
      valid: false,
      message: validation.errors?.[0] || validation.warnings?.[0] || '项目名称不合法'
    };
  }

  return { valid: true };
}

/**
 * 验证 URL
 */
export function validateUrl(url) {
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return {
      valid: false,
      message: 'URL 格式不正确'
    };
  }
}

/**
 * 验证 GitHub 仓库格式
 */
export function validateGitHubRepo(repo) {
  const pattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
  
  if (!pattern.test(repo)) {
    return {
      valid: false,
      message: 'GitHub 仓库格式应为 owner/repo'
    };
  }

  return { valid: true };
}
```

## 错误处理机制

### 全局错误处理器

```javascript
// lib/core/ErrorHandler.js
import logger from '../utils/logger.js';

class ErrorHandler {
  constructor() {
    this.debugMode = false;
  }

  setDebugMode(debug) {
    this.debugMode = debug;
  }

  installProcessHandlers() {
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error.message);
      if (this.debugMode) {
        console.error(error.stack);
      }
      process.exit(1);
    });

    // 处理未处理的 Promise 拒绝
    process.on('unhandledRejection', (reason) => {
      logger.error('未处理的 Promise 拒绝:', reason);
      if (this.debugMode) {
        console.error(reason);
      }
      process.exit(1);
    });

    // 处理 SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      logger.warn('用户中断操作');
      process.exit(0);
    });
  }

  handleError(error, context = '') {
    if (context) {
      logger.error(`${context}:`, error.message);
    } else {
      logger.error(error.message);
    }

    if (this.debugMode) {
      console.error(error.stack);
    }
  }
}

export default new ErrorHandler();
```

## 测试基础框架

### 基础测试用例

```javascript
// __tests__/commands/create.test.js
import { describe, test, expect } from '@jest/globals';
import { validateCreateOptions } from '../../lib/commands/create.js';

describe('create 命令测试', () => {
  test('应该验证有效的项目名称', () => {
    const result = validateCreateOptions('my-project', {});
    expect(result).toBe(true);
  });

  test('应该拒绝无效的项目名称', () => {
    const result = validateCreateOptions('My Project', {});
    expect(result).toBe(false);
  });

  test('应该拒绝现有目录（无 force 选项）', () => {
    // 模拟现有目录
    const result = validateCreateOptions('existing-dir', {});
    // 这里需要根据实际情况模拟文件系统
  });
});
```

## 开发调试技巧

### 1. 本地测试

在开发过程中，使用 `npm link` 将本地包链接到全局：

```bash
# 在项目根目录
npm link

# 现在可以全局使用 terrafe 命令
terrafe --help
```

### 2. 调试模式

```bash
# 使用 Node.js 调试器
node --inspect bin/index.js create test-project

# 显示详细输出
terrafe create test-project --verbose
```

### 3. 开发脚本

在 `package.json` 中添加开发脚本：

```json
{
  "scripts": {
    "dev": "node bin/index.js",
    "dev:debug": "node --inspect bin/index.js",
    "test:dev": "npm run dev -- create test-project --verbose"
  }
}
```

## 总结

本文详细介绍了 CLI 工具的基础搭建过程，包括：

1. **Commander.js 框架的使用**：命令定义、选项处理、子命令等
2. **ES 模块的实践**：导入导出、文件路径处理
3. **错误处理机制**：全局错误处理器、友好的错误提示
4. **代码结构设计**：模块化的命令实现、工具函数分离
5. **开发调试技巧**：本地测试、调试模式等

在下一篇文章中，我们将深入探讨交互式命令行界面的实现，包括 Inquirer.js 的高级用法和用户体验优化。

## 下期预告

**《TerraFE 脚手架开发实战系列（三）：命令行交互与参数处理》**

- Inquirer.js 高级用法
- 动态问题生成
- 参数验证与转换
- 用户体验优化

---

*如果这篇文章对你有帮助，欢迎点赞和转发。有任何问题或建议，欢迎在评论区讨论！* 