import path from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import Handlebars from 'handlebars';
import logger from '../utils/logger.js';
import fileUtils from '../utils/file.js';
import gitUtils from '../utils/git.js';
import npmUtils from '../utils/npm.js';
import validator from '../utils/validate.js';
import errorHandler, { TerraFEError } from './ErrorHandler.js';
import CacheManager from '../cache/CacheManager.js';
import config from './Config.js';

/**
 * 项目生成器核心类
 * 负责项目创建的主要逻辑
 */
class Generator {
  constructor() {
    this.options = {};
    this.context = {};
    this.cacheManager = null;
  }

  /**
   * 初始化生成器
   */
  async init() {
    await config.load();
    this.cacheManager = new CacheManager(config);
  }

  /**
   * 设置生成选项
   * @param {Object} options 生成选项
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  /**
   * 验证项目创建条件
   * @param {string} projectName 项目名称
   * @param {string} targetDir 目标目录
   * @returns {Promise<boolean>} 验证结果
   */
  async validateProject(projectName, targetDir) {
    try {
      // 验证项目名称
      const nameValidation = validator.validateProjectName(projectName);
      if (!nameValidation.valid) {
        throw errorHandler.createError(
          `项目名称验证失败: ${nameValidation.errors.join(', ')}`,
          'INVALID_PROJECT_NAME',
          nameValidation
        );
      }

      // 显示警告信息
      if (nameValidation.warnings.length > 0) {
        nameValidation.warnings.forEach((warning) => {
          errorHandler.warn(warning);
        });
      }

      // 检查目标目录是否存在
      if (fileUtils.exists(targetDir)) {
        if (!this.options.force) {
          throw errorHandler.createError(`目录 "${targetDir}" 已存在`, 'DIRECTORY_EXISTS', { targetDir });
        } else {
          logger.warn(`将清空现有目录: ${targetDir}`);
          await fileUtils.remove(targetDir);
        }
      }

      return true;
    } catch (error) {
      if (error instanceof TerraFEError) {
        throw error;
      }
      throw errorHandler.createError(`项目验证失败: ${error.message}`, 'VALIDATION_ERROR', error);
    }
  }

  /**
   * 创建项目目录
   * @param {string} targetDir 目标目录
   * @returns {Promise<boolean>} 创建结果
   */
  async createProjectDirectory(targetDir) {
    try {
      await fileUtils.ensureDir(targetDir);
      logger.debug(`项目目录创建成功: ${targetDir}`);
      return true;
    } catch (error) {
      throw errorHandler.createError(`无法创建项目目录: ${error.message}`, 'PERMISSION_DENIED', {
        targetDir,
        originalError: error,
      });
    }
  }

  /**
   * 获取模板路径
   * @param {Object} templateInfo 模板信息
   * @returns {Promise<string>} 模板路径
   */
  async getTemplatePath(templateInfo) {
    if (templateInfo.type === 'local') {
      // 本地模板
      if (!fileUtils.exists(templateInfo.path)) {
        throw errorHandler.createError('本地模板路径不存在', 'TEMPLATE_NOT_FOUND', {
          templatePath: templateInfo.path,
        });
      }
      return templateInfo.path;
    } else if (templateInfo.type === 'github') {
      // GitHub 模板，使用缓存管理器
      const spinner = ora('正在获取模板...').start();

      try {
        const templatePath = await this.cacheManager.getTemplate(templateInfo.repo);
        spinner.succeed('模板获取成功');
        return templatePath;
      } catch (error) {
        spinner.fail('模板获取失败');
        throw errorHandler.createError(`无法获取 GitHub 模板: ${error.message}`, 'TEMPLATE_DOWNLOAD_ERROR', {
          repo: templateInfo.repo,
          originalError: error,
        });
      }
    } else {
      throw errorHandler.createError('不支持的模板类型', 'INVALID_TEMPLATE_TYPE', {
        templateInfo,
      });
    }
  }

