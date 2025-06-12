import logger from '../utils/logger.js';
import config from '../core/Config.js';
import errorHandler from '../core/ErrorHandler.js';
import chalk from 'chalk';

/**
 * config 命令实现
 * @param {string} action 操作类型 (list, get, set, delete, reset)
 * @param {string} key 配置键
 * @param {string} value 配置值
 * @param {Object} options 命令选项
 */
export async function configCommand(action, key, value, options) {
  try {
    // 加载配置
    await config.load();

    // 设置日志级别
    if (options.verbose) {
      logger.setVerbose(true);
      errorHandler.setDebugMode(true);
    }

    switch (action) {
      case 'list':
        await listConfig(options);
        break;
      case 'get':
        await getConfig(key, options);
        break;
      case 'set':
        await setConfig(key, value, options);
        break;
      case 'delete':
      case 'del':
        await deleteConfig(key, options);
        break;
      case 'reset':
        await resetConfig(options);
        break;
      case 'export':
        await exportConfig(key, options); // key作为文件路径
        break;
      case 'import':
        await importConfig(key, options); // key作为文件路径
        break;
      default:
        showConfigHelp();
        break;
    }
  } catch (error) {
    errorHandler.handle(error);
  }
}

/**
 * 列出所有配置
 * @param {Object} options 选项
 */
async function listConfig(options) {
  logger.title('📋 当前配置');
  logger.newLine();

  const allConfig = config.getAll();
  displayConfig(allConfig, '', 0);

  logger.newLine();
  logger.info(`配置文件位置: ${chalk.cyan(config.getConfigPath())}`);
}

/**
 * 递归显示配置
 * @param {Object} obj 配置对象
 * @param {string} prefix 前缀
 * @param {number} level 层级
 */
function displayConfig(obj, prefix, level) {
  const indent = '  '.repeat(level);

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      logger.info(`${indent}${chalk.cyan(key)}:`);
      displayConfig(value, fullKey, level + 1);
    } else {
      const displayValue = Array.isArray(value) ? `[${value.join(', ')}]` : String(value);
      logger.info(`${indent}${chalk.cyan(key)}: ${chalk.green(displayValue)}`);
    }
  }
}

/**
 * 获取配置值
 * @param {string} key 配置键
 * @param {Object} options 选项
 */
async function getConfig(key, options) {
  if (!key) {
    logger.error('请提供配置键名');
    logger.info('使用方法: terrafe config get <key>');
    return;
  }

  const value = config.get(key);

  if (value === undefined) {
    logger.warn(`配置键 "${key}" 不存在`);
    return;
  }

  logger.info(`${chalk.cyan(key)}: ${chalk.green(JSON.stringify(value, null, 2))}`);
}

/**
 * 设置配置值
 * @param {string} key 配置键
 * @param {string} value 配置值
 * @param {Object} options 选项
 */
async function setConfig(key, value, options) {
  if (!key) {
    logger.error('请提供配置键名');
    logger.info('使用方法: terrafe config set <key> <value>');
    return;
  }

  if (value === undefined) {
    logger.error('请提供配置值');
    logger.info('使用方法: terrafe config set <key> <value>');
    return;
  }

  // 尝试解析JSON值
  let parsedValue = value;
  try {
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (value === 'null') parsedValue = null;
    else if (!isNaN(value) && !isNaN(parseFloat(value))) parsedValue = parseFloat(value);
    else if (value.startsWith('{') || value.startsWith('[')) {
      parsedValue = JSON.parse(value);
    }
  } catch {
    // 保持原始字符串值
  }

  // 验证配置值
  if (!config.validate(key, parsedValue)) {
    logger.error(`配置值验证失败: ${key} = ${value}`);
    return;
  }

  config.set(key, parsedValue);
  const saved = await config.save();

  if (saved) {
    logger.success(`配置已更新: ${chalk.cyan(key)} = ${chalk.green(JSON.stringify(parsedValue))}`);
  } else {
    logger.error('配置保存失败');
  }
}

/**
 * 删除配置
 * @param {string} key 配置键
 * @param {Object} options 选项
 */
async function deleteConfig(key, options) {
  if (!key) {
    logger.error('请提供配置键名');
    logger.info('使用方法: terrafe config delete <key>');
    return;
  }

  const deleted = config.delete(key);

  if (deleted) {
    const saved = await config.save();
    if (saved) {
      logger.success(`配置已删除: ${chalk.cyan(key)}`);
    } else {
      logger.error('配置保存失败');
    }
  } else {
    logger.warn(`配置键 "${key}" 不存在`);
  }
}

/**
 * 重置配置
 * @param {Object} options 选项
 */
async function resetConfig(options) {
  if (!options.force) {
    logger.warn('此操作将重置所有配置到默认值');
    logger.info('如要确认，请使用 --force 参数');
    return;
  }

  const reset = await config.reset();

  if (reset) {
    logger.success('配置已重置为默认值');
  } else {
    logger.error('配置重置失败');
  }
}

/**
 * 导出配置
 * @param {string} filePath 文件路径
 * @param {Object} options 选项
 */
async function exportConfig(filePath, options) {
  if (!filePath) {
    logger.error('请提供导出文件路径');
    logger.info('使用方法: terrafe config export <file-path>');
    return;
  }

  const exported = await config.export(filePath);

  if (!exported) {
    logger.error('配置导出失败');
  }
}

/**
 * 导入配置
 * @param {string} filePath 文件路径
 * @param {Object} options 选项
 */
async function importConfig(filePath, options) {
  if (!filePath) {
    logger.error('请提供导入文件路径');
    logger.info('使用方法: terrafe config import <file-path>');
    return;
  }

  const imported = await config.import(filePath);

  if (!imported) {
    logger.error('配置导入失败');
  }
}

/**
 * 显示config命令帮助信息
 */
export function showConfigHelp() {
  logger.info('');
  logger.title('terrafe config - 配置管理');
  logger.info('');
  logger.info('使用方法:');
  logger.info('  terrafe config <command> [options]');
  logger.info('');
  logger.info('命令:');
  logger.info('  list                     列出所有配置');
  logger.info('  get <key>               获取配置值');
  logger.info('  set <key> <value>       设置配置值');
  logger.info('  delete <key>            删除配置');
  logger.info('  reset                   重置所有配置 (需要 --force)');
  logger.info('  export <file>           导出配置到文件');
  logger.info('  import <file>           从文件导入配置');
  logger.info('');
  logger.info('选项:');
  logger.info('  -f, --force             强制执行操作');
  logger.info('  --verbose               显示详细输出');
  logger.info('');
  logger.info('配置项:');
  logger.info('  packageManager          包管理器 (npm, yarn, pnpm)');
  logger.info('  gitInit                 是否初始化Git仓库');
  logger.info('  installDeps             是否自动安装依赖');
  logger.info('  user.name               用户名');
  logger.info('  user.email              用户邮箱');
  logger.info('  user.author             项目作者');
  logger.info('');
  logger.info('示例:');
  logger.info('  terrafe config list');
  logger.info('  terrafe config get packageManager');
  logger.info('  terrafe config set packageManager yarn');
  logger.info('  terrafe config set user.name "John Doe"');
  logger.info('  terrafe config delete user.email');
  logger.info('  terrafe config reset --force');
  logger.info('');
}
