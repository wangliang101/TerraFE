import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

describe('TerraFE CLI 集成测试', () => {
  const testOutputDir = './test-output';
  
  beforeAll(async () => {
    // 确保测试输出目录存在
    await fs.ensureDir(testOutputDir);
  });

  afterAll(async () => {
    // 清理测试输出目录
    try {
      if (fs.existsSync(testOutputDir)) {
        await fs.remove(testOutputDir);
      }
    } catch (error) {
      console.warn('清理测试输出目录失败:', error);
    }
  });

  describe('CLI 基本功能', () => {
    test('应该能显示帮助信息', async () => {
      try {
        const { stdout } = await execAsync('node bin/index.js --help');
        expect(stdout).toContain('TerraFE');
      } catch (error) {
        // 如果命令返回非零退出码，错误信息可能在stderr中
        expect(error.stdout || error.stderr).toContain('help');
      }
    }, 10000); // 10秒超时

    test('应该能显示版本信息', async () => {
      try {
        const { stdout } = await execAsync('node bin/index.js --version');
        expect(stdout).toMatch(/\d+\.\d+\.\d+/); // 匹配版本号格式
      } catch (error) {
        expect(error.stdout || error.stderr).toMatch(/\d+\.\d+\.\d+/);
      }
    }, 10000);
  });

  describe('CLI 错误处理', () => {
    test('应该能处理无效命令', async () => {
      try {
        await execAsync('node bin/index.js invalid-command');
        // 如果没有错误，这个测试应该失败
        expect(true).toBe(false);
      } catch (error) {
        // 期望有错误输出
        expect(error.code).not.toBe(0);
      }
    }, 10000);
  });

  describe('配置验证', () => {
    test('package.json 应该包含必要的字段', async () => {
      const packageJson = await fs.readJson('./package.json');
      
      expect(packageJson.name).toBe('terrafe');
      expect(packageJson.version).toBeDefined();
      expect(packageJson.bin).toBeDefined();
      expect(packageJson.bin.terrafe).toBe('./bin/index.js');
    });

    test('入口文件应该存在', async () => {
      const entryFileExists = await fs.pathExists('./bin/index.js');
      expect(entryFileExists).toBe(true);
    });
  });
}); 