  /**
   * 复制模板文件
   * @param {string} templatePath 模板路径
   * @param {string} targetDir 目标目录
   * @returns {Promise<boolean>} 复制结果
   */
  async copyTemplate(templatePath, targetDir) {
    try {
      if (!fileUtils.exists(templatePath)) {
        throw errorHandler.createError('模板路径不存在', 'TEMPLATE_NOT_FOUND', { templatePath });
      }

      const spinner = ora('正在复制模板文件...').start();

      // 检查是否有template子目录
      const nestedTemplatePath = fileUtils.join(templatePath, 'template');
      if (fileUtils.exists(nestedTemplatePath)) {
        // 如果有template子目录，复制其内容
        await fileUtils.copy(nestedTemplatePath, targetDir);
      } else {
        // 否则复制整个模板目录
        await fileUtils.copy(templatePath, targetDir);
      }

      spinner.succeed('模板文件复制完成');

      return true;
    } catch (error) {
      if (error instanceof TerraFEError) {
        throw error;
      }
      throw errorHandler.createError(`模板复制失败: ${error.message}`, 'TEMPLATE_COPY_ERROR', {
        templatePath,
        targetDir,
        originalError: error,
      });
    }
  }

  /**
   * 处理模板变量
   * @param {string} targetDir 目标目录
   * @param {Object} templateData 模板数据
   * @returns {Promise<boolean>} 处理结果
   */
  async processTemplateVariables(targetDir, templateData) {
    try {
      const spinner = ora('正在处理模板变量...').start();

      // 递归处理目录中的所有文件
      await this.processDirectory(targetDir, templateData);

      spinner.succeed('模板变量处理完成');
      return true;
    } catch (error) {
      throw errorHandler.createError(`模板变量处理失败: ${error.message}`, 'TEMPLATE_PROCESS_ERROR', {
        targetDir,
        templateData,
        originalError: error,
      });
    }
  }

  /**
   * 智能检测并设置包管理器
   * @param {string} targetDir 目标目录
   * @param {string} preferred 首选包管理器
   * @returns {Promise<string>} 最终选择的包管理器
   */
  async detectAndSetPackageManager(targetDir, preferred = 'auto') {
    try {
      // 首先检测模板中的锁文件来确定包管理器
      const packageManager = npmUtils.selectPackageManager(targetDir, preferred);

      // 更新选项中的包管理器
      this.options.packageManager = packageManager;

      logger.info(`   包管理器: ${chalk.yellow(packageManager)} ${preferred !== packageManager ? '(自动检测)' : ''}`);

      return packageManager;
    } catch (error) {
      logger.warn(`包管理器检测失败，使用默认值: ${error.message}`);
      const defaultManager = 'npm';
      this.options.packageManager = defaultManager;
      return defaultManager;
    }
  }

  /**
   * 更新package.json文件
   * @param {string} targetDir 目标目录
   * @param {Object} templateData 模板数据
   * @returns {Promise<boolean>} 更新结果
   */
  async updatePackageJson(targetDir, templateData) {
    try {
      const packageJsonPath = fileUtils.join(targetDir, 'package.json');

      if (!fileUtils.exists(packageJsonPath)) {
        logger.debug('未找到package.json文件，跳过更新');
        return true;
      }

      const spinner = ora('正在更新package.json...').start();

      // 读取现有的package.json
      const packageJson = await fs.readJson(packageJsonPath);

      // 更新相关字段
      if (templateData.projectName) {
        packageJson.name = templateData.projectName;
      }

      if (templateData.description) {
        packageJson.description = templateData.description;
      }

      if (templateData.author) {
        packageJson.author = templateData.author;
      }

      if (templateData.version) {
        packageJson.version = templateData.version;
      }

      if (templateData.license) {
        packageJson.license = templateData.license;
      }

      // 写回package.json
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

      spinner.succeed('package.json更新完成');
      logger.debug('已更新package.json字段:', Object.keys(templateData));

      return true;
    } catch (error) {
      throw errorHandler.createError(`package.json更新失败: ${error.message}`, 'PACKAGE_JSON_UPDATE_ERROR', {
        targetDir,
        templateData,
        originalError: error,
      });
    }
  }

