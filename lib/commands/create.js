import path from 'path';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import logger from '../utils/logger.js';
import validator from '../utils/validate.js';
import generator from '../core/Generator.js';
import config from '../core/Config.js';
import errorHandler from '../core/ErrorHandler.js';
import CacheManager from '../cache/CacheManager.js';
import npmUtils from '../utils/npm.js';

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
    const nameValidation = validator.validateProjectName(projectName);
    if (!nameValidation.valid) {
      logger.error(`项目名称验证失败: ${nameValidation.errors.join(', ')}`);
      return;
    }

    // 显示警告信息
    if (nameValidation.warnings.length > 0) {
      nameValidation.warnings.forEach((warning) => {
        logger.warn(warning);
      });
    }

    logger.info(`正在创建项目: ${chalk.cyan(projectName)}`);
    logger.newLine();

    // 如果是非交互模式或指定了模板，直接执行
    if (options.template || options.templatePath || options.yes) {
      await executeGeneration(projectName, options);
      return;
    }

    // 交互式选择模板和配置
    const answers = await promptForProjectConfiguration(projectName, options);

    // 合并选项
    const finalOptions = {
      ...options,
      ...answers,
    };

    await executeGeneration(projectName, finalOptions);
  } catch (error) {
    errorHandler.handle(error);
  }
}

/**
 * 交互式提示用户配置项目
 * @param {string} projectName 项目名称
 * @param {Object} options 现有选项
 * @returns {Promise<Object>} 用户选择的配置
 */
