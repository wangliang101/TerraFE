# TerraFE API 文档

## 概述

本文档详细描述了 TerraFE 各个模块的 API 接口，供开发者参考和扩展使用。

## 核心模块 API

### ErrorHandler 错误处理器

#### 导入

```javascript
import errorHandler, { TerraFEError } from '../lib/core/ErrorHandler.js';
```

#### 方法

##### `setDebugMode(debug: boolean): void`

设置调试模式。

**参数:**

- `debug`: 是否启用调试模式

```javascript
errorHandler.setDebugMode(true);
```

##### `handle(error: Error, exit: boolean = true): void`

处理错误。

**参数:**

- `error`: 错误对象
- `exit`: 是否退出程序，默认为 true

```javascript
try {
  // 某些操作
} catch (error) {
  errorHandler.handle(error, false); // 不退出程序
}
```

##### `createError(message: string, code: string, details?: any): TerraFEError`

创建自定义错误。

**参数:**

- `message`: 错误消息
- `code`: 错误代码
- `details`: 错误详情（可选）

**返回值:** TerraFEError 实例

```javascript
const error = errorHandler.createError('项目名称不合法', 'INVALID_PROJECT_NAME', { name: 'invalid-name@' });
```

##### `warn(message: string, suggestion?: string): void`

显示警告信息。

**参数:**

- `message`: 警告消息
- `suggestion`: 建议信息（可选）

```javascript
errorHandler.warn('配置文件未找到', '使用默认配置');
```

##### `asyncWrapper(fn: Function): Function`

异步错误处理包装器。

**参数:**

- `fn`: 要包装的异步函数

**返回值:** 包装后的函数

```javascript
const safeAsyncFunction = errorHandler.asyncWrapper(async () => {
  // 异步操作
});
```

### Generator 项目生成器

#### 导入

```javascript
import generator from '../lib/core/Generator.js';
```

#### 方法

##### `setOptions(options: Object): void`

设置生成选项。

**参数:**

- `options`: 生成选项对象

```javascript
generator.setOptions({
  force: true,
  skipGit: false,
  packageManager: 'yarn',
});
```

##### `generate(projectName: string, options: Object): Promise<boolean>`

生成项目。

**参数:**

- `projectName`: 项目名称
- `options`: 生成选项

**返回值:** Promise<boolean> - 生成是否成功

```javascript
const success = await generator.generate('my-app', {
  template: 'react',
  author: 'John Doe',
  templateData: {
    description: 'My React App',
  },
});
```

##### `validateProject(projectName: string, targetDir: string): Promise<boolean>`

验证项目创建条件。

**参数:**

- `projectName`: 项目名称
- `targetDir`: 目标目录

**返回值:** Promise<boolean> - 验证是否通过

```javascript
const isValid = await generator.validateProject('my-app', './my-app');
```

### Config 配置管理器

#### 导入

```javascript
import config from '../lib/core/Config.js';
```

#### 方法

##### `load(): Promise<Object>`

加载配置。

**返回值:** Promise<Object> - 配置对象

```javascript
const configData = await config.load();
```

##### `save(): Promise<boolean>`

保存配置。

**返回值:** Promise<boolean> - 保存是否成功

```javascript
const saved = await config.save();
```

##### `get(key: string, defaultValue?: any): any`

获取配置值。

**参数:**

- `key`: 配置键（支持点表示法）
- `defaultValue`: 默认值

**返回值:** 配置值

```javascript
const packageManager = config.get('packageManager', 'npm');
const userName = config.get('user.name');
```

##### `set(key: string, value: any): boolean`

设置配置值。

**参数:**

- `key`: 配置键（支持点表示法）
- `value`: 配置值

**返回值:** boolean - 设置是否成功

```javascript
config.set('packageManager', 'yarn');
config.set('user.name', 'John Doe');
```

##### `delete(key: string): boolean`

删除配置。

**参数:**

- `key`: 配置键

**返回值:** boolean - 删除是否成功

```javascript
const deleted = config.delete('user.email');
```

##### `reset(): Promise<boolean>`

重置配置到默认值。

**返回值:** Promise<boolean> - 重置是否成功

```javascript
const reset = await config.reset();
```

## 工具模块 API

### Logger 日志工具

#### 导入

```javascript
import logger from '../lib/utils/logger.js';
```

#### 方法

##### `setVerbose(verbose: boolean): void`

设置详细模式。

```javascript
logger.setVerbose(true);
```

