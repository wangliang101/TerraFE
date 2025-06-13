import logger from '../utils/logger.js';
import config from '../core/Config.js';
import errorHandler from '../core/ErrorHandler.js';
import CacheManager from '../cache/CacheManager.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

/**
 * template 命令实现
 * @param {string} action 操作类型 (list, add, remove, search, info)
 * @param {string} name 模板名称或搜索关键词
 * @param {string} repo 仓库地址
 * @param {Object} options 命令选项
 */
export async function templateCommand(action, name, repo, options) {
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
        await listTemplates(options);
        break;
      case 'add':
        await addTemplate(name, repo, options);
        break;
      case 'remove':
      case 'rm':
        await removeTemplate(name, options);
        break;
      case 'restore':
        await restoreTemplates(name, options);
        break;
      case 'search':
        await searchTemplates(name, options);
        break;
      case 'info':
        await showTemplateInfo(name, options);
        break;
      case 'test':
        await testTemplate(name, options);
        break;
      default:
        showTemplateHelp();
        break;
    }
  } catch (error) {
    errorHandler.handle(error);
  }
}

/**
 * 列出所有模板
 * @param {Object} options 选项
 */
async function listTemplates(options) {
  logger.title('📋 模板列表');
  logger.newLine();

  const category = options.category || 'all';
  const templates = config.getAllTemplates(category);

  if (Object.keys(templates).length === 0) {
    logger.warn(`没有找到 ${category === 'all' ? '' : category + ' '}模板`);
    return;
  }

  // 按类别分组显示
  if (category === 'all') {
    const official = config.getAllTemplates('official');
    const community = config.getAllTemplates('community');
    const custom = config.getAllTemplates('custom');

    if (Object.keys(official).length > 0) {
      logger.info(chalk.cyan('📦 官方模板:'));
      displayTemplates(official, '  ');
      logger.newLine();
    }

    if (Object.keys(community).length > 0) {
      logger.info(chalk.cyan('🌟 社区模板:'));
      displayTemplates(community, '  ');
      logger.newLine();
    }

    if (Object.keys(custom).length > 0) {
      logger.info(chalk.cyan('🔧 自定义模板:'));
      displayTemplates(custom, '  ', true);
      logger.newLine();
    }
  } else {
    displayTemplates(templates, '', category === 'custom');
  }

  logger.info(`总计: ${chalk.green(Object.keys(templates).length)} 个模板`);
}

/**
 * 显示模板列表
 * @param {Object} templates 模板对象
 * @param {string} indent 缩进
 * @param {boolean} showTimestamp 是否显示时间戳
 */
function displayTemplates(templates, indent = '', showTimestamp = false) {
  for (const [name, template] of Object.entries(templates)) {
    const nameDisplay = chalk.green(name);
    const descDisplay = template.description ? chalk.gray(` - ${template.description}`) : '';
    const repoDisplay = chalk.blue(template.repo);

    logger.info(`${indent}${nameDisplay}${descDisplay}`);
    logger.info(`${indent}  ${repoDisplay}`);

    if (template.tags && template.tags.length > 0) {
      const tagsDisplay = template.tags.map((tag) => chalk.yellow(`#${tag}`)).join(' ');
      logger.info(`${indent}  ${tagsDisplay}`);
    }

    if (showTimestamp && template.addedAt) {
      const date = new Date(template.addedAt);
      logger.info(`${indent}  ${chalk.gray(`添加时间: ${date.toLocaleString()}`)}`);
    }

    logger.newLine();
  }
}

/**
 * 添加自定义模板
 * @param {string} name 模板名称
 * @param {string} repo 仓库地址
 * @param {Object} options 选项
 */
