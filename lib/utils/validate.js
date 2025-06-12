import validateNpmName from 'validate-npm-package-name';

/**
 * 验证工具类
 * 提供各种验证功能
 */
class Validator {
  /**
   * 验证项目名称
   * @param {string} name 项目名称
   * @returns {Object} 验证结果
   */
  validateProjectName(name) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // 检查是否为空
    if (!name || name.trim() === '') {
      result.valid = false;
      result.errors.push('项目名称不能为空');
      return result;
    }

    // 验证npm包名规则
    const npmValidation = validateNpmName(name);

    if (!npmValidation.validForNewPackages) {
      result.valid = false;
      if (npmValidation.errors) {
        result.errors.push(...npmValidation.errors.map((error) => `项目名称不符合npm规范: ${error}`));
      }
    }

    if (npmValidation.warnings && npmValidation.warnings.length > 0) {
      result.warnings.push(...npmValidation.warnings.map((warning) => `项目名称警告: ${warning}`));
    }

    // 检查特殊字符
    const invalidChars = /[^a-zA-Z0-9\-_]/;
    if (invalidChars.test(name)) {
      result.valid = false;
      result.errors.push('项目名称只能包含字母、数字、连字符(-)和下划线(_)');
    }

    // 检查长度
    if (name.length > 214) {
      result.valid = false;
      result.errors.push('项目名称不能超过214个字符');
    }

    // 检查是否以点或下划线开头
    if (name.startsWith('.') || name.startsWith('_')) {
      result.valid = false;
      result.errors.push('项目名称不能以点(.)或下划线(_)开头');
    }

    return result;
  }

  /**
   * 验证URL
   * @param {string} url URL地址
   * @returns {boolean} 是否为有效URL
   */
  validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证GitHub仓库URL
   * @param {string} url GitHub仓库URL
   * @returns {Object} 验证结果
   */
  validateGitHubUrl(url) {
    const result = {
      valid: false,
      owner: null,
      repo: null,
      branch: null,
    };

    if (!this.validateUrl(url)) {
      return result;
    }

    const urlObj = new URL(url);
    if (urlObj.hostname !== 'github.com') {
      return result;
    }

    const pathParts = urlObj.pathname.split('/').filter((part) => part);
    if (pathParts.length >= 2) {
      result.valid = true;
      result.owner = pathParts[0];
      result.repo = pathParts[1].replace(/\.git$/, '');

      // 解析分支信息
      if (pathParts.length >= 4 && pathParts[2] === 'tree') {
        result.branch = pathParts[3];
      }
    }

    return result;
  }

  /**
   * 验证版本号
   * @param {string} version 版本号
   * @returns {boolean} 是否为有效版本号
   */
  validateVersion(version) {
    const versionRegex =
      /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    return versionRegex.test(version);
  }

  /**
   * 验证邮箱
   * @param {string} email 邮箱地址
   * @returns {boolean} 是否为有效邮箱
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证文件路径
   * @param {string} filePath 文件路径
   * @returns {boolean} 是否为有效路径
   */
  validateFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return false;
    }

    // 检查非法字符 (Windows)
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(filePath)) {
      return false;
    }

    return true;
  }

  /**
   * 验证端口号
   * @param {number|string} port 端口号
   * @returns {boolean} 是否为有效端口号
   */
  validatePort(port) {
    const portNum = parseInt(port, 10);
    return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
  }

  /**
   * 检查是否为空值
   * @param {any} value 值
   * @returns {boolean} 是否为空
   */
  isEmpty(value) {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === 'string') {
      return value.trim() === '';
    }

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value).length === 0;
    }

    return false;
  }
}

// 导出单例实例
export default new Validator();
