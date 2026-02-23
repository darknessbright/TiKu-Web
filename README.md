# 题库练习APP - 网页版

一个基于纯 HTML/CSS/JavaScript 的离线题库练习应用，使用 Capacitor 打包为 Android APK。

## 功能特性

- 顺序练习
- 乱序练习
- 错题专项
- 错题本
- 每日刷题计划
- 字体大小设置
- 学习统计

## 本地开发

直接用浏览器打开 `www/index.html` 即可测试。

## 构建 APK

### 方式一：GitHub Actions（推荐）

1. 将代码推送到 GitHub
2. 进入 Actions 页面
3. 运行 "Build Android APK" workflow
4. 下载生成的 APK

### 方式二：本地构建

```bash
# 安装依赖
npm install

# 添加 Android 平台
npx cap add android

# 同步文件
npx cap sync

# 打开 Android Studio 构建
npx cap open android
```

## 技术栈

- HTML5 + CSS3 + JavaScript (ES6+)
- Capacitor 6.0
- localStorage 数据存储
- GitHub Actions CI/CD

## 项目结构

```
题库APP-Web/
├── www/
│   ├── index.html      # 主页面
│   ├── style.css       # 样式
│   ├── app.js          # 逻辑
│   ├── data.js         # 题库数据
│   └── logo.png        # 图标
├── .github/workflows/
│   └── build.yml       # 构建配置
├── capacitor.config.json
├── package.json
└── README.md
```

## 许可证

MIT
