import path from 'path';
import logger from '../utils/logger.js';
import validator from '../utils/validate.js';
import generator from '../core/Generator.js';
import config from '../core/Config.js';
import errorHandler from '../core/ErrorHandler.js';

/**
 * create 命令实现
 * @param {string} projectName 项目名称
 * @param {Object} options 命令选项
 */
export async function createProject(projectName, options) {
  try {
    // 加载配置
    await config.load();

    // 设置日志级别
    if (options.verbose) {
      logger.setVerbose(true);
      errorHandler.setDebugMode(true);
    }

    logger.title('🚀 TerraFE 项目创建工具');
    logger.newLine();

    // 验证项目名称
    logger.info(`创建项目: ${logger.highlight(projectName)}`);

    // 准备生成选项
    const generateOptions = {
      force: options.force || false,
      skipGit: options.skipGit || !config.get('gitInit', true),
      skipInstall: options.skipInstall || !config.get('installDeps', true),
      packageManager: options.packageManager || config.get('packageManager', 'npm'),
      template: options.template || 'basic',
      verbose: options.verbose || config.get('verbose', false),
      templateData: {
        projectName,
        description: options.description || '',
        author: options.author || config.get('user.author', ''),
        version: options.version || '1.0.0',
        license: options.license || 'MIT',
      },
    };

    // 如果指定了模板路径
    if (options.templatePath) {
      generateOptions.templatePath = path.resolve(options.templatePath);
    }

    logger.debug('生成选项:', generateOptions);

    // 执行项目生成
    await generator.generate(projectName, generateOptions);
  } catch (error) {
    errorHandler.handle(error);
  }
}

/**
 * 验证create命令参数
 * @param {string} projectName 项目名称
 * @param {Object} options 选项
 * @returns {boolean} 验证结果
 */
export function validateCreateOptions(projectName, options) {
  // 验证项目名称
  if (!projectName) {
    logger.error('请提供项目名称');
    logger.info('使用方法: terrafe create <project-name>');
    return false;
  }

  // 验证包管理器
  if (options.packageManager) {
    const validManagers = ['npm', 'yarn', 'pnpm'];
    if (!validManagers.includes(options.packageManager)) {
      logger.error(`无效的包管理器: ${options.packageManager}`);
      logger.info(`支持的包管理器: ${validManagers.join(', ')}`);
      return false;
    }
  }

  // 验证模板路径
  if (options.templatePath) {
    if (!validator.validateFilePath(options.templatePath)) {
      logger.error(`无效的模板路径: ${options.templatePath}`);
      return false;
    }
  }

  // 验证版本号
  if (options.version && !validator.validateVersion(options.version)) {
    logger.error(`无效的版本号: ${options.version}`);
    return false;
  }

  return true;
}

/**
 * 显示create命令帮助信息
 */
export function showCreateHelp() {
  logger.info('');
  logger.title('terrafe create - 创建新项目');
  logger.info('');
  logger.info('使用方法:');
  logger.info('  terrafe create <project-name> [options]');
  logger.info('');
  logger.info('选项:');
  logger.info('  -t, --template <name>        指定模板名称');
  logger.info('  -p, --template-path <path>   指定本地模板路径');
  logger.info('  -m, --package-manager <pm>   指定包管理器 (npm, yarn, pnpm)');
  logger.info('  -d, --description <desc>     项目描述');
  logger.info('  -a, --author <author>        项目作者');
  logger.info('  -v, --version <version>      项目版本');
  logger.info('  -l, --license <license>      项目许可证');
  logger.info('  -f, --force                  强制覆盖现有目录');
  logger.info('  --skip-git                   跳过Git初始化');
  logger.info('  --skip-install               跳过依赖安装');
  logger.info('  --verbose                    显示详细输出');
  logger.info('');
  logger.info('示例:');
  logger.info('  terrafe create my-app');
  logger.info('  terrafe create my-vue-app --template vue3');
  logger.info('  terrafe create my-react-app --template react --author "John Doe"');
  logger.info('  terrafe create my-custom-app --template-path ./my-template');
  logger.info('');
}
