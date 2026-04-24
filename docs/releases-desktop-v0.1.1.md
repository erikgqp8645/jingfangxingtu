# 桌面版 Release Notes

版本：`desktop-v0.1.1`

适用分支：

- `codex/windows-desktop-app`

---

## 本次发布包含

- 保留 Electron 桌面运行壳与本地服务结构
- 延续 Windows 安装包与绿色版发布能力
- 保留首次启动复制可写数据到用户目录的机制
- 更新内置经典、关键词和关联解析数据
- 修正文档入口与桌面版维护说明中的版本信息

---

## 这次为什么升级到 0.1.1

这次升级不是桌面架构大改，也不是新增一整套新功能。

它更适合定义为一次：

- 数据更新
- 文档更新
- 桌面发布产物更新

所以版本号从 `0.1.0` 提升到 `0.1.1`，而不是 `0.2.0`。

---

## 当前版本适合怎么理解

如果你之前已经在用 `0.1.0`，那 `0.1.1` 可以理解为：

- 同一代桌面产品
- 更完整的数据
- 更准确的发布产物

也就是说，核心产品形态没变，但内容和发布结果更新了。

---

## 已验证

- `npm run assets:desktop`
- `npm run lint`
- `npm run build:desktop:dir`
- `npm run build:desktop`

---

## 当前产物

- Windows 安装包：`release/经方关系图 Setup 0.1.1.exe`
- 对外发布英文名安装包：`release/jingfangxingtu-0.1.1.exe`
- 绿色版：`release/jingfangxingtu-0.1.1-portable.zip`
- 目录版：`release/win-unpacked/`