async function addTemplate(name, repo, options) {
  // 交互式添加模板
  if (!name || !repo) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'templateName',
        message: '请输入模板名称:',
        validate: (input) => {
          if (!input.trim()) return '模板名称不能为空';
          if (config.hasTemplate(input.trim())) return `模板 "${input.trim()}" 已存在`;
          return true;
        },
      },
      {
        type: 'input',
        name: 'repoUrl',
        message: '请输入仓库地址:',
        validate: (input) => {
          if (!input.trim()) return '仓库地址不能为空';
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: '请输入模板描述 (可选):',
      },
      {
        type: 'input',
        name: 'tags',
        message: '请输入标签 (用逗号分隔，可选):',
      },
    ]);

    name = answers.templateName.trim();
    repo = answers.repoUrl.trim();
    options.description = answers.description.trim();
    options.tags = answers.tags.trim();
  }

  // 处理标签
  const tags = options.tags
    ? options.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag)
    : [];

  // 验证仓库地址
  if (options.test !== false) {
    logger.info('正在验证仓库地址...');
    try {
      const cacheManager = new CacheManager(config);
      await cacheManager.getTemplate(repo);
      logger.success('仓库地址验证成功');
    } catch (error) {
      logger.error(`仓库地址验证失败: ${error.message}`);

      const shouldContinue = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: '是否仍要添加此模板?',
          default: false,
        },
      ]);

      if (!shouldContinue.continue) {
        logger.info('取消添加模板');
        return;
      }
    }
  }

  // 添加模板
  try {
    await config.addCustomTemplate(name, repo, options.description || '', tags);
    logger.success(`自定义模板 "${name}" 添加成功`);

    // 显示添加的模板信息
    logger.newLine();
    logger.info('模板信息:');
    logger.info(`  名称: ${chalk.green(name)}`);
    logger.info(`  仓库: ${chalk.blue(repo)}`);
    if (options.description) {
      logger.info(`  描述: ${chalk.gray(options.description)}`);
    }
    if (tags.length > 0) {
      logger.info(`  标签: ${tags.map((tag) => chalk.yellow(`#${tag}`)).join(' ')}`);
    }
  } catch (error) {
    logger.error(`添加模板失败: ${error.message}`);
  }
}

/**
 * 删除模板
 * @param {string} name 模板名称
 * @param {Object} options 选项
 */
async function removeTemplate(name, options) {
  if (!name) {
    // 交互式选择要删除的模板
    const allTemplates = config.getAllTemplates();
    const templateChoices = Object.entries(allTemplates).map(([templateName, template]) => {
      // 确定模板类型
      let type = '';
      const official = config.getAllTemplates('official');
      const community = config.getAllTemplates('community');
      const custom = config.getAllTemplates('custom');

      if (templateName in official) type = '📦 官方';
      else if (templateName in community) type = '🌟 社区';
      else if (templateName in custom) type = '🔧 自定义';

      return {
        name: `${type} ${templateName} - ${template.description || template.repo}`,
        value: templateName,
      };
    });

    if (templateChoices.length === 0) {
      logger.warn('没有模板可删除');
      return;
    }

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'templateName',
        message: '请选择要删除的模板:',
        choices: templateChoices,
      },
    ]);

    name = answer.templateName;
  }

  // 检查模板类型并给出警告
  const template = config.getTemplate(name);
  if (!template) {
    logger.error(`模板 "${name}" 不存在`);
    return;
  }

  // 确定模板类型
  let templateType = '';
  const official = config.getAllTemplates('official');
  const community = config.getAllTemplates('community');
  const custom = config.getAllTemplates('custom');

  if (name in official) templateType = '官方';
  else if (name in community) templateType = '社区';
  else if (name in custom) templateType = '自定义';

  // 对于官方和社区模板，给出恢复提示
  let confirmMessage = `确定要删除${templateType}模板 "${name}" 吗?`;
  if (templateType === '官方' || templateType === '社区') {
    confirmMessage += `\n\n⚠️  删除${templateType}模板后，你可以使用 'terrafe template restore' 命令恢复`;
  }

  // 确认删除
  if (!options.force) {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: confirmMessage,
        default: false,
      },
    ]);

    if (!answer.confirm) {
      logger.info('取消删除');
      return;
    }
  }

  try {
    const result = await config.removeTemplate(name);
    logger.success(`${templateType}模板 "${name}" 删除成功`);

    // 如果是官方或社区模板，提示恢复方法
    if (result.category === 'official' || result.category === 'community') {
      logger.info(
        `💡 提示: 可以使用 'terrafe template restore ${result.category}' 恢复${result.category === 'official' ? '官方' : '社区'}模板`
      );
    }
  } catch (error) {
    logger.error(`删除模板失败: ${error.message}`);
  }
}