  /**
   * 递归处理目录
   * @param {string} dirPath 目录路径
   * @param {Object} templateData 模板数据
   */
  async processDirectory(dirPath, templateData) {
    const files = await fileUtils.readDir(dirPath);

    for (const file of files) {
      const filePath = fileUtils.join(dirPath, file);
      const stats = await fileUtils.stat(filePath);

      if (stats.isDirectory()) {
        // 递归处理子目录
        await this.processDirectory(filePath, templateData);

        // 处理目录名中的变量
        const newDirName = this.replaceVariables(file, templateData);
        if (newDirName !== file) {
          const newDirPath = fileUtils.join(dirPath, newDirName);
          await fileUtils.move(filePath, newDirPath);
        }
      } else {
        // 处理文件
        await this.processFile(filePath, templateData);

        // 处理文件名中的变量
        const newFileName = this.replaceVariables(file, templateData);
        if (newFileName !== file) {
          const newFilePath = fileUtils.join(dirPath, newFileName);
          await fileUtils.move(filePath, newFilePath);
        }
      }
    }
  }

  /**
   * 处理单个文件
   * @param {string} filePath 文件路径
   * @param {Object} templateData 模板数据
   */
  async processFile(filePath, templateData) {
    const ext = fileUtils.getExt(filePath);
    const textExtensions = [
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.vue',
      '.json',
      '.md',
      '.txt',
      '.html',
      '.css',
      '.scss',
      '.less',
    ];

    // 只处理文本文件
    if (textExtensions.includes(ext)) {
      const content = await fileUtils.readFile(filePath);
      const processedContent = this.replaceVariables(content, templateData);

      if (processedContent !== content) {
        await fileUtils.writeFile(filePath, processedContent);
      }
    }
  }

