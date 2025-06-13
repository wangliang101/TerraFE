/**
 * awesome-app
 * 我的超棒应用
 *
 * Author: 张三
 * Created: 2025-06-13
 */

console.log('Welcome to awesome-app!');

function initApp() {
  const app = document.querySelector('#app');

  if (app) {
    app.innerHTML = `
      <h1>awesome-app</h1>
      <p>我的超棒应用</p>
      <p>Built with Vanilla JavaScript</p>
    `;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