/**
 * 恢复默认模板
 * @param {string} category 类别 (official, community, all)
 * @param {Object} options 选项
 */
async function restoreTemplates(category, options) {
  // 如果没有指定类别，交互式选择
  if (!category) {
    // 检查有哪些模板被删除了
    const deletedTemplates = config.getDeletedDefaultTemplates();
    const hasDeletedOfficial = Object.keys(deletedTemplates.official).length > 0;
    const hasDeletedCommunity = Object.keys(deletedTemplates.community).length > 0;

    if (!hasDeletedOfficial && !hasDeletedCommunity) {
      logger.info('没有被删除的默认模板需要恢复');
      return;
    }

    const choices = [];
    if (hasDeletedOfficial) {
      choices.push({
        name: `📦 恢复官方模板 (${Object.keys(deletedTemplates.official).length} 个)`,
        value: 'official',
      });
    }
    if (hasDeletedCommunity) {
      choices.push({
        name: `🌟 恢复社区模板 (${Object.keys(deletedTemplates.community).length} 个)`,
        value: 'community',
      });
    }
    if (hasDeletedOfficial && hasDeletedCommunity) {
      choices.push({
        name: `🔄 恢复所有默认模板`,
        value: 'all',
      });
    }

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'restoreCategory',
        message: '请选择要恢复的模板类别:',
        choices,
      },
    ]);

    category = answer.restoreCategory;
  }

  // 显示将要恢复的模板
  const deletedTemplates = config.getDeletedDefaultTemplates();
  let templatesToRestore = [];

  switch (category) {
    case 'official':
      templatesToRestore = Object.keys(deletedTemplates.official);
      break;
    case 'community':
      templatesToRestore = Object.keys(deletedTemplates.community);
      break;
    case 'all':
      templatesToRestore = [...Object.keys(deletedTemplates.official), ...Object.keys(deletedTemplates.community)];
      break;
    default:
      logger.error(`无效的类别: ${category}`);
      logger.info('支持的类别: official, community, all');
      return;
  }

  if (templatesToRestore.length === 0) {
    logger.info(`没有被删除的${category === 'all' ? '默认' : category === 'official' ? '官方' : '社区'}模板需要恢复`);
    return;
  }

  // 显示将要恢复的模板列表
  logger.info(`将要恢复以下模板:`);
  templatesToRestore.forEach((name) => {
    logger.info(`  ${chalk.green(name)}`);
  });
  logger.newLine();

  // 确认恢复
  if (!options.force) {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `确定要恢复这 ${templatesToRestore.length} 个模板吗?`,
        default: true,
      },
    ]);

    if (!answer.confirm) {
      logger.info('取消恢复');
      return;
    }
  }

  try {
    let success = false;

    switch (category) {
      case 'official':
        success = await config.restoreOfficialTemplates();
        break;
      case 'community':
        success = await config.restoreCommunityTemplates();
        break;
      case 'all':
        success = await config.restoreDefaultTemplates();
        break;
    }

    if (success) {
      logger.success(`${category === 'all' ? '所有默认' : category === 'official' ? '官方' : '社区'}模板恢复成功`);
      logger.info(`恢复了 ${templatesToRestore.length} 个模板`);
    } else {
      logger.error('模板恢复失败');
    }
  } catch (error) {
    logger.error(`恢复模板失败: ${error.message}`);
  }
}

/**
 * 搜索模板
 * @param {string} query 搜索关键词
 * @param {Object} options 选项
 */
async function searchTemplates(query, options) {
  if (!query) {
    logger.error('请提供搜索关键词');
    logger.info('使用方法: terrafe template search <keyword>');
    return;
  }

  logger.title(`🔍 搜索模板: "${query}"`);
  logger.newLine();

  const category = options.category || 'all';
  const results = config.searchTemplates(query, category);

  if (results.length === 0) {
    logger.warn(`没有找到包含 "${query}" 的模板`);
    return;
  }

  logger.info(`找到 ${chalk.green(results.length)} 个匹配的模板:`);
  logger.newLine();

  for (const template of results) {
    const nameDisplay = chalk.green(template.name);
    const descDisplay = template.description ? chalk.gray(` - ${template.description}`) : '';
    const repoDisplay = chalk.blue(template.repo);

    logger.info(`${nameDisplay}${descDisplay}`);
    logger.info(`  ${repoDisplay}`);

    if (template.tags && template.tags.length > 0) {
      const tagsDisplay = template.tags.map((tag) => chalk.yellow(`#${tag}`)).join(' ');
      logger.info(`  ${tagsDisplay}`);
    }

    logger.newLine();
  }
}

