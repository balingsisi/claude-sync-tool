# claude-config-sync

> 🔄 在多个终端环境之间轻松同步 Claude Code 配置

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/claude-config-sync.svg)](https://www.npmjs.com/package/claude-config-sync)
[![Node.js Version](https://img.shields.io/node/v/claude-config-sync.svg)](https://nodejs.org)

## 📖 简介

当您在多台机器或多个终端上使用 Claude Code 时，保持配置同步是一个既耗时又容易出错的手动过程。`claude-config-sync` 专门解决这个问题——它使用 Git 对您的 Claude Code 配置进行版本控制，让您可以在所有环境之间轻松同步。

### ✨ 核心优势

- 🚀 **一键同步** - 无需手动复制文件或重新安装技能
- 🎯 **选择性同步** - 灵活选择要同步的内容类型
- 🩺 **健康检查** - 检测技能问题，确保配置完整性
- 👁️ **变更预览** - 同步前查看变更，避免意外覆盖
- 🔒 **安全可靠** - 自动排除敏感文件，操作前自动备份
- ⚡ **自动监听** - 文件变更时自动同步
- 🛠️ **智能冲突处理** - 多种冲突解决策略
- 📦 **版本控制** - 完整的 Git 历史记录，可随时回滚

## 📦 安装

### 方式一：全局安装（推荐）

```bash
npm install -g claude-config-sync
```

### 方式二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/user/claude-config-sync.git
cd claude-config-sync

# 安装依赖并构建
npm install
npm run build

# 全局链接
npm link
```

### 系统要求

- Node.js >= 18.0.0
- Git（需已配置 SSH 密钥或个人访问令牌）

## 🚀 快速开始

### 1️⃣ 初始化配置

```bash
claude-config-sync init
```

您将看到交互式配置向导：

```
? 请输入 Git 仓库 URL: git@github.com:username/claude-config.git
? 请输入分支名称: main
? 选择要同步的内容：
  ◯ Skills（技能）
  ◯ Plugins（插件）
  ◯ Settings（设置）
  ◯ Projects（项目）
  ◯ History（历史记录）
? 冲突解决策略: 询问（交互式）
✓ 配置已保存到 ~/.claude-config-sync/config.json
✓ 仓库初始化完成
? 是否立即推送当前配置？ Yes
✓ 已推送 15 个文件到远程仓库
```

### 2️⃣ 推送配置

```bash
# 在第一台机器上
claude-config-sync push
```

### 3️⃣ 在其他机器上拉取

```bash
# 在第二台机器上
claude-config-sync pull
```

就这么简单！您的所有配置现在已在多台机器间同步。

## 📚 详细命令说明

### 初始化命令

```bash
claude-config-sync init [选项]
```

**选项：**
- `--repo <url>` - Git 仓库 URL（可选，未提供时交互式输入）
- `--branch <name>` - 分支名称（默认：main）

**示例：**
```bash
# 使用命令行参数快速初始化
claude-config-sync init --repo git@github.com:user/config.git --branch main

# 或使用交互式向导
claude-config-sync init
```

### 推送命令

```bash
claude-config-sync push [选项]
```

**选项：**
- `--dry-run` - 预演模式，显示将要执行的操作但不实际执行
- `--force` - 强制推送，覆盖远程更改

**示例：**
```bash
# 正常推送
claude-config-sync push

# 预演推送（查看将要推送的内容）
claude-config-sync push --dry-run

# 强制推送（谨慎使用）
claude-config-sync push --force
```

### 拉取命令

```bash
claude-config-sync pull [选项]
```

**选项：**
- `--dry-run` - 预演模式
- `--force` - 强制拉取，覆盖本地更改

**示例：**
```bash
# 拉取远程更新
claude-config-sync pull

# 预演拉取
claude-config-sync pull --dry-run
```

### 双向同步命令

```bash
claude-config-sync sync [选项]
```

先执行 pull 拉取远程更改，再执行 push 推送本地更改。

**选项：**
- `--dry-run` - 预演模式

**使用场景：** 适合在多台机器上同时工作时快速同步最新状态。

### 状态查看命令

```bash
claude-config-sync status [选项]
```

**选项：**
- `--verbose` - 显示详细信息

**输出示例：**
```
📊 同步状态
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 仓库信息
   URL: git@github.com:user/claude-config.git
   分支: main

📈 当前状态
   ✓ 与远程保持同步

📦 已同步项目
   • Skills
   • Plugins
   • Settings

📝 最近提交
   [main] abc1234 Update skills (2 hours ago)

💾 可用备份: 3
   • backup-2024-01-15T10:30:00Z
   • backup-2024-01-14T15:20:00Z
   • backup-2024-01-13T09:10:00Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 健康检查命令

```bash
claude-config-sync doctor [选项]
```

**选项：**
- `--fix` - 尝试自动修复问题（实验性功能，即将推出）
- `--json` - 以 JSON 格式输出结果
- `-v, --verbose` - 显示详细信息（包括文件大小和修改时间）

**功能说明：**
检查所有已安装技能的健康状况，报告：
- **错误（Errors）** - 损坏或缺失的技能（如缺少 SKILL.md）
- **警告（Warnings）** - 需要注意的问题（如缺少 frontmatter、过时的技能）
- **健康（Healthy）** - 正常配置的技能

**输出示例：**
```bash
$ claude-config-sync doctor

═══ 技能健康检查报告 ═══

总技能数: 40
✓ 健康: 32
⚠ 警告: 8
✗ 错误: 0

警告:
  ⚠ web-search-zai
    • 未找到 YAML frontmatter
    • 建议: 添加 name 和 description 字段

  ⚠ old-skill
    • 最后更新于 180 天前
    • 建议: 检查是否有更新版本
```

### 变更预览命令

```bash
claude-config-sync diff [选项]
```

**选项：**
- `--detailed` - 显示每个文件的详细差异
- `--json` - 以 JSON 格式输出结果
- `--push-only` - 仅显示将要推送的变更
- `--pull-only` - 仅显示将要拉取的变更

**功能说明：**
在同步前预览变更，显示将要推送和拉取的内容，帮助您避免意外覆盖文件。

**输出示例：**
```bash
$ claude-config-sync diff

═══ 同步变更预览 ═══

📤 将要推送 (3 个文件):
  + skills/new-skill/              [新技能] (~12KB)
  M skills/updated-skill/SKILL.md  [技能]
  - skills/old-skill/              [技能]

📥 将要拉取 (2 个文件):
  M settings.json                  [设置]
  + plugins/new-plugin.json        [插件]

⚠️ 冲突: 0

摘要:
  推送: 3 (新增: 1, 修改: 1, 删除: 1)
  拉取: 2 (新增: 1, 修改: 1)
```

### 配置管理命令

```bash
# 列出所有配置
claude-config-sync config list

# 获取特定配置项
claude-config-sync config get sync.repository

# 设置配置项
claude-config-sync config set sync.conflictStrategy newest

# 添加排除模式（不同步的文件）
claude-config-sync config exclude "*.pem"

# 移除排除模式
claude-config-sync config include "*.md"

# 打开交互式配置编辑器
claude-config-sync config edit
```

**常用配置示例：**

```bash
# 设置冲突解决策略为"保留最新"
claude-config-sync config set sync.conflictStrategy newest

# 禁用项目同步
claude-config-sync config set sync.include.projects false

# 添加自定义排除规则
claude-config-sync config exclude "*.log"
claude-config-sync config exclude "temp/**"
```

### 自动监听命令

```bash
# 启动文件监听（自动同步）
claude-config-sync watch start [选项]

# 停止监听
claude-config-sync watch stop

# 查看监听状态
claude-config-sync watch status
```

**选项：**
- `--delay <毫秒>` - 防抖延迟时间（默认：5000ms）

**工作原理：**
监听 `~/.claude/` 目录下的文件变化，在指定的延迟时间后自动执行 `sync` 命令。

**使用场景：**
```bash
# 启动自动监听
claude-config-sync watch start --delay 10000
✓ 文件监听器已启动
  监听路径: ~/.claude
  防抖延迟: 10 秒
  状态: 运行中

# 当您安装新技能或修改设置后
# 10 秒内无新更改则自动同步
# 按 Ctrl+C 停止监听
```

### 备份管理命令

```bash
# 创建备份
claude-config-sync backup create

# 列出所有备份
claude-config-sync backup list [选项]
  # --verbose 显示详细信息

# 从备份恢复
claude-config-sync backup restore <备份名称或编号>

# 删除指定备份
claude-config-sync backup delete <备份名称或编号>

# 清理旧备份（保留最近 N 个）
claude-config-sync backup clean --keep 5
```

**使用示例：**

```bash
# 创建备份
$ claude-config-sync backup create
✓ 备份已创建: backup-2024-01-15T10:30:00Z

# 列出备份
$ claude-config-sync backup list
[1] backup-2024-01-15T10:30:00Z
    日期: 2024-01-15 10:30:00
    文件数: 42
    大小: 2.3 MB

[2] backup-2024-01-14T15:20:00Z
    日期: 2024-01-14 15:20:00
    文件数: 40
    大小: 2.1 MB

# 恢复备份
$ claude-config-sync backup restore 1
⚠️  警告：此操作将覆盖当前配置
? 确认恢复？ Yes
✓ 备份已成功恢复

# 清理旧备份（保留最近 5 个）
$ claude-config-sync backup clean --keep 5
✓ 已清理 3 个旧备份
```

## ⚙️ 配置文件详解

配置文件位置：`~/.claude-config-sync/config.json`

```json
{
  "sync": {
    "repository": "git@github.com:username/claude-config.git",
    "branch": "main",
    "autoSync": false,
    "syncIntervalMinutes": 30,

    "include": {
      "skills": true,
      "plugins": true,
      "settings": true,
      "projects": false,
      "history": false,
      "customPatterns": ["custom/**"]
    },

    "excludePatterns": [
      ".env",
      "*.key",
      "secrets/**",
      "*.secret",
      "*.pem",
      "credentials/**",
      "**/*.log"
    ],

    "conflictStrategy": "ask"
  }
}
```

### 配置项说明

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `repository` | string | Git 仓库 URL（支持 SSH 和 HTTPS） |
| `branch` | string | Git 分支名称 |
| `autoSync` | boolean | 是否启用自动同步（保留功能） |
| `syncIntervalMinutes` | number | 自动同步间隔（分钟） |
| `include.skills` | boolean | 同步技能目录 |
| `include.plugins` | boolean | 同步插件目录 |
| `include.settings` | boolean | 同步设置文件 |
| `include.projects` | boolean | 同步项目配置 |
| `include.history` | boolean | 同步历史记录 |
| `include.customPatterns` | array | 自定义同步模式（glob 模式） |
| `excludePatterns` | array | 排除模式（不同步的文件） |
| `conflictStrategy` | string | 冲突解决策略 |

## 🔐 安全性

### 默认排除的敏感文件

`claude-config-sync` 自动排除以下类型的敏感文件：

- `.env` - 环境变量文件
- `*.key` - 私钥文件
- `secrets/` - 密钥目录
- `*.secret` - 密钥文件
- `*.pem` - PEM 格式证书
- `credentials/` - 凭据目录

### 添加自定义排除规则

```bash
# 排除特定文件类型
claude-config-sync config exclude "*.pem"
claude-config-sync config exclude "*.cert"

# 排除特定目录
claude-config-sync config exclude "credentials/**"
claude-config-sync config exclude "temp/**"

# 排除特定文件
claude-config-sync config exclude "config.local.json"
```

### 建议

- ✅ **使用私有 Git 仓库**存储配置
- ✅ **定期检查** `excludePatterns` 确保敏感文件被排除
- ✅ **使用 SSH 密钥**而非个人访问令牌
- ❌ **切勿**将包含 API 密钥或密码的文件提交到仓库

## ⚔️ 冲突解决策略

当同一文件在本地和远程都被修改时，会产生冲突。`claude-config-sync` 提供四种解决策略：

### 1. ask（询问）- 交互式

默认策略。每次冲突时都会询问您如何处理：

```bash
⚠️  冲突：settings.json
? 如何解决此冲突？
  1) 保留本地版本
  2) 使用远程版本
  3) 保留较新版本
  4) 手动合并
> 1
✓ 已选择本地版本
```

### 2. local（本地）- 始终保留本地

自动使用本地文件，无需交互。

**适用场景：** 您只在主机器上修改配置，其他机器只读取。

```bash
claude-config-sync config set sync.conflictStrategy local
```

### 3. remote（远程）- 始终使用远程

自动使用远程文件，本地更改会被覆盖。

**适用场景：** 远程配置为准，其他机器跟随。

```bash
claude-config-sync config set sync.conflictStrategy remote
```

### 4. newest（最新）- 使用最新修改时间

比较文件的修改时间，使用最新修改的版本。

**适用场景：** 在任何机器上工作，自动选择最新版本。

```bash
claude-config-sync config set sync.conflictStrategy newest
```

## 📁 目录结构

```
~/.claude/                      # Claude Code 配置目录
├── skills/                     # 已安装的技能
│   ├── skill1/
│   └── skill2/
├── plugins/                    # 插件配置
│   └── plugin1.json
├── settings.json               # Claude Code 设置
├── projects/                   # 项目配置
└── history/                    # 命令历史

~/.claude-config-sync/          # 同步工具数据目录
├── config.json                 # 同步配置
├── repo/                       # Git 仓库克隆
│   ├── .git/
│   ├── skills/
│   ├── plugins/
│   └── settings.json
└── backups/                    # 配置备份
    ├── backup-2024-01-15T10:30:00Z/
    │   ├── skills/
    │   ├── plugins/
    │   └── settings.json
    └── backup-2024-01-14T15:20:00Z/
```

## 💡 实用场景与工作流

### 场景一：首次设置多台机器同步

```bash
# 机器 A（主机器）
claude-config-sync init --repo git@github.com:user/claude-config.git
claude-config-sync push

# 机器 B
claude-config-sync init --repo git@github.com:user/claude-config.git
claude-config-sync pull

# 机器 C
claude-config-sync init --repo git@github.com:user/claude-config.git
claude-config-sync pull
```

### 场景二：日常工作流

```bash
# 每天开始工作前，先检查技能健康
claude-config-sync doctor

# 预览即将同步的变更
claude-config-sync diff

# 拉取远程更新
claude-config-sync pull

# 安装新技能或修改配置后
claude-config-sync push

# 查看同步状态
claude-config-sync status
```

### 场景二（增强）：健康检查与变更预览

```bash
# 1. 运行健康检查
$ claude-config-sync doctor

═══ 技能健康检查报告 ═══

总技能数: 40
✓ 健康: 38
⚠ 警告: 2

警告:
  ⚠ outdated-skill
    • 最后更新于 180 天前
    • 建议: 检查是否有更新版本

# 2. 获取详细信息
$ claude-config-sync doctor --verbose

健康技能:
  ✓ ai-product-strategy (更新: 2024-01-15, 大小: 15.2 KB)
  ✓ technical-blog-writing (更新: 2024-01-10, 大小: 8.5 KB)
  ...

# 3. 导出 JSON 格式用于自动化处理
$ claude-config-sync doctor --json > health-report.json

# 4. 预览变更后再同步
$ claude-config-sync diff

═══ 同步变更预览 ═══

📤 将要推送 (2 个文件):
  + skills/new-skill/              [技能] (~12KB)
  M settings.json                  [设置]

📥 将要拉取 (1 个文件):
  M plugins/updated-plugin.json    [插件]

# 5. 查看详细变更
$ claude-config-sync diff --detailed

  + skills/new-skill/SKILL.md

    差异:
    +++ skills/new-skill/SKILL.md
    @@ -0,0 +1,10 @@
    +---
    +name: new-skill
    +description: 一个新技能
    +---
    +
```

### 场景三：在多台机器上同时工作

```bash
# 启动自动监听模式
claude-config-sync watch start --delay 10000

# 任何更改都会在 10 秒后自动同步
# 完成工作后停止监听
claude-config-sync watch stop
```

### 场景四：配置出错需要回滚

```bash
# 查看可用备份
claude-config-sync backup list

# 恢复到最近的备份
claude-config-sync backup restore 1

# 推送恢复后的配置
claude-config-sync push
```

### 场景五：从零开始（已有配置）

```bash
# 1. 创建私有 Git 仓库
# 在 GitHub/GitLab 上创建一个新的空仓库

# 2. 初始化同步
claude-config-sync init
# 按提示输入仓库 URL

# 3. 推送现有配置
claude-config-sync push

# 4. 在其他机器上拉取
claude-config-sync pull
```

## 🔧 故障排除

### 问题 1：未初始化错误

**错误信息：** `Not initialized. Please run 'init' first.`

**解决方案：**
```bash
claude-config-sync init
```

### 问题 2：Git 认证失败

**错误信息：** `fatal: Authentication failed`

**解决方案（选择其一）：**

**方案 A：使用 SSH 密钥**
```bash
# 生成 SSH 密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 添加到 SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 复制公钥到 GitHub/GitLab
cat ~/.ssh/id_ed25519.pub

# 更新仓库 URL
claude-config-sync config set sync.repository git@github.com:user/repo.git
```

**方案 B：使用个人访问令牌**
```bash
# 在 GitHub 设置中生成个人访问令牌
# 然后使用带凭据的 HTTPS URL
claude-config-sync config set sync.repository https://TOKEN@github.com/user/repo.git
```

### 问题 3：合并冲突

**错误信息：** `Merge conflict detected`

**解决方案：**

```bash
# 方案 1：使用交互式解决（推荐）
claude-config-sync config set sync.conflictStrategy ask
claude-config-sync pull

# 方案 2：强制使用本地版本
claude-config-sync pull --force

# 方案 3：从备份恢复
claude-config-sync backup restore <backup-id>
```

### 问题 4：文件监听不工作

**可能原因：** 文件监听达到系统限制

**解决方案（Linux/macOS）：**
```bash
# 增加文件监听限制
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 问题 5：某些文件未被同步

**检查步骤：**

```bash
# 1. 查看当前排除规则
claude-config-sync config list

# 2. 检查文件是否匹配排除模式
# 例如：*.md 文件默认被排除

# 3. 如果需要同步，移除排除规则
claude-config-sync config include "*.md"

# 4. 重新推送
claude-config-sync push
```

### 问题 6：权限错误

**错误信息：** `Permission denied (publickey)`

**解决方案：**

```bash
# 检查 SSH 配置
ssh -T git@github.com

# 如果失败，重新配置 SSH
# 参考问题 2 的解决方案
```

### 问题 7：技能同步后无法正常工作

**解决方案：**

使用 doctor 命令检查技能健康：

```bash
$ claude-config-sync doctor
✗ 错误: 2
  ✗ broken-skill
    • 缺少 SKILL.md 文件

# 通过备份恢复或重新安装技能
$ claude-config-sync backup restore <备份-id>
```

### 问题 8：同步后发现意外的变更

**解决方案：**

同步前始终预览变更：

```bash
# 查看将要变更的内容
$ claude-config-sync diff

# 查看详细变更
$ claude-config-sync diff --detailed

# 仅推送或仅拉取特定变更
$ claude-config-sync push  # 或 pull
```

## 🛠️ 开发指南

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/user/claude-config-sync.git
cd claude-config-sync

# 安装依赖
npm install

# 开发模式（自动重新编译）
npm run dev

# 运行测试
npm test

# 生成覆盖率报告
npm run test:coverage

# 全局链接（测试 CLI）
npm link
claude-config-sync --version
```

### 项目结构

```
src/
├── commands/           # CLI 命令实现
│   ├── init.ts        # 初始化命令
│   ├── push.ts        # 推送命令
│   ├── pull.ts        # 拉取命令
│   ├── sync.ts        # 同步命令
│   ├── status.ts      # 状态命令
│   ├── config.ts      # 配置命令
│   ├── watch.ts       # 监听命令
│   └── backup.ts      # 备份命令
├── core/              # 核心业务逻辑
│   ├── git-manager.ts      # Git 操作
│   ├── file-scanner.ts     # 文件扫描
│   ├── sync-engine.ts      # 同步引擎
│   ├── conflict-resolver.ts # 冲突解决
│   └── merger.ts           # 文件合并
├── types/             # TypeScript 类型定义
│   └── index.ts
├── utils/             # 工具函数
│   ├── config.ts      # 配置管理
│   ├── logger.ts      # 日志工具
│   └── spinner.ts     # 加载动画
└── index.ts           # CLI 入口
```

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范

- 使用 TypeScript 编写
- 遵循 ESLint 规则
- 添加单元测试
- 更新文档

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

本项目依赖于以下优秀的开源库：

- [simple-git](https://github.com/stevelukin/simple-git) - Git 操作封装
- [chokidar](https://github.com/paulmillr/chokidar) - 文件监听
- [commander.js](https://github.com/tj/commander.js) - CLI 框架
- [inquirer](https://github.com/SBoudrias/Inquirer.js) - 交互式命令行
- [chalk](https://github.com/chalk/chalk) - 终端样式
- [ora](https://github.com/sindresorhus/ora) - 加载动画
- [glob](https://github.com/isaacs/node-glob) - 文件匹配

## 📮 支持与反馈

- 🐛 **报告问题：** https://github.com/user/claude-config-sync/issues
- 💡 **功能建议：** https://github.com/user/claude-config-sync/discussions
- 📧 **邮件联系：** user@example.com

## 📈 更新日志

### v0.1.0 (2024-01-15)

- ✨ 初始版本发布
- ✅ 支持基本的 Git 同步功能
- ✅ 支持选择性同步（skills, plugins, settings）
- ✅ 冲突解决策略
- ✅ 自动备份功能
- ✅ 文件监听模式
- ✅ 完整的 CLI 命令集

---

<div align="center">

**用 ❤️ 为 Claude Code 社区构建**

[⬆ 返回顶部](#claude-config-sync)

</div>
