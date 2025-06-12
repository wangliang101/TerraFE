# Week 1: 核心架构设计文档

## 概述

本文档描述了 TerraFE 项目 Week 1 阶段完成的核心架构设计，包括 CLI 命令系统、核心工具类和错误处理机制的实现。

## 项目结构

```
TerraFE/
├── bin/
│   └── index.js                 # CLI 入口文件
├── lib/
│   ├── commands/                # 命令实现
│   │   ├── create.js           # create 命令
│   │   └── config.js           # config 命令
│   ├── core/                   # 核心功能模块
│   │   ├── ErrorHandler.js     # 错误处理器
│   │   ├── Generator.js        # 项目生成器
│   │   └── Config.js           # 配置管理器
│   └── utils/                  # 工具函数
│       ├── logger.js           # 日志工具
│       ├── file.js            # 文件操作工具
│       ├── git.js             # Git 操作工具
│       ├── npm.js             # NPM 操作工具
│       └── validate.js        # 验证工具
├── doc/                        # 文档目录
├── package.json               # 项目配置
└── README.md                  # 项目说明
```

## 核心模块设计

### 1. CLI 命令系统 (bin/index.js)

#### 主要功能

- **程序入口**: 使用 Commander.js 构建命令行界面
- **全局选项**: 支持 `--verbose`、`--silent` 等全局参数
- **命令路由**: 将命令分发到相应的处理模块
- **错误处理**: 集成全局错误处理机制

#### 支持的命令

```bash
# 创建项目
terrafe create <project-name> [options]
terrafe c <project-name> [options]  # 别名

# 配置管理
terrafe config <subcommand>
terrafe cfg <subcommand>  # 别名
```

#### 全局选项

- `--verbose`: 显示详细输出
- `--silent`: 静默模式
- `--version`: 显示版本号
- `--help`: 显示帮助信息

### 2. 错误处理机制 (lib/core/ErrorHandler.js)

#### 核心特性

- **统一错误处理**: 所有错误通过统一接口处理
- **用户友好**: 提供清晰的错误信息和解决建议
- **调试支持**: 支持详细的调试信息输出
- **优雅降级**: 非致命错误不影响主要功能

#### 错误类型

```javascript
// 自定义错误类
class TerraFEError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'TerraFEError';
    this.code = code;
    this.details = details;
  }
}
```

#### 错误代码

- `INVALID_PROJECT_NAME`: 项目名称不合法
- `DIRECTORY_EXISTS`: 目标目录已存在
- `GIT_NOT_FOUND`: 未安装 Git
- `NETWORK_ERROR`: 网络连接问题
- `TEMPLATE_NOT_FOUND`: 模板未找到
- `PERMISSION_DENIED`: 权限不足
- `DEPENDENCY_INSTALL_FAILED`: 依赖安装失败

### 3. 项目生成器 (lib/core/Generator.js)

#### 核心职责

- **项目验证**: 验证项目名称和创建条件
- **目录管理**: 创建和管理项目目录
- **模板处理**: 复制和处理模板文件
- **变量替换**: 处理模板中的变量占位符
- **Git 集成**: 自动初始化 Git 仓库
- **依赖安装**: 自动安装项目依赖

#### 生成流程

1. 验证项目创建条件
2. 创建项目目录
3. 复制模板文件
4. 处理模板变量
5. 初始化 Git 仓库
6. 安装项目依赖
7. 显示完成信息

### 4. 配置管理器 (lib/core/Config.js)

#### 功能特性

- **全局配置**: 管理用户的全局偏好设置
- **配置持久化**: 自动保存到用户目录
- **配置验证**: 验证配置值的合法性
- **导入导出**: 支持配置的导入和导出

#### 默认配置

```javascript
{
  packageManager: 'npm',
  gitInit: true,
  installDeps: true,
  registry: 'https://registry.npmjs.org/',
  templates: {
    registry: 'https://api.github.com/repos/terrafe/templates/contents',
    cache: true,
    cacheTime: 3600000
  },
  user: {
    name: '',
    email: '',
    author: ''
  },
  verbose: false
}
```

