import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import download from 'download-git-repo';
import { promisify } from 'util';
import logger from '../utils/logger.js';
import fileUtils from '../utils/file.js';

/**
 * 缓存管理器
 * 负责模板的下载、缓存和管理
 */
class CacheManager {
  constructor(config) {
    this.config = config;
    this.cacheDir = config.get('templates.cacheDir');
    this.cacheTime = config.get('templates.cacheTime', 86400000); // 24小时
    this.downloadGitRepo = promisify(download);
  }

  /**
   * 初始化缓存目录
   */
  async initCacheDir() {
    try {
      await fileUtils.ensureDir(this.cacheDir);
      logger.debug(`缓存目录初始化完成: ${this.cacheDir}`);
    } catch (error) {
      logger.error(`缓存目录初始化失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成缓存键
   * @param {string} repoUrl 仓库URL
   * @returns {string} 缓存键
   */
  generateCacheKey(repoUrl) {
    return crypto.createHash('md5').update(repoUrl).digest('hex');
  }

  /**
   * 获取缓存路径
   * @param {string} cacheKey 缓存键
   * @returns {string} 缓存路径
   */
  getCachePath(cacheKey) {
    return path.join(this.cacheDir, cacheKey);
  }

  /**
   * 获取缓存元数据路径
   * @param {string} cacheKey 缓存键
   * @returns {string} 元数据路径
   */
  getMetadataPath(cacheKey) {
    return path.join(this.cacheDir, `${cacheKey}.meta.json`);
  }

  /**
   * 检查缓存是否存在且有效
   * @param {string} repoUrl 仓库URL
   * @returns {Promise<boolean>} 缓存是否有效
   */
  async isCacheValid(repoUrl) {
    const cacheKey = this.generateCacheKey(repoUrl);
    const cachePath = this.getCachePath(cacheKey);
    const metadataPath = this.getMetadataPath(cacheKey);

    // 检查缓存目录和元数据文件是否存在
    if (!fileUtils.exists(cachePath) || !fileUtils.exists(metadataPath)) {
      return false;
    }

    try {
      // 读取元数据
      const metadata = await this.getMetadata(cacheKey);
      const now = Date.now();

      // 检查是否过期
      if (now - metadata.cachedAt > this.cacheTime) {
        logger.debug(`缓存已过期: ${repoUrl}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.debug(`缓存验证失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取缓存的模板路径
   * @param {string} repoUrl 仓库URL
   * @returns {Promise<string|null>} 缓存路径，如果不存在则返回null
   */
  async getCachedTemplate(repoUrl) {
    const isValid = await this.isCacheValid(repoUrl);
    if (!isValid) {
      return null;
    }

    const cacheKey = this.generateCacheKey(repoUrl);
    const cachePath = this.getCachePath(cacheKey);

    logger.debug(`使用缓存的模板: ${repoUrl}`);
    return cachePath;
  }

  /**
   * 下载并缓存模板
   * @param {string} repoUrl 仓库URL
   * @param {Object} options 下载选项
   * @returns {Promise<string>} 缓存路径
   */
  async downloadAndCache(repoUrl, options = {}) {
    const cacheKey = this.generateCacheKey(repoUrl);
    const cachePath = this.getCachePath(cacheKey);
    const metadataPath = this.getMetadataPath(cacheKey);

    // 确保缓存目录存在
    await this.initCacheDir();

    // 如果缓存目录已存在，先清理
    if (fileUtils.exists(cachePath)) {
      await fileUtils.remove(cachePath);
    }

    // 解析Git仓库URL
    const gitUrl = this.parseGitUrl(repoUrl);

    try {
      logger.info(`正在下载模板: ${repoUrl}`);
      logger.debug(`原始URL: ${repoUrl}`);
      logger.debug(`解析后的Git URL: ${gitUrl}`);

      // 根据URL类型选择下载选项
      const downloadOptions = gitUrl.startsWith('direct:') ? {} : { clone: true };

      // 下载模板
      await this.downloadGitRepo(gitUrl, cachePath, downloadOptions);

      // 如果是direct下载且包含子目录，需要提取子目录
      if (gitUrl.startsWith('direct:') && gitUrl.includes('#')) {
        const subdirectory = gitUrl.split('#')[1];
        if (subdirectory) {
          await this.extractSubdirectory(cachePath, subdirectory);
        }
      }

      // 保存元数据
      const metadata = {
        repoUrl,
        cachedAt: Date.now(),
        cacheKey,
        ...options,
      };

      await fileUtils.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      logger.success(`模板下载完成: ${repoUrl}`);
      return cachePath;
    } catch (error) {
      logger.error(`模板下载失败: ${error.message}`);
      logger.debug(`详细错误信息:`, error);
      logger.debug(`尝试下载的URL: ${gitUrl}`);
      logger.debug(`目标路径: ${cachePath}`);

      // 提供针对性的错误建议
      if (error.message.includes('git checkout')) {
        logger.error('提示: 这可能是因为指定的分支或子目录不存在');
        logger.error('请检查:');
        logger.error('1. 分支名是否正确（如 main, master, develop 等）');
        logger.error('2. 子目录路径是否存在');
        logger.error('3. 仓库是否为公开仓库');
      } else if (error.message.includes('128')) {
        logger.error('提示: Git clone 失败，可能的原因：');
        logger.error('1. 网络连接问题');
        logger.error('2. 仓库不存在或无访问权限');
        logger.error('3. Git 配置问题');
      } else if (error.message.includes('Repository not found')) {
        logger.error('提示: 仓库不存在，请检查：');
        logger.error('1. 仓库地址是否正确');
        logger.error('2. 仓库是否为公开仓库');
        logger.error('3. 网络是否可以访问 GitHub');
      }

      // 清理失败的缓存
      if (fileUtils.exists(cachePath)) {
        await fileUtils.remove(cachePath);
      }
      if (fileUtils.exists(metadataPath)) {
        await fileUtils.remove(metadataPath);
      }

      throw error;
    }
  }

  /**
   * 解析Git仓库URL
   * @param {string} repoUrl 仓库URL
   * @returns {string} 处理后的Git URL
   */
  parseGitUrl(repoUrl) {
    // 处理GitHub URL
    if (repoUrl.includes('github.com')) {
      try {
        const url = new URL(repoUrl);
        const pathParts = url.pathname.split('/').filter((part) => part);

        if (pathParts.length >= 2) {
          const owner = pathParts[0];
          const repo = pathParts[1];

          // 检查是否有子路径（tree/分支名/子目录）
          if (pathParts.length > 2 && pathParts[2] === 'tree') {
            // 处理带子目录的情况
            // URL格式: https://github.com/owner/repo/tree/branch/subdirectory
            const branch = pathParts[3] || 'main';
            const subdirectory = pathParts.slice(4).join('/');

            if (subdirectory) {
              // 对于子目录，使用direct方式下载ZIP文件
              const zipUrl = `https://github.com/${owner}/${repo}/archive/${branch}.zip`;
              return `direct:${zipUrl}#${subdirectory}`;
            } else {
              // 只有分支，没有子目录，使用direct方式
              const zipUrl = `https://github.com/${owner}/${repo}/archive/${branch}.zip`;
              return `direct:${zipUrl}`;
            }
          } else {
            // 普通的仓库URL，没有子路径，使用direct方式
            const zipUrl = `https://github.com/${owner}/${repo}/archive/main.zip`;
            return `direct:${zipUrl}`;
          }
        }
      } catch (error) {
        logger.debug(`URL解析失败: ${error.message}`);
      }
    }

    // 如果已经是 owner/repo 格式，转换为direct方式
    if (repoUrl.match(/^[^\/]+\/[^\/]+$/)) {
      const zipUrl = `https://github.com/${repoUrl}/archive/main.zip`;
      return `direct:${zipUrl}`;
    }

    // 如果已经是 owner/repo#branch 格式，转换为direct方式
    const branchMatch = repoUrl.match(/^([^\/]+\/[^\/]+)#([^:]+)$/);
    if (branchMatch) {
      const [, repo, branch] = branchMatch;
      const zipUrl = `https://github.com/${repo}/archive/${branch}.zip`;
      return `direct:${zipUrl}`;
    }

    // 如果已经是 owner/repo#branch:subdirectory 格式，转换为direct方式
    const subdirMatch = repoUrl.match(/^([^\/]+\/[^\/]+)#([^:]+):(.+)$/);
    if (subdirMatch) {
      const [, repo, branch, subdirectory] = subdirMatch;
      const zipUrl = `https://github.com/${repo}/archive/${branch}.zip`;
      return `direct:${zipUrl}#${subdirectory}`;
    }

    // 如果已经是 direct: 格式，直接返回
    if (repoUrl.startsWith('direct:')) {
      return repoUrl;
    }

    return repoUrl;
  }

  /**
   * 获取缓存元数据
   * @param {string} cacheKey 缓存键
   * @returns {Promise<Object>} 元数据
   */
  async getMetadata(cacheKey) {
    const metadataPath = this.getMetadataPath(cacheKey);

    if (!fileUtils.exists(metadataPath)) {
      throw new Error('元数据文件不存在');
    }

    const content = await fileUtils.readFile(metadataPath);
    return JSON.parse(content);
  }

  /**
   * 获取模板（优先使用缓存）
   * @param {string} repoUrl 仓库URL
   * @param {Object} options 选项
   * @returns {Promise<string>} 模板路径
   */
  async getTemplate(repoUrl, options = {}) {
    // 如果禁用缓存，直接下载
    if (!this.config.get('templates.cache', true)) {
      return await this.downloadAndCache(repoUrl, options);
    }

    // 尝试获取缓存
    const cachedPath = await this.getCachedTemplate(repoUrl);
    if (cachedPath) {
      return cachedPath;
    }

    // 缓存不存在或已过期，重新下载
    console.log('debuge 重新下载模板', repoUrl, options);
    return await this.downloadAndCache(repoUrl, options);
  }

  /**
   * 清理过期缓存
   * @returns {Promise<number>} 清理的缓存数量
   */
  async cleanExpiredCache() {
    await this.initCacheDir();

    const files = await fileUtils.readDir(this.cacheDir);
    const metadataFiles = files.filter((file) => file.endsWith('.meta.json'));

    let cleanedCount = 0;

    for (const metadataFile of metadataFiles) {
      try {
        const cacheKey = metadataFile.replace('.meta.json', '');
        const metadata = await this.getMetadata(cacheKey);
        const now = Date.now();

        if (now - metadata.cachedAt > this.cacheTime) {
          await this.removeCacheItem(cacheKey);
          cleanedCount++;
        }
      } catch (error) {
        logger.debug(`清理缓存时出错: ${error.message}`);
      }
    }

    if (cleanedCount > 0) {
      logger.info(`已清理 ${cleanedCount} 个过期缓存`);
    }

    return cleanedCount;
  }

  /**
   * 清理所有缓存
   * @returns {Promise<boolean>} 清理结果
   */
  async clearAllCache() {
    try {
      if (fileUtils.exists(this.cacheDir)) {
        await fileUtils.remove(this.cacheDir);
        logger.info('所有缓存已清理');
      }
      return true;
    } catch (error) {
      logger.error(`清理缓存失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 移除指定缓存项
   * @param {string} cacheKey 缓存键
   * @returns {Promise<boolean>} 移除结果
   */
  async removeCacheItem(cacheKey) {
    try {
      const cachePath = this.getCachePath(cacheKey);
      const metadataPath = this.getMetadataPath(cacheKey);

      if (fileUtils.exists(cachePath)) {
        await fileUtils.remove(cachePath);
      }

      if (fileUtils.exists(metadataPath)) {
        await fileUtils.remove(metadataPath);
      }

      return true;
    } catch (error) {
      logger.error(`移除缓存项失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Promise<Object>} 缓存统计
   */
  async getCacheStats() {
    if (!fileUtils.exists(this.cacheDir)) {
      return {
        totalItems: 0,
        totalSize: 0,
        expiredItems: 0,
      };
    }

    const files = await fileUtils.readDir(this.cacheDir);
    const metadataFiles = files.filter((file) => file.endsWith('.meta.json'));

    let totalSize = 0;
    let expiredItems = 0;
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      const stats = await fileUtils.stat(filePath);
      totalSize += stats.size;
    }

    for (const metadataFile of metadataFiles) {
      try {
        const cacheKey = metadataFile.replace('.meta.json', '');
        const metadata = await this.getMetadata(cacheKey);

        if (now - metadata.cachedAt > this.cacheTime) {
          expiredItems++;
        }
      } catch (error) {
        // 忽略错误的元数据文件
      }
    }

    return {
      totalItems: metadataFiles.length,
      totalSize,
      expiredItems,
    };
  }

  /**
   * 提取子目录
   * @param {string} downloadPath 下载路径
   * @param {string} subdirectory 子目录路径
   */
  async extractSubdirectory(downloadPath, subdirectory) {
    try {
      logger.debug(`提取子目录: ${subdirectory}`);
      logger.debug(`下载路径: ${downloadPath}`);

      // 查找下载的内容
      const files = await fileUtils.readDir(downloadPath);
      logger.debug(`下载目录中的文件: ${JSON.stringify(files)}`);

      // 对于direct下载，内容可能直接解压到下载目录
      // 或者在一个包含仓库名-分支名的子目录中
      let rootPath = downloadPath;

      // 检查是否有单个目录包含所有内容（ZIP解压的典型情况）
      if (files.length === 1) {
        const singleFile = files[0];
        const singleFilePath = path.join(downloadPath, singleFile);
        const stats = await fileUtils.stat(singleFilePath);
        if (stats.isDirectory()) {
          rootPath = singleFilePath;
          logger.debug(`找到ZIP解压的根目录: ${singleFile}`);
        }
      } else {
        logger.debug(`内容直接解压到下载目录，文件数量: ${files.length}`);
      }

      // 列出根路径的内容
      const rootFiles = await fileUtils.readDir(rootPath);
      logger.debug(`根路径 ${rootPath} 的内容: ${JSON.stringify(rootFiles)}`);

      const sourcePath = path.join(rootPath, subdirectory);
      logger.debug(`查找子目录路径: ${sourcePath}`);

      // 检查子目录是否存在
      if (!fileUtils.exists(sourcePath)) {
        // 递归查找子目录的各个部分，从根路径开始
        const subdirParts = subdirectory.split('/');
        let currentPath = rootPath;

        logger.debug(`开始查找子目录，从根路径开始: ${currentPath}`);

        for (let i = 0; i < subdirParts.length; i++) {
          const currentFiles = await fileUtils.readDir(currentPath);
          logger.debug(`当前目录 ${currentPath} 的内容: ${JSON.stringify(currentFiles)}`);

          const nextPath = path.join(currentPath, subdirParts[i]);
          if (fileUtils.exists(nextPath)) {
            currentPath = nextPath;
            logger.debug(`✅ 找到路径部分: ${subdirParts.slice(0, i + 1).join('/')}`);
          } else {
            logger.error(`❌ 路径不存在: ${nextPath}`);
            logger.error(`   正在查找: ${subdirParts[i]}`);
            logger.error(`   可用选项: ${JSON.stringify(currentFiles)}`);
            throw new Error(`子目录 ${subdirectory} 不存在：找不到 ${subdirParts[i]} 在 ${currentPath}`);
          }
        }

        // 如果到这里，说明逻辑有问题
        throw new Error(`子目录 ${subdirectory} 不存在`);
      }

      // 创建临时目录来存放提取的内容
      const tempPath = path.join(downloadPath, 'temp-extract');
      await fileUtils.ensureDir(tempPath);

      // 复制子目录内容到临时目录
      await fileUtils.copy(sourcePath, tempPath);

      // 清理原有内容
      for (const file of files) {
        const filePath = path.join(downloadPath, file);
        if (file !== 'temp-extract') {
          await fileUtils.remove(filePath);
        }
      }

      // 将临时目录的内容移动到根目录
      const tempFiles = await fileUtils.readDir(tempPath);
      for (const file of tempFiles) {
        const sourcePath = path.join(tempPath, file);
        const targetPath = path.join(downloadPath, file);
        await fileUtils.move(sourcePath, targetPath);
      }

      // 清理临时目录
      await fileUtils.remove(tempPath);

      logger.debug(`子目录提取完成: ${subdirectory}`);
    } catch (error) {
      logger.error(`子目录提取失败: ${error.message}`);
      throw error;
    }
  }
}

export default CacheManager;