##### `success(message: string): void`

输出成功信息。

```javascript
logger.success('项目创建成功！');
```

##### `info(message: string): void`

输出信息。

```javascript
logger.info('正在安装依赖...');
```

##### `warn(message: string): void`

输出警告信息。

```javascript
logger.warn('配置文件未找到');
```

##### `error(message: string): void`

输出错误信息。

```javascript
logger.error('项目创建失败');
```

##### `debug(message: string): void`

输出调试信息（仅在 verbose 模式下显示）。

```javascript
logger.debug('调试信息：变量值为 abc');
```

##### `title(title: string): void`

输出标题。

```javascript
logger.title('🚀 TerraFE 项目创建工具');
```

##### `highlight(text: string): string`

高亮文本。

```javascript
const highlighted = logger.highlight('重要信息');
logger.info(`这是 ${highlighted}`);
```

### FileUtils 文件工具

#### 导入

```javascript
import fileUtils from '../lib/utils/file.js';
```

#### 方法

##### `exists(filePath: string): boolean`

检查文件是否存在。

```javascript
const exists = fileUtils.exists('./package.json');
```

##### `ensureDir(dirPath: string): Promise<void>`

确保目录存在，如不存在则创建。

```javascript
await fileUtils.ensureDir('./my-directory');
```

##### `copy(src: string, dest: string): Promise<void>`

复制文件或目录。

```javascript
await fileUtils.copy('./template', './my-project');
```

##### `readFile(filePath: string, encoding?: string): Promise<string>`

读取文件内容。

```javascript
const content = await fileUtils.readFile('./README.md');
```

##### `writeFile(filePath: string, content: string): Promise<void>`

写入文件内容。

```javascript
await fileUtils.writeFile('./config.json', JSON.stringify(config));
```

##### `resolve(...paths: string[]): string`

解析路径。

```javascript
const fullPath = fileUtils.resolve(process.cwd(), 'my-project');
```

### GitUtils Git 工具

#### 导入

```javascript
import gitUtils from '../lib/utils/git.js';
```

#### 方法

##### `isGitInstalled(): boolean`

检查是否安装了 Git。

```javascript
const hasGit = gitUtils.isGitInstalled();
```

##### `initRepository(dirPath: string): Promise<boolean>`

初始化 Git 仓库。

```javascript
const success = await gitUtils.initRepository('./my-project');
```

##### `setupInitialCommit(dirPath: string): Promise<boolean>`

执行初始提交流程。

```javascript
const success = await gitUtils.setupInitialCommit('./my-project');
```

##### `isGitRepository(dirPath: string): boolean`

检查目录是否为 Git 仓库。

```javascript
const isRepo = gitUtils.isGitRepository('./my-project');
```

### NpmUtils NPM 工具

#### 导入

```javascript
import npmUtils from '../lib/utils/npm.js';
```

#### 方法

##### `detectPackageManager(): string`

检测可用的包管理器。

```javascript
const manager = npmUtils.detectPackageManager(); // 'npm', 'yarn', 或 'pnpm'
```

##### `installDependencies(dirPath: string, options?: Object): Promise<boolean>`

安装依赖。

**选项:**

- `manager`: 包管理器
- `silent`: 是否静默安装
- `timeout`: 超时时间

```javascript
const success = await npmUtils.installDependencies('./my-project', {
  manager: 'yarn',
  silent: true,
});
```

##### `installPackage(packages: string|string[], dirPath: string, options?: Object): Promise<boolean>`

安装指定包。

```javascript
const success = await npmUtils.installPackage(['react', 'react-dom'], './my-project');
```

##### `runScript(script: string, dirPath: string, options?: Object): Promise<boolean>`

运行 npm 脚本。

```javascript
const success = await npmUtils.runScript('build', './my-project');
```

### Validator 验证工具

#### 导入

```javascript
import validator from '../lib/utils/validate.js';
```

#### 方法

##### `validateProjectName(name: string): Object`

验证项目名称。

**返回值:**

```javascript
{
  valid: boolean,
  errors: string[],
  warnings: string[]
}
```

```javascript
const result = validator.validateProjectName('my-app');
if (!result.valid) {
  console.log('错误:', result.errors);
}
```

##### `validateUrl(url: string): boolean`

验证 URL。

```javascript
const isValidUrl = validator.validateUrl('https://github.com/user/repo');
```

##### `validateGitHubUrl(url: string): Object`

验证 GitHub 仓库 URL。

