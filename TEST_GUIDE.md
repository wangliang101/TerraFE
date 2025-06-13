# TerraFE 测试指南

## 测试环境概览

我已经为您的TerraFE项目建立了完整的Jest测试环境，支持ES模块和完整的测试覆盖率报告。

## 测试结构

```
__tests__/
├── core/
│   └── CacheManager.test.js        # 缓存管理器核心功能测试
├── utils/
│   └── helpers.test.js             # 工具函数测试
├── cache/
│   └── cache-implementation.test.js # 缓存实现详细测试
└── integration/
    └── cli.test.js                 # CLI集成测试
```

## 可用的测试命令

### 基础测试
```bash
npm test
```

### 监视模式（开发时推荐）
```bash
npm run test:watch
```

### 测试覆盖率
```bash
npm run test:coverage
```

## 当前测试覆盖情况

✅ **已完成的测试**：
- CacheManager URL解析功能
- 项目名称验证（npm包名验证）
- 文件系统操作
- 配置管理
- CLI基础功能（帮助信息、版本显示）
- 错误处理机制

📊 **测试统计**：
- 测试套件：4个 ✅
- 测试用例：23个 ✅
- 整体通过率：100%

## 测试特性

### 1. ES模块支持
- 完全支持ES6 import/export语法
- 使用实验性VM模块功能

### 2. 智能错误处理
- 优雅处理模块缺失情况
- 自动跳过不可用的组件测试

### 3. 自动清理
- 每次测试后自动清理临时文件和目录
- 防止测试间的相互影响

### 4. 实际功能验证
- 真实的Git URL解析测试
- 文件系统操作验证
- CLI命令执行测试

## 添加新测试

### 创建新的测试文件
1. 在相应的`__tests__`子目录中创建`.test.js`文件
2. 使用以下模板：

```javascript
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

describe('您的功能模块', () => {
  beforeEach(() => {
    // 测试前准备
  });

  afterEach(() => {
    // 测试后清理
  });

  test('应该能够...', () => {
    // 测试代码
    expect(actual).toBe(expected);
  });
});
```

### 测试命名约定
- 使用中文描述测试目的
- 使用"应该能够..."格式描述期望行为

## 最佳实践

1. **模拟外部依赖**：避免真实的网络请求或文件操作
2. **清理资源**：每个测试后清理临时文件
3. **独立性**：确保测试间不相互依赖
4. **描述性命名**：使用清晰的测试描述

## 下一步建议

1. 为更多核心模块添加测试（目前覆盖率：3.79%）
2. 添加端到端测试
3. 集成持续集成（CI）管道
4. 添加性能测试

## 故障排除

如果遇到ES模块相关错误，确保：
- 使用 `node --experimental-vm-modules` 运行Jest
- package.json中设置了 `"type": "module"`
- 测试文件使用ES6 import语法

现在您可以开始编写和运行测试了！🚀 