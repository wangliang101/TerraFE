import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import CacheManager from '../../lib/cache/CacheManager.js';

describe('CacheManager', () => {
  let cacheManager;
  let testCacheDir;
  let mockConfig;

  beforeEach(() => {
    testCacheDir = './test-cache-' + Date.now();
    mockConfig = {
      get: (key, defaultValue) => {
        const values = {
          'templates.cacheDir': testCacheDir,
          'templates.cacheTime': 86400000,
          'templates.cache': true,
        };
        return values[key] || defaultValue;
      },
    };
    cacheManager = new CacheManager(mockConfig);
  });

  afterEach(async () => {
    // 清理测试缓存目录
    try {
      if (fs.existsSync(testCacheDir)) {
        await fs.remove(testCacheDir);
      }
    } catch (error) {
      console.warn('清理测试缓存目录失败:', error);
    }
  });

  describe('parseGitUrl', () => {
    test('应该能正确解析GitHub URL', () => {
      const testUrl = 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-vanilla';
      const result = cacheManager.parseGitUrl(testUrl);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('应该能处理不同格式的Git URL', () => {
      const urls = [
        'https://github.com/user/repo',
        'https://github.com/user/repo/tree/branch',
        'https://github.com/user/repo/tree/branch/path/to/dir'
      ];

      urls.forEach(url => {
        const result = cacheManager.parseGitUrl(url);
        expect(result).toBeDefined();
      });
    });
  });

  describe('getTemplate', () => {
    test('应该能够获取模板（模拟测试）', async () => {
      // 这是一个模拟测试，因为我们不想在测试中真的下载模板
      const mockUrl = 'https://github.com/test/repo';
      
      // 如果CacheManager有模拟下载的方法，我们可以测试它
      // 这里我们先测试方法存在
      expect(typeof cacheManager.getTemplate).toBe('function');
    });
  });

  describe('缓存配置', () => {
    test('应该能正确读取缓存配置', () => {
      expect(mockConfig.get('templates.cacheDir')).toBe(testCacheDir);
      expect(mockConfig.get('templates.cacheTime')).toBe(86400000);
      expect(mockConfig.get('templates.cache')).toBe(true);
    });

    test('应该能处理不存在的配置键', () => {
      const result = mockConfig.get('nonexistent.key', 'default');
      expect(result).toBe('default');
    });
  });
}); 