**返回值:**

```javascript
{
  valid: boolean,
  owner: string|null,
  repo: string|null,
  branch: string|null
}
```

```javascript
const result = validator.validateGitHubUrl('https://github.com/user/repo');
```

##### `validateVersion(version: string): boolean`

验证版本号。

```javascript
const isValid = validator.validateVersion('1.0.0');
```

##### `validateEmail(email: string): boolean`

验证邮箱地址。

```javascript
const isValid = validator.validateEmail('user@example.com');
```

## 命令模块 API

### Create 命令

#### 导入

```javascript
import { createProject, validateCreateOptions } from '../lib/commands/create.js';
```

#### 方法

##### `createProject(projectName: string, options: Object): Promise<void>`

执行项目创建。

**选项:**

- `template`: 模板名称
- `templatePath`: 本地模板路径
- `packageManager`: 包管理器
- `force`: 强制覆盖
- `skipGit`: 跳过 Git 初始化
- `skipInstall`: 跳过依赖安装
- `description`: 项目描述
- `author`: 项目作者
- `version`: 项目版本
- `license`: 项目许可证

```javascript
await createProject('my-app', {
  template: 'react',
  author: 'John Doe',
  packageManager: 'yarn',
});
```

##### `validateCreateOptions(projectName: string, options: Object): boolean`

验证创建选项。

```javascript
const isValid = validateCreateOptions('my-app', options);
```

### Config 命令

#### 导入

```javascript
import { configCommand } from '../lib/commands/config.js';
```

#### 方法

##### `configCommand(action: string, key?: string, value?: string, options?: Object): Promise<void>`

执行配置命令。

**动作类型:**

- `'list'`: 列出所有配置
- `'get'`: 获取配置值
- `'set'`: 设置配置值
- `'delete'`: 删除配置
- `'reset'`: 重置配置
- `'export'`: 导出配置
- `'import'`: 导入配置

```javascript
// 列出配置
await configCommand('list');

// 获取配置
await configCommand('get', 'packageManager');

// 设置配置
await configCommand('set', 'packageManager', 'yarn');

// 删除配置
await configCommand('delete', 'user.email');
```

## 错误代码参考

| 代码                        | 描述           | 解决方案                    |
| --------------------------- | -------------- | --------------------------- |
| `INVALID_PROJECT_NAME`      | 项目名称不合法 | 检查项目名称格式            |
| `DIRECTORY_EXISTS`          | 目标目录已存在 | 使用不同名称或 --force 参数 |
| `GIT_NOT_FOUND`             | 未安装 Git     | 安装 Git                    |
| `NETWORK_ERROR`             | 网络连接问题   | 检查网络连接                |
| `TEMPLATE_NOT_FOUND`        | 模板未找到     | 检查模板名称或路径          |
| `PERMISSION_DENIED`         | 权限不足       | 检查文件权限                |
| `DEPENDENCY_INSTALL_FAILED` | 依赖安装失败   | 检查网络和包管理器          |

## 扩展示例

### 创建自定义命令

```javascript
// lib/commands/custom.js
import logger from '../utils/logger.js';
import errorHandler from '../core/ErrorHandler.js';

export async function customCommand(options) {
  try {
    logger.info('执行自定义命令...');
    // 自定义逻辑
    logger.success('自定义命令执行完成');
  } catch (error) {
    errorHandler.handle(error);
  }
}
```

### 扩展配置验证

```javascript
// 在 Config.js 中添加新的验证器
validate(key, value) {
  const validators = {
    // 现有验证器...
    'custom.setting': (val) => typeof val === 'string' && val.length > 0
  };

  const validator = validators[key];
  return validator ? validator(value) : true;
}
```

### 创建自定义错误类型

```javascript
import { TerraFEError } from '../lib/core/ErrorHandler.js';

class CustomError extends TerraFEError {
  constructor(message, details) {
    super(message, 'CUSTOM_ERROR', details);
  }
}
```

## 最佳实践

1. **错误处理**: 始终使用 errorHandler 处理错误
2. **日志输出**: 使用 logger 进行统一的日志输出
3. **配置管理**: 通过 config 模块管理用户偏好
4. **异步操作**: 使用 async/await 处理异步操作
5. **参数验证**: 在执行操作前验证输入参数
6. **资源清理**: 在错误情况下及时清理资源

这些 API 为 TerraFE 的扩展和定制提供了强大的基础，开发者可以基于这些接口构建新的功能模块。