### 5. 工具类库

#### 日志工具 (lib/utils/logger.js)

- 支持多种日志级别（success, info, warn, error, debug）
- 彩色输出支持
- 详细模式切换

#### 文件工具 (lib/utils/file.js)

- 基于 fs-extra 的文件操作封装
- 异步文件操作支持
- 路径处理工具

#### Git 工具 (lib/utils/git.js)

- Git 仓库初始化
- 提交管理
- 远程仓库操作

#### NPM 工具 (lib/utils/npm.js)

- 包管理器检测
- 依赖安装
- 脚本执行

#### 验证工具 (lib/utils/validate.js)

- 项目名称验证
- URL 验证
- GitHub 仓库验证
- 版本号验证

## 命令使用示例

### create 命令

```bash
# 基本用法
terrafe create my-app

# 指定模板
terrafe create my-vue-app --template vue3

# 自定义配置
terrafe create my-react-app \
  --template react \
  --author "John Doe" \
  --description "My React Application" \
  --package-manager yarn

# 使用本地模板
terrafe create my-custom-app --template-path ./my-template

# 强制覆盖现有目录
terrafe create my-app --force

# 跳过 Git 初始化和依赖安装
terrafe create my-app --skip-git --skip-install
```

### config 命令

```bash
# 查看所有配置
terrafe config list

# 获取单个配置
terrafe config get packageManager

# 设置配置
terrafe config set packageManager yarn
terrafe config set user.name "John Doe"
terrafe config set user.email "john@example.com"

# 删除配置
terrafe config delete user.email

# 重置所有配置
terrafe config reset --force

# 导出配置
terrafe config export ./my-config.json

# 导入配置
terrafe config import ./my-config.json
```

## 设计原则

### 1. 模块化设计

- 每个功能模块职责单一
- 模块间低耦合、高内聚
- 支持功能的独立测试和维护

### 2. 错误处理优先

- 所有可能的错误情况都有相应处理
- 提供用户友好的错误信息
- 支持调试模式的详细信息输出

### 3. 用户体验优先

- 命令设计符合直觉
- 提供丰富的帮助信息
- 支持命令别名和快捷方式

### 4. 可扩展性

- 插件系统架构预留
- 配置系统支持扩展
- 模板系统支持自定义

## 技术栈

- **Node.js**: 运行环境 (>= 16.0.0)
- **Commander.js**: CLI 框架
- **Chalk**: 终端颜色输出
- **fs-extra**: 文件系统操作增强
- **validate-npm-package-name**: NPM 包名验证

## 测试建议

### 单元测试

- 各工具类的功能测试
- 错误处理机制测试
- 配置管理功能测试

### 集成测试

- 完整的项目创建流程测试
- 配置命令的端到端测试
- 错误场景的集成测试

### 用户验收测试

- 基本命令功能验证
- 错误提示友好性验证
- 帮助信息完整性验证

## 后续开发计划

### Week 2-3: 交互式创建流程

- 实现 inquirer.js 交互式问答
- 设计项目配置向导
- 开发模板变量系统

### Week 4-5: 模板管理系统

- 实现模板仓库管理
- 开发模板下载和缓存
- 建立模板验证机制

### Week 6+: 高级功能

- 插件系统开发
- 项目升级功能
- 性能优化和测试完善

## 总结

Week 1 完成的核心架构为 TerraFE 项目奠定了坚实的基础：

1. **完整的 CLI 框架**: 支持命令解析、参数验证和帮助系统
2. **健壮的错误处理**: 提供用户友好的错误信息和调试支持
3. **模块化的工具库**: 为后续功能开发提供了丰富的基础工具
4. **灵活的配置系统**: 支持用户个性化配置和偏好管理

这些核心组件为后续的模板管理、交互式创建和插件系统等高级功能提供了稳固的技术基础。
