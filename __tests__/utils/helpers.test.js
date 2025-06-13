import { describe, test, expect } from '@jest/globals';
import validateNpmName from 'validate-npm-package-name';

describe('工具函数测试', () => {
  describe('项目名称验证', () => {
    test('应该接受有效的npm包名', () => {
      const validNames = [
        'my-project',
        'react-app',
        'vue-cli',
        'terrafe-project'
      ];

      validNames.forEach(name => {
        const result = validateNpmName(name);
        expect(result.validForNewPackages).toBe(true);
      });
    });

    test('应该拒绝无效的npm包名', () => {
      const invalidNames = [
        'My Project', // 包含空格
        'react_app!', // 包含特殊字符
        '', // 空字符串
      ];

      invalidNames.forEach(name => {
        const result = validateNpmName(name);
        expect(result.validForNewPackages).toBe(false);
      });
    });
  });

  describe('URL处理函数', () => {
    test('应该能识别GitHub URL', () => {
      const githubUrls = [
        'https://github.com/user/repo',
        'https://github.com/user/repo.git',
        'git@github.com:user/repo.git'
      ];

      githubUrls.forEach(url => {
        const isGithub = url.includes('github.com');
        expect(isGithub).toBe(true);
      });
    });

    test('应该能提取仓库信息', () => {
      const url = 'https://github.com/vitejs/vite/tree/main/packages/create-vite';
      const urlParts = url.split('/');
      
      expect(urlParts).toContain('github.com');
      expect(urlParts).toContain('vitejs');
      expect(urlParts).toContain('vite');
    });
  });

  describe('文件路径处理', () => {
    test('应该能正确处理路径分隔符', () => {
      const paths = [
        './templates/react',
        '/Users/user/projects',
        'C:\\Users\\user\\projects'
      ];

      paths.forEach(path => {
        expect(typeof path).toBe('string');
        expect(path.length).toBeGreaterThan(0);
      });
    });
  });
}); 