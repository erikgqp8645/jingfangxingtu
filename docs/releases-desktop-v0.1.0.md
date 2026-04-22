# 桌面版 Release Notes

版本：`desktop-v0.1.0`

适用分支：

- `codex/windows-desktop-app`

---

## 本次发布包含

- 引入 Electron 桌面运行壳
- 把原来依赖 `vite.config.ts` 的本地 API 抽离成独立本地服务
- 让浏览器开发模式和桌面开发模式共用一套数据服务逻辑
- 支持 Windows 安装包构建
- 首次启动时自动复制可写数据到用户目录
- 增加桌面图标和安装包基础元数据
- 增加桌面版打包与维护手册

---

## 主要新增能力

### 1. 桌面运行模式

现在项目已经可以作为 Windows 桌面应用运行，而不只是浏览器页面。

常用命令：

```bash
npm run desktop:dev
```

### 2. Windows 打包

已经支持生成目录版和安装包：

```bash
npm run build:desktop:dir
npm run build:desktop
```

### 3. 可维护的数据目录

安装后的真实可写数据会放到用户目录，而不是安装目录。

这样后续维护关键词、经典 JSON、SQLite 数据库都更安全。

### 4. 图标与元数据

已经补齐：

- 应用图标
- 安装包名称
- 版本号
- 基础打包元数据

---

## 重要说明

这个版本是桌面版分支版本，不作为主线浏览器版的默认发布说明。

推荐后续持续在下面这个分支维护：

- `codex/windows-desktop-app`

---

## 已验证

- `npm run assets:desktop`
- `npm run lint`
- `npm run build:desktop`

---

## 当前产物

- Windows 安装包：`release/经方关系图 Setup 0.1.0.exe`
- 目录版：`release/win-unpacked/`