/**
 * 显示模板详细信息
 * @param {string} name 模板名称
 * @param {Object} options 选项
 */
async function showTemplateInfo(name, options) {
  if (!name) {
    logger.error('请提供模板名称');
    logger.info('使用方法: terrafe template info <name>');
    return;
  }

  const template = config.getTemplate(name);

  if (!template) {
    logger.error(`模板 "${name}" 不存在`);
    return;
  }

  logger.title(`📋 模板信息: ${name}`);
  logger.newLine();

  logger.info(`名称: ${chalk.green(name)}`);
  logger.info(`仓库: ${chalk.blue(template.repo)}`);

  if (template.description) {
    logger.info(`描述: ${chalk.gray(template.description)}`);
  }

  if (template.tags && template.tags.length > 0) {
    logger.info(`标签: ${template.tags.map((tag) => chalk.yellow(`#${tag}`)).join(' ')}`);
  }

  if (template.addedAt) {
    const date = new Date(template.addedAt);
    logger.info(`添加时间: ${chalk.gray(date.toLocaleString())}`);
  }

  if (template.updatedAt) {
    const date = new Date(template.updatedAt);
    logger.info(`更新时间: ${chalk.gray(date.toLocaleString())}`);
  }
}

/**
 * 测试模板下载
 * @param {string} name 模板名称
 * @param {Object} options 选项
 */
async function testTemplate(name, options) {
  if (!name) {
    logger.error('请提供模板名称');
    logger.info('使用方法: terrafe template test <name>');
    return;
  }

  const template = config.getTemplate(name);

  if (!template) {
    logger.error(`模板 "${name}" 不存在`);
    return;
  }

  logger.info(`测试模板: ${chalk.green(name)}`);
  logger.info(`仓库地址: ${chalk.blue(template.repo)}`);
  logger.newLine();

  try {
    logger.info('正在测试下载...');
    const cacheManager = new CacheManager(config);
    const templatePath = await cacheManager.getTemplate(template.repo);
    logger.success('模板下载测试成功');
    logger.info(`缓存路径: ${chalk.cyan(templatePath)}`);
  } catch (error) {
    logger.error(`模板下载测试失败: ${error.message}`);
  }
}

/**
 * 显示模板命令帮助
 */
export function showTemplateHelp() {
  logger.title('📋 模板管理命令');
  logger.newLine();

  logger.info('使用方法:');
  logger.info('  terrafe template <action> [options]');
  logger.newLine();

  logger.info('操作:');
  logger.info('  list                     列出所有模板');
  logger.info('  add <name> <repo>        添加自定义模板');
  logger.info('  remove <name>            删除模板（支持所有类型）');
  logger.info('  restore [category]       恢复默认模板');
  logger.info('  search <keyword>         搜索模板');
  logger.info('  info <name>              显示模板信息');
  logger.info('  test <name>              测试模板下载');
  logger.newLine();

  logger.info('选项:');
  logger.info('  --category <type>        模板类别 (official|community|custom|all)');
  logger.info('  --description <desc>     模板描述');
  logger.info('  --tags <tags>           标签 (用逗号分隔)');
  logger.info('  --force                 强制操作');
  logger.info('  --test / --no-test      是否测试下载 (默认: true)');
  logger.info('  --verbose               详细输出');
  logger.newLine();

  logger.info('示例:');
  logger.info('  terrafe template list');
  logger.info('  terrafe template list --category=custom');
  logger.info('  terrafe template add my-vue antfu/vitesse-lite');
  logger.info('  terrafe template remove vite-vue');
  logger.info('  terrafe template restore official');
  logger.info('  terrafe template restore all');
  logger.info('  terrafe template search vue');
  logger.info('  terrafe template info vite-vue');
  logger.newLine();

  logger.info('恢复命令说明:');
  logger.info('  official                 恢复所有官方模板');
  logger.info('  community                恢复所有社区模板');
  logger.info('  all                      恢复所有默认模板');
}
