# CodexBridge — Codex 多模型接入方案

让 Codex Desktop/CLI 在模型选择器中自由切换 GPT、DeepSeek 等模型。

## 架构

```
Codex App/CLI
    ↓ experimental_bearer_token
CodexBridge (127.0.0.1:15722)
    ├── GPT-5.5 / GPT-5.4-mini → codex-lb (ChatGPT Plus 账号池)
    └── DeepSeek V4 Pro/Flash   → DeepSeek API (Chat Completions 转换)
```

## 快速开始

### 1. 克隆并安装

```bash
git clone https://github.com/xujie8867/codex-bridge.git
cd codex-bridge
npm install
```

### 2. 配置 API Key

```bash
export DEEPSEEK_API_KEY="你的DeepSeek_API_Key"
```

如需持久化，写入 `~/.zshrc`：
```bash
echo 'export DEEPSEEK_API_KEY="你的Key"' >> ~/.zshrc
source ~/.zshrc
```

### 3. 创建路由配置

复制示例配置并编辑：

```bash
cp config/router.config.example.json config/router.config.json
```

编辑 `config/router.config.json`，填入你的后端地址和 API Key。完整示例：

```json
{
    "host": "127.0.0.1",
    "port": 15722,
    "authToken": "sk-local-codex-router",
    "clientAuth": { "allowOpenAiBearer": true },
    "defaultModel": "gpt-5.5",
    "models": [
        {
            "id": "gpt-5.5",
            "displayName": "GPT-5.5",
            "api": "responses",
            "baseUrl": "http://127.0.0.1:8788/v1",
            "model": "gpt-5.5",
            "authMode": "codex_openai",
            "contextWindow": 272000,
            "priority": 0
        },
        {
            "id": "gpt-5.4-mini",
            "displayName": "GPT-5.4-Mini",
            "api": "responses",
            "baseUrl": "http://127.0.0.1:8788/v1",
            "model": "gpt-5.4-mini",
            "authMode": "codex_openai",
            "contextWindow": 272000,
            "priority": 1
        },
        {
            "id": "deepseek-v4-pro",
            "displayName": "DeepSeek V4 Pro",
            "api": "chat_completions",
            "baseUrl": "https://api.deepseek.com/v1",
            "model": "deepseek-v4-pro",
            "authMode": "api_key",
            "apiKeyEnv": "DEEPSEEK_API_KEY",
            "contextWindow": 1000000,
            "priority": 2
        },
        {
            "id": "deepseek-v4-flash",
            "displayName": "DeepSeek V4 Flash",
            "api": "chat_completions",
            "baseUrl": "https://api.deepseek.com/v1",
            "model": "deepseek-v4-flash",
            "authMode": "api_key",
            "apiKeyEnv": "DEEPSEEK_API_KEY",
            "contextWindow": 1000000,
            "priority": 3
        }
    ]
}
```

> **GPT 走 codex-lb**：如果你用 ChatGPT Plus 账号池（codex-lb），`baseUrl` 指向 `http://127.0.0.1:8788/v1`。
> 如果用 OpenAI API Key，`baseUrl` 改为 `https://api.openai.com/v1`，`authMode` 改为 `"api_key"`，加 `"apiKeyEnv": "OPENAI_API_KEY"`。

### 4. 生成模型目录

```bash
npm run catalog
```

### 5. 设置开机自启 (macOS)

创建 launchd 服务文件 `~/Library/LaunchAgents/com.codex.bridge.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.codex.bridge</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/node</string>
        <string>/Users/你的用户名/codex-bridge/src/server.js</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>WorkingDirectory</key>
    <string>/Users/你的用户名/codex-bridge</string>
    <key>StandardOutPath</key>
    <string>/Users/你的用户名/.codex/log/codex-bridge.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/你的用户名/.codex/log/codex-bridge.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>DEEPSEEK_API_KEY</key>
        <string>你的DeepSeek_API_Key</string>
    </dict>
</dict>
</plist>
```

加载服务：
```bash
launchctl load ~/Library/LaunchAgents/com.codex.bridge.plist
```

### 6. 配置 Codex

编辑 `~/.codex/config.toml`（注意是用户级，不是项目级）：

```toml
model = "gpt-5.5"
model_provider = "codex-bridge"
model_catalog_json = "/Users/你的用户名/codex-bridge/model-catalog.json"

[model_providers.codex-bridge]
name = "CodexBridge"
base_url = "http://127.0.0.1:15722/v1"
wire_api = "responses"
requires_openai_auth = true
experimental_bearer_token = "sk-local-codex-router"
```

### 7. 重启 Codex App

完全退出 Codex App，重新打开。模型选择器右下角应显示所有配置的模型，可自由切换。

## 验证

```bash
# 检查桥接健康
curl http://127.0.0.1:15722/health

# 检查模型列表
curl http://127.0.0.1:15722/model-catalog.json

# CLI 测试
codex exec "hi" --dangerously-bypass-approvals-and-sandbox                    # GPT
codex exec "hi" -m deepseek-v4-flash --dangerously-bypass-approvals-and-sandbox  # DeepSeek
```

## 配置字段说明

### router.config.json

| 字段 | 说明 |
|------|------|
| `id` | Codex 中的模型 slug |
| `displayName` | 模型选择器中显示的名称 |
| `api` | `"responses"`（直接转发）或 `"chat_completions"`（协议转换）|
| `baseUrl` | 上游 API 地址 |
| `model` | 发送给上游的实际模型名 |
| `authMode` | `"codex_openai"`（透传 OAuth）或 `"api_key"`（使用 API Key）|
| `apiKeyEnv` | authMode 为 api_key 时，从哪个环境变量读取 Key |
| `contextWindow` | 上下文窗口大小 |
| `priority` | 排序优先级（越小越靠前）|

### config.toml

| 字段 | 说明 |
|------|------|
| `model_catalog_json` | 指向 `npm run catalog` 生成的 JSON 绝对路径 |
| `experimental_bearer_token` | 必须与 router.config.json 的 authToken 一致 |
| `requires_openai_auth` | 保持 Codex App 的 OAuth 登录流程 |

## 关键修复（相比上游）

基于 [codex-bridge v0.1.5](https://github.com/wangzhezbz/codex-bridge)，增加两个修复：

### 1. 本地认证兼容 (`src/upstream.js`)

允许 `local` 认证方式（experimental_bearer_token 匹配）访问 `codex_openai` 路由，解决 CLI 下 401 问题。

### 2. 工具名去重 (`src/tools.js`)

DeepSeek 等 Chat Completions API 要求工具名唯一。Codex 可能发送重复工具定义，桥接层自动去重。

## 常见问题

**Q: 模型选择器里没有自定义模型？**
- 确认 `model_catalog_json` 是绝对路径
- 完全退出 Codex App 再重新打开
- 检查 `npm run catalog` 是否成功生成 `model-catalog.json`

**Q: 对话报 401 Unauthorized？**
- 检查 `experimental_bearer_token` 与 `router.config.json` 中 `authToken` 一致
- 确认 `requires_openai_auth = true` 已设置

**Q: DeepSeek 报 "Tool names must be unique"？**
- 确保使用本仓库版本（已包含工具去重修复）

**Q: 如何添加更多模型（Kimi, MiniMax 等）？**
- 在 `router.config.json` 的 `models` 数组中添加条目
- `api` 设为 `"chat_completions"`（走协议转换）
- `authMode` 设为 `"api_key"`
- 重新运行 `npm run catalog` 生成模型目录

## License

MIT