  /**
   * 替换变量
   * @param {string} content 内容
   * @param {Object} data 数据
   * @returns {string} 替换后的内容
   */
  replaceVariables(content, data) {
    try {
      // 使用 Handlebars 进行模板渲染，支持更复杂的语法
      const template = Handlebars.compile(content);
      return template(data);
    } catch (error) {
      // 如果 Handlebars 失败，使用简单的字符串替换
      logger.debug(`Handlebars 渲染失败，使用简单替换: ${error.message}`);
      return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : match;
      });
    }
  }

  /**
   * 初始化Git仓库
   * @param {string} targetDir 目标目录
   * @returns {Promise<boolean>} 初始化结果
   */
  async initializeGit(targetDir) {
    try {
      if (this.options.skipGit) {
        logger.debug('跳过Git初始化');
        return true;
      }

      const spinner = ora('正在初始化Git仓库...').start();
      const success = await gitUtils.setupInitialCommit(targetDir);

      if (success) {
        spinner.succeed('Git仓库初始化完成');
      } else {
        spinner.warn('Git仓库初始化失败，但不影响项目创建');
      }

      return true;
    } catch (error) {
      // Git初始化失败不应该阻止项目创建
      logger.warn(`Git初始化失败: ${error.message}`);
      return true;
    }
  }

  /**
   * 安装依赖
   * @param {string} targetDir 目标目录
   * @returns {Promise<boolean>} 安装结果
   */
  async installDependencies(targetDir) {
    try {
      if (this.options.skipInstall) {
        logger.debug('跳过依赖安装');
        return true;
      }

      // 检查是否有package.json
      const packageJsonPath = fileUtils.join(targetDir, 'package.json');
      if (!fileUtils.exists(packageJsonPath)) {
        logger.debug('未找到package.json，跳过依赖安装');
        return true;
      }

      const spinner = ora(`正在安装依赖 (使用 ${this.options.packageManager})...`).start();
      const success = await npmUtils.installDependencies(targetDir, {
        manager: this.options.packageManager,
        silent: !this.options.verbose,
      });

      if (success) {
        spinner.succeed('依赖安装完成');
      } else {
        spinner.fail('依赖安装失败');
        throw errorHandler.createError('依赖安装失败', 'DEPENDENCY_INSTALL_FAILED', { targetDir });
      }

      return true;
    } catch (error) {
      if (error instanceof TerraFEError) {
        throw error;
      }
      throw errorHandler.createError(`依赖安装失败: ${error.message}`, 'DEPENDENCY_INSTALL_FAILED', {
        targetDir,
        originalError: error,
      });
    }
  }

  /**
   * 生成项目
   * @param {string} projectName 项目名称
   * @param {Object} options 选项
   * @returns {Promise<boolean>} 生成结果
   */
  async generate(projectName, options = {}) {
    // 初始化生成器
    await this.init();

    this.setOptions(options);

    const targetDir = fileUtils.resolve(process.cwd(), projectName);

    try {
      // 1. 验证项目
      await this.validateProject(projectName, targetDir);

      // 2. 创建项目目录
      await this.createProjectDirectory(targetDir);

      // 3. 获取并复制模板文件
      let templatePath;
      if (options.template) {
        templatePath = await this.getTemplatePath(options.template);
      } else if (options.templatePath) {
        templatePath = options.templatePath;
      } else {
        throw errorHandler.createError('未指定模板', 'NO_TEMPLATE_SPECIFIED');
      }

      await this.copyTemplate(templatePath, targetDir);

      // 4. 智能检测并设置包管理器（基于模板中的锁文件）
      await this.detectAndSetPackageManager(targetDir, options.packageManager);

      // 5. 处理模板变量
      const templateData = {
        projectName,
        ...options.templateData,
        // 添加更多有用的变量
        currentYear: new Date().getFullYear(),
        currentDate: new Date().toISOString().split('T')[0],
        nodeVersion: process.version,
      };
      await this.processTemplateVariables(targetDir, templateData);

      // 6. 更新package.json文件
      await this.updatePackageJson(targetDir, templateData);

      // 7. 初始化Git仓库
      await this.initializeGit(targetDir);

      // 8. 安装依赖
      await this.installDependencies(targetDir);

      // 9. 项目创建完成
      this.showCompletionMessage(projectName, targetDir);

      return true;
    } catch (error) {
      // 清理失败的项目
      if (fileUtils.exists(targetDir)) {
        try {
          await fileUtils.remove(targetDir);
          logger.debug(`清理失败的项目目录: ${targetDir}`);
        } catch (cleanupError) {
          logger.debug(`清理失败: ${cleanupError.message}`);
        }
      }

      throw error;
    }
  }

  /**
   * 显示完成消息
   * @param {string} projectName 项目名称
   * @param {string} targetDir 目标目录
   */
  showCompletionMessage(projectName, targetDir) {
    logger.newLine();
    logger.success(`🎉 项目 "${chalk.cyan(projectName)}" 创建成功！`);
    logger.newLine();

    logger.info('📝 接下来你可以运行:');
    logger.info(`   ${chalk.gray('$')} ${chalk.cyan(`cd ${projectName}`)}`);

    if (this.options.skipInstall) {
      const manager = this.options.packageManager || npmUtils.detectPackageManager();
      logger.info(`   ${chalk.gray('$')} ${chalk.cyan(`${manager} install`)}`);
    }

    // 如果有启动脚本，显示启动命令
    const packageJsonPath = fileUtils.join(targetDir, 'package.json');
    if (fileUtils.exists(packageJsonPath)) {
      try {
        const packageJson = fs.readJsonSync(packageJsonPath);
        if (packageJson.scripts) {
          const manager = this.options.packageManager || npmUtils.detectPackageManager();
          if (packageJson.scripts.dev) {
            logger.info(`   ${chalk.gray('$')} ${chalk.cyan(`${manager} run dev`)}`);
          } else if (packageJson.scripts.start) {
            logger.info(`   ${chalk.gray('$')} ${chalk.cyan(`${manager} start`)}`);
          }
        }
      } catch {
        // 忽略读取错误
      }
    }

    logger.newLine();
    logger.info(`🚀 ${chalk.yellow('祝你开发愉快!')}`);
    logger.newLine();
  }
}

// 导出单例实例
export default new Generator();
