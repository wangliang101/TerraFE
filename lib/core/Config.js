import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import logger from '../utils/logger.js';
import fileUtils from '../utils/file.js';

/**
 * 配置管理类
 * 用于管理全局配置和用户偏好设置
 */
class Config {
  constructor() {
    this.configDir = path.join(os.homedir(), '.terrafe');
    this.configFile = path.join(this.configDir, 'config.json');
    this.defaultConfig = {
      packageManager: 'auto', // auto, npm, yarn, pnpm
      gitInit: true,
      installDeps: true,
      registry: 'https://registry.npmjs.org/',
      templates: {
        cache: true,
        cacheTime: 86400000, // 24小时
        cacheDir: path.join(os.homedir(), '.terrafe', 'cache'),
        official: {
          // Vite 官方模板
          'vite-vanilla': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-vanilla',
            description: 'Vanilla JavaScript',
          },
          'vite-vanilla-ts': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-vanilla-ts',
            description: 'Vanilla TypeScript',
          },
          'vite-vue': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-vue',
            description: 'Vue 3',
          },
          'vite-vue-ts': {
            repo: 'antfu/vitesse-lite',
            description: 'Vue 3 + TypeScript + Vite 轻量级模板',
          },
          'vite-react': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react',
            description: 'React',
          },
          'vite-react-ts': {
            repo: 'vitejs/vite-react-ts-starter',
            description: 'React + TypeScript 启动模板',
          },
          'vite-react-swc': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-swc',
            description: 'React + SWC',
          },
          'vite-react-swc-ts': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-swc-ts',
            description: 'React + SWC + TypeScript',
          },
          'vite-preact': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-preact',
            description: 'Preact',
          },
          'vite-preact-ts': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-preact-ts',
            description: 'Preact + TypeScript',
          },
          'vite-svelte': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-svelte',
            description: 'Svelte',
          },
          'vite-svelte-ts': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-svelte-ts',
            description: 'Svelte + TypeScript',
          },
          'vite-solid': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-solid',
            description: 'Solid',
          },
          'vite-solid-ts': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-solid-ts',
            description: 'Solid + TypeScript',
          },
          'vite-qwik': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-qwik',
            description: 'Qwik',
          },
          'vite-qwik-ts': {
            repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-qwik-ts',
            description: 'Qwik + TypeScript',
          },
        },
        community: {
          // 社区优质模板
          'react-admin': {
            repo: 'https://github.com/marmelab/react-admin',
            description: 'React Admin 框架模板',
          },
          'vite-vue-admin': {
            repo: 'https://github.com/vbenjs/vue-vben-admin',
            description: 'Vue 3 + TypeScript 管理后台模板',
          },
          'vite-electron': {
            repo: 'https://github.com/electron-vite/electron-vite-vue',
            description: 'Electron + Vite + Vue 桌面应用模板',
          },
        },
        custom: {
          // 用户自定义模板
          // 格式: 'template-name': { repo: '...', description: '...', tags: [], addedAt: timestamp }
        },
      },
      user: {
        name: '',
        email: '',
        author: '',
      },
      verbose: false,
    };

    this.config = { ...this.defaultConfig };
    this.loaded = false;
  }

  /**
   * 加载配置
   * @returns {Promise<Object>} 配置对象
   */
  async load() {
    try {
      // 确保配置目录存在
      await fileUtils.ensureDir(this.configDir);

      if (fileUtils.exists(this.configFile)) {
        const configData = await fileUtils.readFile(this.configFile);
        const userConfig = JSON.parse(configData);

        // 合并默认配置和用户配置
        this.config = this.mergeConfig(this.defaultConfig, userConfig);
        logger.debug('配置文件加载成功');
      } else {
        // 创建默认配置文件
        await this.save();
        logger.debug('创建默认配置文件');
      }

      this.loaded = true;
      return this.config;
    } catch (error) {
      logger.debug(`配置文件加载失败: ${error.message}`);
      // 使用默认配置
      this.config = { ...this.defaultConfig };
      this.loaded = true;
      return this.config;
    }
  }

  /**
   * 保存配置
   * @returns {Promise<boolean>} 保存结果
   */
  async save() {
    try {
      await fileUtils.ensureDir(this.configDir);
      await fileUtils.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
      logger.debug('配置文件保存成功');
      return true;
    } catch (error) {
      logger.debug(`配置文件保存失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取配置值
   * @param {string} key 配置键，支持点表示法
   * @param {any} defaultValue 默认值
   * @returns {any} 配置值
   */
  get(key, defaultValue = undefined) {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * 设置配置值
   * @param {string} key 配置键，支持点表示法
   * @param {any} value 配置值
   * @returns {boolean} 设置结果
   */
  set(key, value) {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    const keys = key.split('.');
    let current = this.config;

    // 创建嵌套结构
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k] || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }

    // 设置值
    current[keys[keys.length - 1]] = value;

    logger.debug(`配置已更新: ${key} = ${JSON.stringify(value)}`);
    return true;
  }

  /**
   * 删除配置
   * @param {string} key 配置键
   * @returns {boolean} 删除结果
   */
  delete(key) {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    const keys = key.split('.');
    let current = this.config;

    // 找到父对象
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k] || typeof current[k] !== 'object') {
        return false; // 路径不存在
      }
      current = current[k];
    }

    // 删除属性
    const lastKey = keys[keys.length - 1];
    if (lastKey in current) {
      delete current[lastKey];
      logger.debug(`配置已删除: ${key}`);
      return true;
    }

    return false;
  }

  /**
   * 重置配置到默认值
   * @returns {Promise<boolean>} 重置结果
   */
  async reset() {
    this.config = { ...this.defaultConfig };
    const result = await this.save();
    if (result) {
      logger.info('配置已重置为默认值');
    }
    return result;
  }

  /**
   * 获取所有配置
   * @returns {Object} 配置对象
   */
  getAll() {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    return { ...this.config };
  }

  /**
   * 合并配置对象
   * @param {Object} defaultConfig 默认配置
   * @param {Object} userConfig 用户配置
   * @returns {Object} 合并后的配置
   */
  mergeConfig(defaultConfig, userConfig) {
    const result = { ...defaultConfig };

    for (const key in userConfig) {
      if (userConfig.hasOwnProperty(key)) {
        // 对于模板配置，完全使用用户配置而不是合并
        if (key === 'templates') {
          result[key] = { ...userConfig[key] };
          // 确保所有必要的模板类别都存在
          if (!result[key].official) result[key].official = {};
          if (!result[key].community) result[key].community = {};
          if (!result[key].custom) result[key].custom = {};
        } else if (
          typeof userConfig[key] === 'object' &&
          userConfig[key] !== null &&
          !Array.isArray(userConfig[key]) &&
          typeof defaultConfig[key] === 'object' &&
          defaultConfig[key] !== null &&
          !Array.isArray(defaultConfig[key])
        ) {
          // 递归合并其他对象
          result[key] = this.mergeConfig(defaultConfig[key], userConfig[key]);
        } else {
          // 直接覆盖
          result[key] = userConfig[key];
        }
      }
    }

    return result;
  }

  /**
   * 验证配置值
   * @param {string} key 配置键
   * @param {any} value 配置值
   * @returns {boolean} 验证结果
   */
  validate(key, value) {
    const validators = {
      packageManager: (val) => ['npm', 'yarn', 'pnpm'].includes(val),
      gitInit: (val) => typeof val === 'boolean',
      installDeps: (val) => typeof val === 'boolean',
      registry: (val) => typeof val === 'string' && val.startsWith('http'),
      'templates.cache': (val) => typeof val === 'boolean',
      'templates.cacheTime': (val) => typeof val === 'number' && val > 0,
      'user.name': (val) => typeof val === 'string',
      'user.email': (val) => typeof val === 'string',
      'user.author': (val) => typeof val === 'string',
      verbose: (val) => typeof val === 'boolean',
    };

    const validator = validators[key];
    if (validator) {
      return validator(value);
    }

    // 如果没有特定验证器，默认通过
    return true;
  }

  /**
   * 导出配置
   * @param {string} filePath 导出文件路径
   * @returns {Promise<boolean>} 导出结果
   */
  async export(filePath) {
    try {
      const configData = JSON.stringify(this.config, null, 2);
      await fileUtils.writeFile(filePath, configData);
      logger.info(`配置已导出到: ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`配置导出失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 导入配置
   * @param {string} filePath 导入文件路径
   * @returns {Promise<boolean>} 导入结果
   */
  async import(filePath) {
    try {
      if (!fileUtils.exists(filePath)) {
        logger.error(`配置文件不存在: ${filePath}`);
        return false;
      }

      const configData = await fileUtils.readFile(filePath);
      const importedConfig = JSON.parse(configData);

      // 合并配置
      this.config = this.mergeConfig(this.defaultConfig, importedConfig);

      // 保存合并后的配置
      const saved = await this.save();
      if (saved) {
        logger.info(`配置已从 ${filePath} 导入`);
      }

      return saved;
    } catch (error) {
      logger.error(`配置导入失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取配置文件路径
   * @returns {string} 配置文件路径
   */
  getConfigPath() {
    return this.configFile;
  }

  /**
   * 获取配置目录路径
   * @returns {string} 配置目录路径
   */
  getConfigDir() {
    return this.configDir;
  }

  /**
   * 添加自定义模板
   * @param {string} name 模板名称
   * @param {string} repo 仓库地址
   * @param {string} description 模板描述
   * @param {Array} tags 标签数组
   * @returns {Promise<boolean>} 添加结果
   */
  async addCustomTemplate(name, repo, description = '', tags = []) {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    // 验证模板名称
    if (!name || typeof name !== 'string') {
      throw new Error('模板名称不能为空');
    }

    // 验证仓库地址
    if (!repo || typeof repo !== 'string') {
      throw new Error('仓库地址不能为空');
    }

    // 检查是否已存在
    if (this.hasTemplate(name)) {
      throw new Error(`模板 "${name}" 已存在`);
    }

    // 添加自定义模板
    const customTemplates = this.get('templates.custom', {});
    customTemplates[name] = {
      repo,
      description,
      tags: Array.isArray(tags) ? tags : [],
      addedAt: Date.now(),
    };

    this.set('templates.custom', customTemplates);
    const saved = await this.save();

    if (saved) {
      logger.info(`自定义模板 "${name}" 添加成功`);
    }

    return saved;
  }

  /**
   * 删除模板
   * @param {string} name 模板名称
   * @returns {Promise<{success: boolean, category: string}}>} 删除结果
   */
  async removeTemplate(name) {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    // 检查模板存在于哪个分类中
    const customTemplates = this.get('templates.custom', {});
    const officialTemplates = this.get('templates.official', {});
    const communityTemplates = this.get('templates.community', {});

    let category = null;

    if (name in customTemplates) {
      category = 'custom';
      delete customTemplates[name];
      this.set('templates.custom', customTemplates);
    } else if (name in officialTemplates) {
      category = 'official';
      const updatedOfficialTemplates = { ...officialTemplates };
      delete updatedOfficialTemplates[name];
      this.set('templates.official', updatedOfficialTemplates);
    } else if (name in communityTemplates) {
      category = 'community';
      const updatedCommunityTemplates = { ...communityTemplates };
      delete updatedCommunityTemplates[name];
      this.set('templates.community', updatedCommunityTemplates);
    } else {
      throw new Error(`模板 "${name}" 不存在`);
    }

    const saved = await this.save();

    return { success: saved, category };
  }

  /**
   * 删除自定义模板（保持向后兼容）
   * @param {string} name 模板名称
   * @returns {Promise<boolean>} 删除结果
   */
  async removeCustomTemplate(name) {
    const result = await this.removeTemplate(name);
    if (result.category !== 'custom') {
      throw new Error(`"${name}" 不是自定义模板`);
    }
    return result.success;
  }

  /**
   * 更新自定义模板
   * @param {string} name 模板名称
   * @param {Object} updates 更新内容
   * @returns {Promise<boolean>} 更新结果
   */
  async updateCustomTemplate(name, updates) {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    const customTemplates = this.get('templates.custom', {});

    if (!(name in customTemplates)) {
      throw new Error(`自定义模板 "${name}" 不存在`);
    }

    // 合并更新
    customTemplates[name] = {
      ...customTemplates[name],
      ...updates,
      updatedAt: Date.now(),
    };

    this.set('templates.custom', customTemplates);
    const saved = await this.save();

    if (saved) {
      logger.info(`自定义模板 "${name}" 更新成功`);
    }

    return saved;
  }

  /**
   * 获取所有模板
   * @param {string} category 模板类别 ('all', 'official', 'community', 'custom')
   * @returns {Object} 模板对象
   */
  getAllTemplates(category = 'all') {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    const official = this.get('templates.official', {});
    const community = this.get('templates.community', {});
    const custom = this.get('templates.custom', {});

    switch (category) {
      case 'official':
        return official;
      case 'community':
        return community;
      case 'custom':
        return custom;
      case 'all':
      default:
        return {
          ...official,
          ...community,
          ...custom,
        };
    }
  }

  /**
   * 检查模板是否存在
   * @param {string} name 模板名称
   * @returns {boolean} 是否存在
   */
  hasTemplate(name) {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    const allTemplates = this.getAllTemplates();
    return name in allTemplates;
  }

  /**
   * 获取模板信息
   * @param {string} name 模板名称
   * @returns {Object|null} 模板信息
   */
  getTemplate(name) {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    const allTemplates = this.getAllTemplates();
    return allTemplates[name] || null;
  }

  /**
   * 获取自定义模板列表
   * @returns {Array} 自定义模板列表
   */
  getCustomTemplates() {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    const customTemplates = this.get('templates.custom', {});
    return Object.keys(customTemplates).map((name) => ({
      name,
      ...customTemplates[name],
    }));
  }

  /**
   * 搜索模板
   * @param {string} query 搜索关键词
   * @param {string} category 搜索范围
   * @returns {Array} 搜索结果
   */
  searchTemplates(query, category = 'all') {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    const templates = this.getAllTemplates(category);
    const results = [];

    for (const [name, template] of Object.entries(templates)) {
      const searchText = `${name} ${template.description || ''} ${(template.tags || []).join(' ')}`.toLowerCase();
      if (searchText.includes(query.toLowerCase())) {
        results.push({
          name,
          ...template,
        });
      }
    }

    return results;
  }

  /**
   * 恢复默认官方模板
   * @returns {Promise<boolean>} 恢复结果
   */
  async restoreOfficialTemplates() {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    // 获取默认官方模板
    const defaultOfficialTemplates = this.defaultConfig.templates.official;

    // 恢复官方模板
    this.set('templates.official', { ...defaultOfficialTemplates });
    const saved = await this.save();

    if (saved) {
      logger.info('官方模板已恢复到默认配置');
    }

    return saved;
  }

  /**
   * 恢复默认社区模板
   * @returns {Promise<boolean>} 恢复结果
   */
  async restoreCommunityTemplates() {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    // 获取默认社区模板
    const defaultCommunityTemplates = this.defaultConfig.templates.community;

    // 恢复社区模板
    this.set('templates.community', { ...defaultCommunityTemplates });
    const saved = await this.save();

    if (saved) {
      logger.info('社区模板已恢复到默认配置');
    }

    return saved;
  }

  /**
   * 恢复所有默认模板（官方+社区）
   * @returns {Promise<boolean>} 恢复结果
   */
  async restoreDefaultTemplates() {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    // 获取默认模板
    const defaultOfficialTemplates = this.defaultConfig.templates.official;
    const defaultCommunityTemplates = this.defaultConfig.templates.community;

    // 恢复模板
    this.set('templates.official', { ...defaultOfficialTemplates });
    this.set('templates.community', { ...defaultCommunityTemplates });
    const saved = await this.save();

    if (saved) {
      logger.info('所有默认模板（官方+社区）已恢复');
    }

    return saved;
  }

  /**
   * 获取已删除的默认模板
   * @param {string} category 分类 ('official', 'community', 'all')
   * @returns {Object} 已删除的模板
   */
  getDeletedDefaultTemplates(category = 'all') {
    if (!this.loaded) {
      throw new Error('配置未加载，请先调用 load() 方法');
    }

    const defaultOfficial = this.defaultConfig.templates.official;
    const currentOfficial = this.get('templates.official', {});
    const defaultCommunity = this.defaultConfig.templates.community;
    const currentCommunity = this.get('templates.community', {});

    const deletedOfficial = {};
    const deletedCommunity = {};

    // 找出已删除的官方模板
    for (const [name, template] of Object.entries(defaultOfficial)) {
      if (!(name in currentOfficial)) {
        deletedOfficial[name] = template;
      }
    }

    // 找出已删除的社区模板
    for (const [name, template] of Object.entries(defaultCommunity)) {
      if (!(name in currentCommunity)) {
        deletedCommunity[name] = template;
      }
    }

    switch (category) {
      case 'official':
        return deletedOfficial;
      case 'community':
        return deletedCommunity;
      case 'all':
      default:
        return {
          official: deletedOfficial,
          community: deletedCommunity,
        };
    }
  }
}

// 导出单例实例
export default new Config();
