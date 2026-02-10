# claude-sync

> 在多个终端环境之间同步 Claude Code 配置

## 问题

当您在多台机器或多个终端上使用 Claude Code 时，保持配置同步是一个手动过程。您需要在每台机器上重新安装技能并复制设置，这既耗时又容易出错。

## 解决方案

`claude-sync` 使用 Git 对您的 Claude Code 配置进行版本控制并在所有环境之间同步。将配置推送到私有仓库，在任何机器上拉取配置，无需重复设置。

## 功能特性

- **基于 Git 的同步** - 使用您现有的 Git 工作流
- **选择性同步** - 选择要同步的内容（技能、插件、设置等）
- **冲突解决** - 交互式或自动冲突处理
- **自动同步** - 监听模式实现自动同步
- **备份管理** - 在任何破坏性操作前自动备份
- **安全可靠** - 默认排除敏感文件

## 安装

```bash
npm install -g claude-sync
```

或从源码构建：

```bash
git clone https://github.com/user/claude-sync
cd claude-sync
npm install
npm run build
npm link
```

## 快速开始

```bash
# 初始化同步
claude-sync init

# 推送您的配置
claude-sync push

# 在另一台机器上，拉取配置
claude-sync pull

# 查看状态
claude-sync status
```

## 配置

配置存储在 `~/.claude-sync/config.json`：

```json
{
  "sync": {
    "repository": "git@github.com:user/claude-config.git",
    "branch": "main",
    "autoSync": false,
    "syncIntervalMinutes": 30,
    "include": {
      "skills": true,
      "plugins": true,
      "settings": true,
      "projects": false,
      "history": false,
      "customPatterns": []
    },
    "excludePatterns": [".env", "*.key", "secrets/", "*.secret"],
    "conflictStrategy": "ask"
  }
}
```

## 命令

### 初始化

```bash
claude-sync init [--repo <url>] [--branch <name>]
```

初始化同步配置。如果未提供仓库 URL，将引导您完成交互式设置。

### 推送

```bash
claude-sync push [--dry-run] [--force]
```

将本地配置更改推送到远程仓库。

### 拉取

```bash
claude-sync pull [--dry-run] [--force]
```

从远程仓库拉取配置更改。

### 同步

```bash
claude-sync sync [--dry-run]
```

执行双向同步（先拉取后推送）。

### 状态

```bash
claude-sync status [--verbose]
```

显示当前同步状态，包括：
- 仓库信息
- 未提交的更改
- 冲突
- 最近的提交
- 可用的备份

### 配置

```bash
claude-sync config list                    # 列出所有配置
claude-sync config get <path>              # 获取特定值
claude-sync config set <path> <value>      # 设置值
claude-sync config exclude <pattern>       # 添加排除模式
claude-sync config include <pattern>       # 移除排除模式
claude-sync config edit                    # 交互式配置编辑器
```

### 监听

```bash
claude-sync watch start [--delay <ms>]     # 开始监听文件更改
claude-sync watch stop                     # 停止监听
claude-sync watch status                   # 显示监听状态
```

监听文件更改并自动同步。使用 chokidar 进行高效文件监听和防抖处理。

### 备份

```bash
claude-sync backup create                  # 创建备份
claude-sync backup list [--verbose]        # 列出备份
claude-sync backup restore <backup>        # 从备份恢复
claude-sync backup delete <backup>         # 删除备份
claude-sync backup clean [--keep <n>]      # 清理旧备份
```

## 同步内容

默认情况下，`claude-sync` 同步：

- **skills/** - 已安装的技能
- **plugins/** - 插件配置
- **settings.json** - Claude Code 设置

您也可以选择同步：
- **projects/** - 项目配置
- **history/** - 命令历史
- **自定义模式** - 任何匹配自定义 glob 模式的文件

## 安全性

`claude-sync` 默认排除敏感文件：

- `.env` 文件
- `*.key` 文件
- `secrets/` 目录
- `*.secret` 文件

您可以添加更多排除规则：

```bash
claude-sync config exclude "*.pem"
claude-sync config exclude "credentials/**"
```

## 冲突解决

当出现冲突时（同一文件在本地和远程都被修改），您可以选择：

- **ask** - 每个冲突交互式询问（默认）
- **local** - 始终保留本地版本
- **remote** - 始终使用远程版本
- **newest** - 使用修改时间最新的文件

通过以下命令配置：

```bash
claude-sync config set sync.conflictStrategy newest
```

## 目录结构

```
~/.claude/           # Claude Code 配置
├── skills/
├── plugins/
├── settings.json
└── ...

~/.claude-sync/      # claude-sync 数据
├── config.json      # 同步配置
├── repo/            # Git 仓库克隆
└── backups/         # 配置备份
    ├── backup-2024-01-01T12:00:00.000Z/
    └── ...
```

## 使用示例

### 初始设置

```bash
$ claude-sync init
? Git 仓库 URL: git@github.com:user/claude-config.git
? 分支名称: main
? 您想要同步什么内容？
  ✓ skills
  ✓ plugins
  ✓ settings
  ○ projects
? 冲突解决策略: 询问（交互式）
✓ 配置已保存
✓ 仓库已初始化
? 现在推送当前配置吗？是
✓ 已推送 15 个文件
```

### 日常工作流

```bash
# 开始工作前，拉取最新更改
$ claude-sync pull
✓ 已拉取 3 个文件

# 安装新技能后，推送更改
$ claude-sync push
✓ 已推送 2 个文件

# 查看状态
$ claude-sync status
仓库: git@github.com:user/claude-config.git
分支: main
状态: 与远程同步
同步项目:
  • Skills
  • Plugins
  • Settings
```

### 自动同步模式

```bash
# 开始监听文件更改
$ claude-sync watch start
正在启动文件监听器...
监听路径: /home/user/.claude
防抖延迟: 5000ms
✓ 监听器已就绪 - 等待更改...

# 任何对技能/设置的更改都将在 5 秒后自动同步
# 按 Ctrl+C 停止
```

## 故障排除

### "Not initialized" 错误

运行 `claude-sync init` 设置同步。

### Git 认证错误

确保您的 SSH 密钥已设置或使用带凭据的 HTTPS URL：

```bash
claude-sync config set sync.repository https://user:token@github.com/user/repo.git
```

### 合并冲突

如果出现冲突，将根据您的 `conflictStrategy` 设置进行处理。使用 `ask` 模式进行交互式解决。

### 从备份恢复

```bash
$ claude-sync backup list
[1] backup-2024-01-15T10:30:00.000Z
  • 日期: 2024-01-15 10:30:00
  • 文件: 42

$ claude-sync backup restore 1
✓ 备份已成功恢复
```

## 开发

```bash
# 克隆仓库
git clone https://github.com/user/claude-sync
cd claude-sync

# 安装依赖
npm install

# 构建
npm run build

# 运行测试
npm test

# 本地测试链接
npm link
```

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

MIT License - 详见 LICENSE 文件。

## 致谢

- 使用 [simple-git](https://github.com/stevelukin/simple-git) 构建
- 文件监听由 [chokidar](https://github.com/paulmillr/chokidar) 提供
- CLI 框架来自 [commander.js](https://github.com/tj/commander.js)

## 支持

- 问题反馈: https://github.com/user/claude-sync/issues
- 讨论: https://github.com/user/claude-sync/discussions

---

用 ❤️ 为 Claude Code 社区构建
