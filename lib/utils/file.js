import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * 文件操作工具类
 * 提供常用的文件和目录操作功能
 */
class FileUtils {
  /**
   * 检查文件或目录是否存在
   * @param {string} filePath 文件路径
   * @returns {boolean} 是否存在
   */
  exists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * 创建目录
   * @param {string} dirPath 目录路径
   */
  async ensureDir(dirPath) {
    await fs.ensureDir(dirPath);
  }

  /**
   * 删除文件或目录
   * @param {string} filePath 文件路径
   */
  async remove(filePath) {
    await fs.remove(filePath);
  }

  /**
   * 复制文件或目录
   * @param {string} src 源路径
   * @param {string} dest 目标路径
   */
  async copy(src, dest) {
    await fs.copy(src, dest);
  }

  /**
   * 移动文件或目录
   * @param {string} src 源路径
   * @param {string} dest 目标路径
   */
  async move(src, dest) {
    await fs.move(src, dest);
  }

  /**
   * 读取文件内容
   * @param {string} filePath 文件路径
   * @param {string} encoding 编码格式
   * @returns {string} 文件内容
   */
  async readFile(filePath, encoding = 'utf8') {
    return await fs.readFile(filePath, encoding);
  }

  /**
   * 写入文件内容
   * @param {string} filePath 文件路径
   * @param {string} content 文件内容
   */
  async writeFile(filePath, content) {
    await fs.writeFile(filePath, content, 'utf8');
  }

  /**
   * 读取目录内容
   * @param {string} dirPath 目录路径
   * @returns {Array} 目录内容列表
   */
  async readDir(dirPath) {
    return await fs.readdir(dirPath);
  }

  /**
   * 获取文件状态
   * @param {string} filePath 文件路径
   * @returns {Object} 文件状态对象
   */
  async stat(filePath) {
    return await fs.stat(filePath);
  }

  /**
   * 检查是否为目录
   * @param {string} filePath 文件路径
   * @returns {boolean} 是否为目录
   */
  async isDirectory(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查是否为文件
   * @param {string} filePath 文件路径
   * @returns {boolean} 是否为文件
   */
  async isFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取当前文件的目录路径
   * @param {string} importMetaUrl import.meta.url
   * @returns {string} 目录路径
   */
  getCurrentDir(importMetaUrl) {
    return path.dirname(fileURLToPath(importMetaUrl));
  }

  /**
   * 解析路径
   * @param {...string} paths 路径片段
   * @returns {string} 完整路径
   */
  resolve(...paths) {
    return path.resolve(...paths);
  }

  /**
   * 连接路径
   * @param {...string} paths 路径片段
   * @returns {string} 连接后的路径
   */
  join(...paths) {
    return path.join(...paths);
  }

  /**
   * 获取文件扩展名
   * @param {string} filePath 文件路径
   * @returns {string} 扩展名
   */
  getExt(filePath) {
    return path.extname(filePath);
  }

  /**
   * 获取文件名（不含扩展名）
   * @param {string} filePath 文件路径
   * @returns {string} 文件名
   */
  getBasename(filePath) {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * 获取目录名
   * @param {string} filePath 文件路径
   * @returns {string} 目录名
   */
  getDirname(filePath) {
    return path.dirname(filePath);
  }
}

// 导出单例实例
export default new FileUtils();
