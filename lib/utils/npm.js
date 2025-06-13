import { execSync, spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import logger from './logger.js';

/**
 * NPM操作工具类
 * 提供包管理相关功能
 */
class NpmUtils {
  /**
   * 检测可用的包管理器
   * @param {string} targetDir 项目目录，用于检测锁文件
   * @returns {string} 包管理器名称 (npm, yarn, pnpm)
   */
  detectPackageManager(targetDir = process.cwd()) {
    // 优先检查项目中的锁文件
    if (targetDir && fs.existsSync(targetDir)) {
      if (fs.existsSync(path.join(targetDir, 'pnpm-lock.yaml'))) {
        return 'pnpm';
      }
      if (fs.existsSync(path.join(targetDir, 'yarn.lock'))) {
        return 'yarn';
      }
      if (fs.existsSync(path.join(targetDir, 'package-lock.json'))) {
        return 'npm';
      }
    }

    // 如果没有锁文件，检测可用的包管理器（优先级：pnpm > yarn > npm）
    const managers = ['pnpm', 'yarn', 'npm'];
    for (const manager of managers) {
      try {
        execSync(`${manager} --version`, { stdio: 'ignore' });
        return manager;
      } catch {
        continue;
      }
    }

    return 'npm'; // 默认使用npm
  }

  /**
   * 智能选择包管理器
   * @param {string} targetDir 项目目录
   * @param {string} preferred 首选包管理器 (auto, npm, yarn, pnpm)
   * @returns {string} 最终选择的包管理器
   */
  selectPackageManager(targetDir, preferred = 'auto') {
    if (preferred !== 'auto') {
      // 验证首选包管理器是否可用
      try {
        execSync(`${preferred} --version`, { stdio: 'ignore' });
        return preferred;
      } catch {
        logger.warn(`首选包管理器 ${preferred} 不可用，将自动选择`);
      }
    }

    return this.detectPackageManager(targetDir);
  }

  /**
   * 获取包管理器版本
   * @param {string} manager 包管理器名称
   * @returns {string|null} 版本号
   */
  getPackageManagerVersion(manager = 'npm') {
    try {
      const version = execSync(`${manager} --version`, {
        encoding: 'utf8',
      }).trim();

      return version;
    } catch {
      return null;
    }
  }

  /**
   * 检查包是否已安装
   * @param {string} packageName 包名
   * @param {string} dirPath 项目路径
   * @returns {boolean} 是否已安装
   */
  isPackageInstalled(packageName, dirPath) {
    const packageJsonPath = path.join(dirPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    try {
      const packageJson = fs.readJsonSync(packageJsonPath);
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      return packageName in dependencies;
    } catch {
      return false;
    }
  }

  /**
   * 安装依赖
   * @param {string} dirPath 项目路径
   * @param {Object} options 选项
   * @returns {Promise<boolean>} 是否成功
   */
  async installDependencies(dirPath, options = {}) {
    const {
      manager = this.detectPackageManager(),
      silent = true,
      timeout = 300000, // 5分钟超时
    } = options;

    return new Promise((resolve) => {
      logger.info(`正在安装依赖 (使用 ${manager})...`);

      const child = spawn(manager, ['install'], {
        cwd: dirPath,
        stdio: silent ? 'ignore' : 'inherit',
        shell: true,
      });

      // 设置超时
      const timer = setTimeout(() => {
        child.kill();
        logger.error('依赖安装超时');
        resolve(false);
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          logger.success('依赖安装完成');
          resolve(true);
        } else {
          logger.error(`依赖安装失败 (退出码: ${code})`);
          resolve(false);
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        logger.error(`依赖安装失败: ${error.message}`);
        resolve(false);
      });
    });
  }

  /**
   * 安装指定包
   * @param {string|Array} packages 包名或包名数组
   * @param {string} dirPath 项目路径
   * @param {Object} options 选项
   * @returns {Promise<boolean>} 是否成功
   */
  async installPackage(packages, dirPath, options = {}) {
    const { manager = this.detectPackageManager(), dev = false, silent = true } = options;

    const packageList = Array.isArray(packages) ? packages : [packages];
    const installArgs = ['add'];

    if (dev) {
      installArgs.push(manager === 'npm' ? '--save-dev' : '-D');
    }

    installArgs.push(...packageList);

    return new Promise((resolve) => {
      logger.info(`正在安装 ${packageList.join(', ')}...`);

      const child = spawn(manager, installArgs, {
        cwd: dirPath,
        stdio: silent ? 'ignore' : 'inherit',
        shell: true,
      });

      child.on('close', (code) => {
        if (code === 0) {
          logger.success(`${packageList.join(', ')} 安装完成`);
          resolve(true);
        } else {
          logger.error(`包安装失败 (退出码: ${code})`);
          resolve(false);
        }
      });

      child.on('error', (error) => {
        logger.error(`包安装失败: ${error.message}`);
        resolve(false);
      });
    });
  }

  /**
   * 运行npm脚本
   * @param {string} script 脚本名称
   * @param {string} dirPath 项目路径
   * @param {Object} options 选项
   * @returns {Promise<boolean>} 是否成功
   */
  async runScript(script, dirPath, options = {}) {
    const { manager = this.detectPackageManager(), silent = false } = options;

    return new Promise((resolve) => {
      logger.info(`运行脚本: ${script}`);

      const runCommand = manager === 'npm' ? 'run' : '';
      const args = runCommand ? [runCommand, script] : [script];

      const child = spawn(manager, args, {
        cwd: dirPath,
        stdio: silent ? 'ignore' : 'inherit',
        shell: true,
      });

      child.on('close', (code) => {
        if (code === 0) {
          logger.success(`脚本 ${script} 执行完成`);
          resolve(true);
        } else {
          logger.error(`脚本 ${script} 执行失败 (退出码: ${code})`);
          resolve(false);
        }
      });

      child.on('error', (error) => {
        logger.error(`脚本执行失败: ${error.message}`);
        resolve(false);
      });
    });
  }

  /**
   * 获取已安装包的版本
   * @param {string} packageName 包名
   * @param {string} dirPath 项目路径
   * @returns {string|null} 版本号
   */
  getInstalledVersion(packageName, dirPath) {
    const packageJsonPath = path.join(dirPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const packageJson = fs.readJsonSync(packageJsonPath);
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      return dependencies[packageName] || null;
    } catch {
      return null;
    }
  }

  /**
   * 创建package.json文件
   * @param {string} dirPath 项目路径
   * @param {Object} packageInfo 包信息
   * @returns {Promise<boolean>} 是否成功
   */
  async createPackageJson(dirPath, packageInfo) {
    const defaultPackageJson = {
      name: packageInfo.name || 'my-project',
      version: '1.0.0',
      description: packageInfo.description || '',
      main: 'index.js',
      scripts: {
        test: 'echo "Error: no test specified" && exit 1',
      },
      keywords: [],
      author: packageInfo.author || '',
      license: packageInfo.license || 'MIT',
      ...packageInfo,
    };

    try {
      const packageJsonPath = path.join(dirPath, 'package.json');
      await fs.writeJson(packageJsonPath, defaultPackageJson, { spaces: 2 });

      logger.debug('package.json 创建成功');
      return true;
    } catch (error) {
      logger.debug(`package.json 创建失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 检查npm registry连接
   * @returns {Promise<boolean>} 是否连接正常
   */
  async checkRegistry() {
    try {
      execSync('npm ping', {
        stdio: 'ignore',
        timeout: 10000,
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取最新版本号
   * @param {string} packageName 包名
   * @returns {Promise<string|null>} 最新版本号
   */
  async getLatestVersion(packageName) {
    try {
      const result = execSync(`npm view ${packageName} version`, {
        encoding: 'utf8',
        timeout: 10000,
      });

      return result.trim();
    } catch {
      return null;
    }
  }
}

// 导出单例实例
export default new NpmUtils();
