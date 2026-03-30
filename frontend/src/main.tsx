// 字体导入 - Tactical Command Center 字体系统
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/ibm-plex-sans';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 初始化 dark mode（跟随系统）
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (prefersDark) {
  document.documentElement.classList.add('dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);