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
      packageManager: 'npm',
      gitInit: true,
      installDeps: true,
      registry: 'https://registry.npmjs.org/',
      templates: {
        registry: 'https://github.com/wangliang101/monorepo_rollup_tpl.git',
        cache: true,
        cacheTime: 3600000, // 1小时
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
        if (
          typeof userConfig[key] === 'object' &&
          userConfig[key] !== null &&
          !Array.isArray(userConfig[key]) &&
          typeof defaultConfig[key] === 'object' &&
          defaultConfig[key] !== null &&
          !Array.isArray(defaultConfig[key])
        ) {
          // 递归合并对象
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
}

// 导出单例实例
export default new Config();
