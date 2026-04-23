# main 分支桌面版遗留清单

## 这份清单是做什么的

这份清单只做一件事：

把 `main` 分支里目前已经存在的“桌面版相关内容”列出来。

注意：

- 这份清单只是盘点
- 这次不删除
- 这次不修改
- 只是先把现状说清楚

---

## 结论先说

当前 `main` 分支里，**确实已经存在一批历史遗留的桌面版内容**。  
这些内容不是这一次新带进去的，而是更早之前就已经进入 `main`。

最关键的历史提交是：

- `9a97501 Add Windows desktop app packaging`

这说明：

`main` 现在不是“纯网页版分支”，而是“已经带有一部分桌面版打包能力的主线分支”。

---

## 一、代码与资源层面的桌面版遗留

### 1. `electron/` 目录

下面两个文件已经在 `main` 中：

- [electron/main.mjs](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\electron\main.mjs)
- [electron/bootstrap.mjs](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\electron\bootstrap.mjs)

它们的作用分别是：

- `electron/main.mjs`
  负责 Electron（桌面壳）窗口启动、开发模式地址、打包后本地服务启动
- `electron/bootstrap.mjs`
  负责桌面版安装后，把内置数据复制到可写目录

判断：

这两份文件都属于明显的桌面版专属内容。

### 2. `assets/desktop/` 目录

下面这些桌面图标资源已经在 `main` 中：

- [assets/desktop/icon-source.svg](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\assets\desktop\icon-source.svg)
- [assets/desktop/icon.png](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\assets\desktop\icon.png)
- [assets/desktop/icon.ico](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\assets\desktop\icon.ico)

判断：

这些也属于明显的桌面版专属资源。

### 3. 桌面图标生成脚本

下面这个脚本已经在 `main` 中：

- [scripts/generate-desktop-icon.ps1](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\scripts\generate-desktop-icon.ps1)

作用：

生成桌面版打包需要的图标文件。

判断：

这也是桌面版专属脚本。

---

## 二、`package.json` 中的桌面版遗留

下面这些内容都在 [package.json](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\package.json) 中：

### 1. Electron（桌面壳）入口

- `"main": "electron/main.mjs"`

说明：

项目已经声明了桌面版主进程入口。

### 2. 桌面版开发命令

- `dev:web:desktop`
- `dev:api:desktop`
- `dev:electron`
- `desktop:dev`

说明：

`main` 已经内置桌面版本地开发流程。

### 3. 桌面版打包命令

- `assets:desktop`
- `build:desktop`
- `build:desktop:dir`

说明：

`main` 已经内置 Windows 桌面版打包流程。

### 4. 桌面版依赖

- `electron`
- `electron-builder`

说明：

这些依赖只有桌面版打包和运行才需要。

### 5. `build` 打包配置

`package.json` 里的 `build` 字段已经包含：

- `appId`
- `productName`
- `executableName`
- `artifactName`
- `extraResources`
- `directories.output`
- `win`
- `nsis`

说明：

这些全部是 Windows 安装包相关配置。

判断：

这一整块都属于桌面版专属配置。

---

## 三、文档层面的桌面版遗留

### 1. README（说明首页）里已经有桌面版说明

在 [README.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\README.md) 中已经明确写了：

- 项目支持打包成 Windows 桌面应用
- 提供 `desktop:dev`
- 提供 `build:desktop`
- 提供 `build:desktop:dir`

判断：

这说明 `main` 的总说明文档已经把桌面版视为公开能力。

### 2. 文档目录首页里已经有桌面版入口

在 [docs/README.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\docs\README.md) 中，已经有“打包 Windows 桌面版”的入口说明。

### 3. 桌面版专门手册已经在 `main`

目前 `main` 中已经有桌面版专门手册，文件名是：

- `docs/桌面版打包与维护手册.md`

这份手册说明了：

- 怎么打包
- 安装后数据放在哪里
- 怎么备份
- 怎么迁移

判断：

这是一份明确的桌面版专属文档。

---

## 四、为什么这些内容算“历史遗留”

因为根据我们现在的新规则：

- `main` 应该只保留通用能力
- `codex/windows-desktop-app` 才是桌面版独立维护分支

但当前实际情况是：

`main` 里已经先存在了一套桌面版打包入口、资源、文档、依赖和 Electron（桌面壳）代码。

所以这些内容应当被视为：

`main` 中已有的历史遗留桌面版内容`

这里特别注意：

这不代表现在立刻要删。  
它只是说明，后面如果要进一步做分支边界收敛，就要从这些位置开始清理。

---

## 五、当前建议

当前最稳妥的做法不是立刻删除，而是按下面顺序处理：

1. 先严格执行新的分支规则
2. 新的桌面版专属改动只进 `codex/windows-desktop-app`
3. `main` 暂时不再继续增加新的桌面版专属内容
4. 等规则稳定后，再决定是否做一次“主线去桌面化”整理

---

## 六、后续如果要清理，优先级建议

如果以后要把 `main` 进一步收敛成纯主线网页版，建议优先检查下面这些位置：

1. [package.json](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\package.json)
2. [electron/main.mjs](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\electron\main.mjs)
3. [electron/bootstrap.mjs](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\electron\bootstrap.mjs)
4. [assets/desktop/icon.ico](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\assets\desktop\icon.ico)
5. [scripts/generate-desktop-icon.ps1](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\scripts\generate-desktop-icon.ps1)
6. [README.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\README.md)
7. [docs/README.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\docs\README.md)
8. `docs/桌面版打包与维护手册.md`

---

## 最后一句话

当前状态不是“这次误把桌面版带进了 `main`”，而是：

`main` 本来就已经带着一部分桌面版历史遗留内容。`

所以现在最重要的不是着急删，而是先守住边界：

以后不再把新的桌面版专属内容继续带进 `main`。
