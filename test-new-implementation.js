import CacheManager from './lib/cache/CacheManager.js';

const config = {
  get: (key, defaultValue) => {
    const values = {
      'templates.cacheDir': './test-cache',
      'templates.cacheTime': 86400000,
      'templates.cache': false, // 禁用缓存以便测试
    };
    return values[key] || defaultValue;
  },
};

const cm = new CacheManager(config);

async function testDownload() {
  console.log('=== 测试新的子目录下载实现 ===');

  const testUrl = 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-vanilla';

  try {
    console.log(`正在测试URL: ${testUrl}`);
    const parsed = cm.parseGitUrl(testUrl);
    console.log(`解析结果: ${parsed}`);

    console.log('\n开始下载...');
    const result = await cm.getTemplate(testUrl);
    console.log(`✅ 下载成功！路径: ${result}`);

    // 检查下载的文件
    const fs = await import('fs');
    if (fs.existsSync(result)) {
      const files = fs.readdirSync(result);
      console.log(`📁 下载的文件:`, files);
    }
  } catch (error) {
    console.log(`❌ 下载失败: ${error.message}`);
    console.log('错误详情:', error);
  }
}

testDownload();
