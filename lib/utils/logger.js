import chalk from 'chalk';

/**
 * 日志工具类
 * 提供统一的日志输出功能，支持不同级别和调试模式
 */
class Logger {
  constructor() {
    this.verbose = false;
  }

  /**
   * 设置详细模式
   * @param {boolean} verbose 是否启用详细模式
   */
  setVerbose(verbose) {
    this.verbose = verbose;
  }

  /**
   * 成功信息
   * @param {string} message 消息内容
   */
  success(message) {
    console.log(chalk.green('✓'), message);
  }

  /**
   * 信息输出
   * @param {string} message 消息内容
   */
  info(message) {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * 警告信息
   * @param {string} message 消息内容
   */
  warn(message) {
    console.log(chalk.yellow('⚠'), message);
  }

  /**
   * 错误信息
   * @param {string} message 消息内容
   */
  error(message) {
    console.log(chalk.red('✗'), message);
  }

  /**
   * 调试信息
   * @param {string} message 消息内容
   */
  debug(message) {
    if (this.verbose) {
      console.log(chalk.gray('🐛'), chalk.gray(message));
    }
  }

  /**
   * 普通日志
   * @param {string} message 消息内容
   */
  log(message) {
    console.log(message);
  }

  /**
   * 空行
   */
  newLine() {
    console.log();
  }

  /**
   * 标题
   * @param {string} title 标题内容
   */
  title(title) {
    console.log(chalk.bold.cyan(title));
  }

  /**
   * 高亮文本
   * @param {string} text 文本内容
   * @returns {string} 高亮后的文本
   */
  highlight(text) {
    return chalk.cyan(text);
  }

  /**
   * 清除控制台
   */
  clear() {
    console.clear();
  }
}

// 导出单例实例
export default new Logger();
