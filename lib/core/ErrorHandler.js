import logger from '../utils/logger.js';
import chalk from 'chalk';

/**
 * 自定义错误类
 */
export class TerraFEError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = null) {
    super(message);
    this.name = 'TerraFEError';
    this.code = code;
    this.details = details;
  }
}

/**
 * 错误处理器类
 * 提供统一的错误处理和用户友好的错误提示
 */
class ErrorHandler {
  constructor() {
    this.debugMode = false;
  }

  /**
   * 设置调试模式
   * @param {boolean} debug 是否启用调试模式
   */
  setDebugMode(debug) {
    this.debugMode = debug;
  }

  /**
   * 处理错误
   * @param {Error} error 错误对象
   * @param {boolean} exit 是否退出程序
   */
  handle(error, exit = true) {
    if (error instanceof TerraFEError) {
      this.handleTerraFEError(error);
    } else {
      this.handleGenericError(error);
    }

    if (exit) {
      process.exit(1);
    }
  }

  /**
   * 处理TerraFE自定义错误
   * @param {TerraFEError} error TerraFE错误对象
   */
  handleTerraFEError(error) {
    logger.error(error.message);

    if (this.debugMode && error.details) {
      logger.debug(`错误详情: ${JSON.stringify(error.details, null, 2)}`);
    }

    // 根据错误代码提供特定的解决建议
    this.provideSolution(error.code);
  }

  /**
   * 处理通用错误
   * @param {Error} error 错误对象
   */
  handleGenericError(error) {
    logger.error('发生未知错误');

    if (this.debugMode) {
      logger.debug(`错误名称: ${error.name}`);
      logger.debug(`错误消息: ${error.message}`);
      if (error.stack) {
        logger.debug(`错误堆栈:\n${error.stack}`);
      }
    } else {
      logger.info(`使用 ${chalk.cyan('--verbose')} 参数查看详细错误信息`);
    }
  }

  /**
   * 根据错误代码提供解决方案
   * @param {string} code 错误代码
   */
  provideSolution(code) {
    const solutions = {
      INVALID_PROJECT_NAME: [
        '请确保项目名称符合以下规则:',
        '• 只包含字母、数字、连字符(-)和下划线(_)',
        '• 不以点(.)或下划线(_)开头',
        '• 长度不超过214个字符',
      ],

      DIRECTORY_EXISTS: [
        '解决方案:',
        '• 选择一个不同的项目名称',
        '• 删除现有目录',
        '• 使用 --force 参数强制覆盖 (谨慎使用)',
      ],

      GIT_NOT_FOUND: [
        '请安装Git:',
        '• Windows: 从 https://git-scm.com 下载安装',
        '• macOS: 运行 brew install git',
        '• Linux: 运行 sudo apt-get install git',
      ],

      NETWORK_ERROR: ['网络连接问题:', '• 检查网络连接', '• 尝试使用国内镜像源', '• 检查防火墙设置'],

      TEMPLATE_NOT_FOUND: [
        '模板未找到:',
        '• 检查模板名称是否正确',
        '• 使用 terrafe template list 查看可用模板',
        '• 确保网络连接正常',
      ],

      PERMISSION_DENIED: [
        '权限不足:',
        '• 检查目录写入权限',
        '• 尝试使用管理员权限运行',
        '• 确保目标目录没有被其他程序占用',
      ],

      DEPENDENCY_INSTALL_FAILED: [
        '依赖安装失败:',
        '• 检查网络连接',
        '• 清除npm缓存: npm cache clean --force',
        '• 尝试删除node_modules后重新安装',
      ],
    };

    const solution = solutions[code];
    if (solution) {
      logger.newLine();
      solution.forEach((line) => {
        if (line.startsWith('•')) {
          logger.info(`  ${line}`);
        } else {
          logger.info(line);
        }
      });
    }
  }

  /**
   * 创建TerraFE错误
   * @param {string} message 错误消息
   * @param {string} code 错误代码
   * @param {any} details 错误详情
   * @returns {TerraFEError} TerraFE错误对象
   */
  createError(message, code, details = null) {
    return new TerraFEError(message, code, details);
  }

  /**
   * 警告处理
   * @param {string} message 警告消息
   * @param {string} suggestion 建议
   */
  warn(message, suggestion = null) {
    logger.warn(message);
    if (suggestion) {
      logger.info(`建议: ${suggestion}`);
    }
  }

  /**
   * 异步错误处理包装器
   * @param {Function} fn 异步函数
   * @returns {Function} 包装后的函数
   */
  asyncWrapper(fn) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error);
      }
    };
  }

  /**
   * 安装进程错误处理器
   */
  installProcessHandlers() {
    // 未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('发生未捕获的异常');
      this.handleGenericError(error);
      process.exit(1);
    });

    // 未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('发生未处理的Promise拒绝');
      if (reason instanceof Error) {
        this.handleGenericError(reason);
      } else {
        logger.error(`拒绝原因: ${reason}`);
      }
      process.exit(1);
    });

    // 程序退出前的清理
    process.on('SIGINT', () => {
      logger.newLine();
      logger.info('程序被用户中断');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('程序收到终止信号');
      process.exit(0);
    });
  }
}

// 导出单例实例
export default new ErrorHandler();
