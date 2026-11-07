# TEMP MAIL — 临时邮箱网站（V4 修复版）

黑色科技风临时邮箱前端，支持随机地址、自定义前缀、查看收件箱和手动清除当前页面邮箱状态。

## 本版本修复了什么

旧版本让浏览器直接请求 `1secmail.com`，部分浏览器/部署环境会出现 `Failed to fetch`（常见原因包括跨域限制、网络拦截或第三方服务不可用）。

V4 增加 Cloudflare Pages Function：
- 浏览器改为请求同域 `/api/mail`。
- `functions/api/mail.js` 在 Cloudflare 端请求 1secmail，避免浏览器直接跨域调用。
- 仅放行 `genRandomMailbox`、`getMessages`、`readMessage` 三种操作。
- 如果第三方服务本身不可用，仍会显示连接失败；代理不能保证第三方服务永远在线。

## 文件结构

```text
temp-mail-project/
├── index.html
├── style.css
├── app.js
├── README.md
└── functions/
    └── api/
        └── mail.js
```

## 部署到 Cloudflare Pages

1. 解压 ZIP。
2. 把 `index.html`、`style.css`、`app.js`、`README.md` 和整个 `functions` 文件夹上传到 GitHub 仓库根目录。
3. 不要只上传三个网页文件；`functions/api/mail.js` 必须一起上传。
4. Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git。
5. 选择 GitHub 仓库。
6. Framework preset 选 `None`。
7. Build command 留空。
8. Build output directory 填 `.`（如果控制台明确要求其他值，按控制台提示；不要把 `functions` 单独当成静态输出目录）。
9. 点击 Save and Deploy。
10. 部署成功后打开 Cloudflare 提供的 `https://你的项目名.pages.dev`。

## 部署后测试

打开：
`https://你的项目名.pages.dev/api/mail?action=genRandomMailbox`

如果代理正常，会返回类似 JSON：

```json
["randomname@1secmail.com"]
```

回到网站，点击“随机生成邮箱”。

- 返回 502：Function 已运行，但连不上游邮件服务；稍后重试或更换邮件服务商。
- 返回 404：通常是 `functions` 文件夹没有放在仓库根目录，或 Pages 没有识别 Functions；检查文件路径并重新部署。

## 本地运行说明

仅用 `python -m http.server 8000` 打开静态页面，不会运行 Cloudflare Pages Functions，因此 `/api/mail` 本地请求会失败。请部署到 Cloudflare Pages 后测试，或用 Wrangler 本地开发环境运行 Pages Functions。

## 邮件服务与隐私限制

本项目不是自建邮件服务器。邮箱和邮件由 1secmail 第三方服务处理：
- 不保证地址独占、长期可用或邮件一定送达。
- 自定义前缀可能已被别人使用。
- “删除邮箱”只清除当前网页显示和轮询，不保证删除第三方服务器上的邮箱或邮件。
- 不要接收银行、支付、医疗、政府、账号找回等敏感邮件。
- 不要用临时邮箱注册需要长期找回的重要账号。


## V5 新增：账户注册 / 登录

本版本增加邮箱+密码注册、登录、退出登录和登录状态恢复。密码使用 PBKDF2-SHA-256（210,000 次迭代）加盐哈希；会话使用随机令牌，数据库只保存令牌哈希，并通过 Secure、HttpOnly、SameSite=Lax Cookie 发送给浏览器。

### 必须先配置 Cloudflare D1（否则注册/登录会提示数据库未配置）

1. Cloudflare Dashboard → Storage & databases → D1 SQL Database → Create database。
2. 数据库名称例如 `temp-mail-db`。
3. 打开该 D1 数据库 → Console，粘贴 `schema.sql` 全部 SQL 并执行。
4. 打开 Workers & Pages → 你的 Pages 项目 → Settings → Functions。
5. 在 D1 database bindings 添加绑定：
   - Variable name：`DB`
   - D1 database：选择刚创建的 `temp-mail-db`
6. 保存设置，然后触发一次新部署（重新部署最新 Git commit）。
7. 打开网站，点“登录 / 注册”测试。

### GitHub 上传

把 V5 解压后的全部文件上传到仓库根目录，包含：
- `functions/api/auth/` 整个目录
- `functions/_lib/auth.js`
- `schema.sql`
- 原有 `functions/api/mail.js`、网页文件

不要只上传 HTML/CSS/JS。

### 当前账户功能边界

- 账户可注册、登录、退出，并在刷新页面后恢复登录状态。
- 目前登录账户**不会自动保存临时邮箱地址或邮件**；也没有邮箱验证、密码找回、管理员后台或账户删除。
- 邮箱地址和邮件仍由第三方 1secmail 处理；登录并不让临时邮箱变成私密邮箱。
- 对公开服务正式开放前，建议增加注册/登录速率限制、邮箱验证、滥用防护和隐私政策。不要存储敏感邮件。
