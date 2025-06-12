import path from 'path';
import fs from 'fs-extra';
import logger from '../utils/logger.js';
import fileUtils from '../utils/file.js';
import gitUtils from '../utils/git.js';
import npmUtils from '../utils/npm.js';
import validator from '../utils/validate.js';
import errorHandler, { TerraFEError } from './ErrorHandler.js';

/**
 * 项目生成器核心类
 * 负责项目创建的主要逻辑
 */
class Generator {
  constructor() {
    this.options = {};
    this.context = {};
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

      logger.info('正在复制模板文件...');
      await fileUtils.copy(templatePath, targetDir);

      logger.success('模板文件复制完成');
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
      logger.info('正在处理模板变量...');

      // 递归处理目录中的所有文件
      await this.processDirectory(targetDir, templateData);

      logger.success('模板变量处理完成');
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
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
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

      logger.info('正在初始化Git仓库...');
      const success = await gitUtils.setupInitialCommit(targetDir);

      if (success) {
        logger.success('Git仓库初始化完成');
      } else {
        logger.warn('Git仓库初始化失败，但不影响项目创建');
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

      logger.info('正在安装依赖...');
      const success = await npmUtils.installDependencies(targetDir, {
        manager: this.options.packageManager,
        silent: !this.options.verbose,
      });

      if (success) {
        logger.success('依赖安装完成');
      } else {
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
    this.setOptions(options);

    const targetDir = fileUtils.resolve(process.cwd(), projectName);

    try {
      // 1. 验证项目
      await this.validateProject(projectName, targetDir);

      // 2. 创建项目目录
      await this.createProjectDirectory(targetDir);

      // 3. 复制模板文件
      if (options.templatePath) {
        await this.copyTemplate(options.templatePath, targetDir);
      }

      // 4. 处理模板变量
      const templateData = {
        projectName,
        ...options.templateData,
      };
      await this.processTemplateVariables(targetDir, templateData);

      // 5. 初始化Git仓库
      await this.initializeGit(targetDir);

      // 6. 安装依赖
      await this.installDependencies(targetDir);

      // 7. 项目创建完成
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
    logger.success(`项目 "${projectName}" 创建成功！`);
    logger.newLine();
    logger.info('接下来你可以运行:');
    logger.info(`  cd ${projectName}`);

    if (this.options.skipInstall) {
      const manager = npmUtils.detectPackageManager();
      logger.info(`  ${manager} install`);
    }

    // 如果有启动脚本，显示启动命令
    const packageJsonPath = fileUtils.join(targetDir, 'package.json');
    if (fileUtils.exists(packageJsonPath)) {
      try {
        const packageJson = fs.readJsonSync(packageJsonPath);
        if (packageJson.scripts) {
          if (packageJson.scripts.dev) {
            logger.info(`  npm run dev`);
          } else if (packageJson.scripts.start) {
            logger.info(`  npm start`);
          }
        }
      } catch {
        // 忽略读取错误
      }
    }

    logger.newLine();
    logger.info('祝你开发愉快! 🎉');
  }
}

// 导出单例实例
export default new Generator();
