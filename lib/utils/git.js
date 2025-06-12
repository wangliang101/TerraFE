import { execSync, spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import logger from './logger.js';

/**
 * Git操作工具类
 * 提供Git相关操作功能
 */
class GitUtils {
  /**
   * 检查是否安装了Git
   * @returns {boolean} 是否安装了Git
   */
  isGitInstalled() {
    try {
      execSync('git --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查目录是否为Git仓库
   * @param {string} dirPath 目录路径
   * @returns {boolean} 是否为Git仓库
   */
  isGitRepository(dirPath) {
    const gitDir = path.join(dirPath, '.git');
    return fs.existsSync(gitDir);
  }

  /**
   * 初始化Git仓库
   * @param {string} dirPath 目录路径
   * @returns {Promise<boolean>} 是否成功
   */
  async initRepository(dirPath) {
    try {
      if (!this.isGitInstalled()) {
        logger.warn('未检测到Git，跳过仓库初始化');
        return false;
      }

      execSync('git init', {
        cwd: dirPath,
        stdio: 'ignore',
      });

      logger.debug(`Git仓库初始化成功: ${dirPath}`);
      return true;
    } catch (error) {
      logger.debug(`Git仓库初始化失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 添加文件到暂存区
   * @param {string} dirPath 仓库路径
   * @param {string} files 文件路径，默认为'.'
   * @returns {Promise<boolean>} 是否成功
   */
  async addFiles(dirPath, files = '.') {
    try {
      execSync(`git add ${files}`, {
        cwd: dirPath,
        stdio: 'ignore',
      });

      logger.debug(`文件添加到暂存区成功: ${files}`);
      return true;
    } catch (error) {
      logger.debug(`文件添加到暂存区失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 提交更改
   * @param {string} dirPath 仓库路径
   * @param {string} message 提交信息
   * @returns {Promise<boolean>} 是否成功
   */
  async commit(dirPath, message = 'Initial commit') {
    try {
      execSync(`git commit -m "${message}"`, {
        cwd: dirPath,
        stdio: 'ignore',
      });

      logger.debug(`提交成功: ${message}`);
      return true;
    } catch (error) {
      logger.debug(`提交失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取当前分支名
   * @param {string} dirPath 仓库路径
   * @returns {string|null} 分支名
   */
  getCurrentBranch(dirPath) {
    try {
      const branch = execSync('git branch --show-current', {
        cwd: dirPath,
        encoding: 'utf8',
      }).trim();

      return branch || null;
    } catch {
      return null;
    }
  }

  /**
   * 检查是否有未提交的更改
   * @param {string} dirPath 仓库路径
   * @returns {boolean} 是否有未提交的更改
   */
  hasUncommittedChanges(dirPath) {
    try {
      const status = execSync('git status --porcelain', {
        cwd: dirPath,
        encoding: 'utf8',
      });

      return status.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * 克隆远程仓库
   * @param {string} url 仓库URL
   * @param {string} targetDir 目标目录
   * @param {Object} options 选项
   * @returns {Promise<boolean>} 是否成功
   */
  async cloneRepository(url, targetDir, options = {}) {
    const { branch, depth } = options;

    try {
      let command = `git clone`;

      if (branch) {
        command += ` -b ${branch}`;
      }

      if (depth) {
        command += ` --depth ${depth}`;
      }

      command += ` ${url} ${targetDir}`;

      execSync(command, { stdio: 'ignore' });

      logger.debug(`仓库克隆成功: ${url}`);
      return true;
    } catch (error) {
      logger.debug(`仓库克隆失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取远程仓库URL
   * @param {string} dirPath 仓库路径
   * @param {string} remote 远程名称，默认为'origin'
   * @returns {string|null} 远程仓库URL
   */
  getRemoteUrl(dirPath, remote = 'origin') {
    try {
      const url = execSync(`git remote get-url ${remote}`, {
        cwd: dirPath,
        encoding: 'utf8',
      }).trim();

      return url || null;
    } catch {
      return null;
    }
  }

  /**
   * 添加远程仓库
   * @param {string} dirPath 仓库路径
   * @param {string} name 远程名称
   * @param {string} url 远程URL
   * @returns {Promise<boolean>} 是否成功
   */
  async addRemote(dirPath, name, url) {
    try {
      execSync(`git remote add ${name} ${url}`, {
        cwd: dirPath,
        stdio: 'ignore',
      });

      logger.debug(`远程仓库添加成功: ${name} -> ${url}`);
      return true;
    } catch (error) {
      logger.debug(`远程仓库添加失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 执行初始提交流程
   * @param {string} dirPath 项目路径
   * @returns {Promise<boolean>} 是否成功
   */
  async setupInitialCommit(dirPath) {
    try {
      if (!this.isGitInstalled()) {
        return false;
      }

      // 初始化仓库
      await this.initRepository(dirPath);

      // 添加所有文件
      await this.addFiles(dirPath);

      // 提交
      await this.commit(dirPath, 'feat: initial commit');

      return true;
    } catch (error) {
      logger.debug(`初始提交流程失败: ${error.message}`);
      return false;
    }
  }
}

// 导出单例实例
export default new GitUtils();