async function promptForProjectConfiguration(projectName, options) {
  const templates = await getAvailableTemplates();

  const questions = [
    {
      type: 'list',
      name: 'templateCategory',
      message: '请选择模板类型:',
      choices: () => {
        const choices = [
          { name: '🔥 官方 Vite 模板', value: 'official' },
          { name: '⭐ 社区精选模板', value: 'community' },
        ];

        // 检查是否有自定义模板
        const customTemplates = config.getAllTemplates('custom');
        if (Object.keys(customTemplates).length > 0) {
          choices.push({ name: '🔧 我的自定义模板', value: 'saved-custom' });
        }

        choices.push({ name: '🔗 自定义 GitHub 仓库', value: 'custom' });
        return choices;
      },
    },
    {
      type: 'list',
      name: 'template',
      message: '请选择模板:',
      choices: (answers) => {
        if (answers.templateCategory === 'custom') {
          return []; // 自定义模板不需要选择
        }

        if (answers.templateCategory === 'saved-custom') {
          const customTemplates = config.getAllTemplates('custom');
          return Object.entries(customTemplates).map(([key, template]) => ({
            name: `${key} - ${chalk.gray(template.description || template.repo)}`,
            value: key,
          }));
        }

        return templates[answers.templateCategory].map((template) => ({
          name: `${template.name} - ${chalk.gray(template.description)}`,
          value: template.key,
        }));
      },
      when: (answers) => answers.templateCategory !== 'custom',
    },
    {
      type: 'input',
      name: 'customRepo',
      message: '请输入 GitHub 仓库地址 (格式: owner/repo 或完整URL):',
      when: (answers) => answers.templateCategory === 'custom',
      validate: (input) => {
        if (!input.trim()) {
          return '请输入有效的 GitHub 仓库地址';
        }
        return true;
      },
    },
    {
      type: 'confirm',
      name: 'saveCustomTemplate',
      message: '是否保存此自定义模板以便下次使用?',
      when: (answers) => answers.templateCategory === 'custom',
      default: true,
    },
    {
      type: 'input',
      name: 'customTemplateName',
      message: '请为此模板起一个名字:',
      when: (answers) => answers.templateCategory === 'custom' && answers.saveCustomTemplate,
      validate: (input) => {
        if (!input.trim()) {
          return '模板名称不能为空';
        }
        if (config.hasTemplate(input.trim())) {
          return `模板 "${input.trim()}" 已存在`;
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'customTemplateDesc',
      message: '请输入模板描述 (可选):',
      when: (answers) => answers.templateCategory === 'custom' && answers.saveCustomTemplate,
    },
    {
      type: 'input',
      name: 'description',
      message: `项目描述:`,
      default: options.description || `A new project created with TerraFE`,
    },
    {
      type: 'input',
      name: 'author',
      message: '作者:',
      default: options.author || config.get('user.author', ''),
    },
    {
      type: 'input',
      name: 'version',
      message: '版本号:',
      default: options.version || '1.0.0',
      validate: (input) => {
        if (!validator.validateVersion(input)) {
          return '请输入有效的版本号 (如: 1.0.0)';
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'license',
      message: '许可证:',
      choices: [
        { name: 'MIT', value: 'MIT' },
        { name: 'Apache-2.0', value: 'Apache-2.0' },
        { name: 'ISC', value: 'ISC' },
        { name: 'BSD-3-Clause', value: 'BSD-3-Clause' },
        { name: 'GPL-3.0', value: 'GPL-3.0' },
        { name: 'UNLICENSED', value: 'UNLICENSED' },
      ],
      default: options.license || 'MIT',
    },
    {
      type: 'confirm',
      name: 'specifyPackageManager',
      message: '是否指定包管理器? (否则将根据模板的lock文件自动检测)',
      default: false,
    },
    {
      type: 'list',
      name: 'packageManager',
      message: '请选择包管理器:',
      choices: [
        { name: '📦 npm', value: 'npm' },
        { name: '🧶 yarn', value: 'yarn' },
        { name: '📦 pnpm', value: 'pnpm' },
      ],
      when: (answers) => answers.specifyPackageManager,
      default: options.packageManager || config.get('packageManager', 'npm'),
    },
    {
      type: 'confirm',
      name: 'gitInit',
      message: '初始化 Git 仓库?',
      default: options.skipGit ? false : config.get('gitInit', true),
    },
    {
      type: 'confirm',
      name: 'installDeps',
      message: '自动安装依赖?',
      default: options.skipInstall ? false : config.get('installDeps', true),
    },
  ];

  return await inquirer.prompt(questions);
}

/**
 * 获取可用的模板列表
 * @returns {Promise<Object>} 模板分类对象
 */
async function getAvailableTemplates() {
  const officialTemplates = config.get('templates.official', {});
  const communityTemplates = config.get('templates.community', {});
  const customTemplates = config.get('templates.custom', {});

  return {
    official: Object.entries(officialTemplates).map(([key, template]) => ({
      key,
      name: key,
      description: template.description,
      repo: template.repo,
    })),
    community: Object.entries(communityTemplates).map(([key, template]) => ({
      key,
      name: key,
      description: template.description,
      repo: template.repo,
    })),
    'saved-custom': Object.entries(customTemplates).map(([key, template]) => ({
      key,
      name: key,
      description: template.description,
      repo: template.repo,
    })),
  };
}

/**
 * 执行项目生成
 * @param {string} projectName 项目名称
 * @param {Object} options 生成选项
 */
async function executeGeneration(projectName, options) {
  const targetDir = path.resolve(projectName);

  // 准备模板信息
  let templateInfo = null;

  if (options.templatePath) {
    // 使用本地模板路径
    templateInfo = {
      type: 'local',
      path: path.resolve(options.templatePath),
    };
  } else if (options.customRepo) {
    // 使用自定义 GitHub 仓库
    templateInfo = {
      type: 'github',
      repo: options.customRepo,
    };

    // 如果用户选择保存自定义模板
    if (options.saveCustomTemplate && options.customTemplateName) {
      try {
        await config.addCustomTemplate(
          options.customTemplateName.trim(),
          options.customRepo,
          options.customTemplateDesc || '',
          []
        );
        logger.success(`自定义模板 "${options.customTemplateName}" 已保存`);
      } catch (error) {
        logger.warn(`保存自定义模板失败: ${error.message}`);
      }
    }
  } else if (options.template) {
    // 使用内置模板或自定义模板
    const allTemplates = {
      ...config.get('templates.official', {}),
      ...config.get('templates.community', {}),
      ...config.get('templates.custom', {}),
    };

    const template = allTemplates[options.template];
    if (!template) {
      logger.error(`模板 "${options.template}" 不存在`);
      return;
    }

    templateInfo = {
      type: 'github',
      repo: template.repo,
      name: options.template,
      description: template.description,
    };
  } else {
    logger.error('未指定模板');
    return;
  }

  // 准备生成选项（包管理器选择将在模板下载后进行）
  const generateOptions = {
    force: options.force || false,
    skipGit: !options.gitInit,
    skipInstall: !options.installDeps,
    packageManager: options.packageManager || (options.specifyPackageManager ? options.packageManager : 'auto'), // 如果用户没有指定包管理器则使用auto进行自动检测
    template: templateInfo,
    verbose: options.verbose || config.get('verbose', false),
    templateData: {
      projectName,
      description: options.description || '',
      author: options.author || '',
      version: options.version || '1.0.0',
      license: options.license || 'MIT',
    },
  };

  logger.debug('生成选项:', generateOptions);

  // 显示生成信息
  logger.info(`📋 项目配置:`);
  logger.info(`   名称: ${chalk.cyan(projectName)}`);
  logger.info(`   描述: ${generateOptions.templateData.description}`);
  logger.info(`   作者: ${generateOptions.templateData.author}`);
  logger.info(`   版本: ${generateOptions.templateData.version}`);
  logger.info(`   许可证: ${generateOptions.templateData.license}`);

  if (templateInfo.type === 'github') {
    logger.info(`   模板: ${chalk.green(templateInfo.repo)}`);
  } else {
    logger.info(`   模板: ${chalk.green(templateInfo.path)}`);
  }

  logger.newLine();

  // 执行项目生成
  await generator.generate(projectName, generateOptions);
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
    const validManagers = ['auto', 'npm', 'yarn', 'pnpm'];
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
  logger.info('  -t, --template <name>        指定内置模板名称');
  logger.info('  -p, --template-path <path>   指定本地模板路径');
  logger.info('  -r, --repo <repo>            指定 GitHub 仓库 (owner/repo)');
  logger.info('  -m, --package-manager <pm>   指定包管理器 (auto, npm, yarn, pnpm)');
  logger.info('  -d, --description <desc>     项目描述');
  logger.info('  -a, --author <author>        项目作者');
  logger.info('  -v, --version <version>      项目版本');
  logger.info('  -l, --license <license>      项目许可证');
  logger.info('  -f, --force                  强制覆盖现有目录');
  logger.info('  -y, --yes                    跳过交互式询问，使用默认值');
  logger.info('  --skip-git                   跳过Git初始化');
  logger.info('  --skip-install               跳过依赖安装');
  logger.info('  --verbose                    显示详细输出');
  logger.info('');
  logger.info('内置模板:');
  logger.info('  vite-vanilla     Vanilla JavaScript');
  logger.info('  vite-vanilla-ts  Vanilla TypeScript');
  logger.info('  vite-vue         Vue 3');
  logger.info('  vite-vue-ts      Vue 3 + TypeScript');
  logger.info('  vite-react       React');
  logger.info('  vite-react-ts    React + TypeScript');
  logger.info('  vite-svelte      Svelte');
  logger.info('  vite-svelte-ts   Svelte + TypeScript');
  logger.info('');
  logger.info('示例:');
  logger.info('  terrafe create my-app                          # 交互式创建');
  logger.info('  terrafe create my-vue-app -t vite-vue-ts       # 使用内置模板');
  logger.info('  terrafe create my-app -r vitejs/vite-react     # 使用 GitHub 模板');
  logger.info('  terrafe create my-app -p ./my-template         # 使用本地模板');
  logger.info('  terrafe create my-app -y                       # 使用默认配置');
  logger.info('');
}
