# TEMP MAIL — 临时邮箱网站

一个黑色科技风的临时邮箱前端项目。使用 HTML、CSS、JavaScript，无需安装依赖。

## 本地运行
1. 解压项目。
2. 用浏览器打开 `index.html`。
3. 点击“生成新邮箱”。
4. 将生成的地址用于短期测试，然后点击“刷新收件箱”查看邮件。

如果浏览器限制本地文件请求，请在项目目录启动静态服务器：
- Python：`python -m http.server 8000`
- 浏览器访问：`http://localhost:8000`

## 部署到 Cloudflare Pages
1. 将这三个文件上传到 GitHub 仓库根目录：`index.html`、`style.css`、`app.js`。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git。
3. 选择仓库。
4. Framework preset 选 `None`；Build command 留空；Build output directory 填 `/`（或按控制台提示使用根目录）。
5. 部署完成后使用 Cloudflare 提供的网址访问。

## 邮件服务说明
当前版本通过浏览器调用第三方 1secmail 公共 API，支持随机邮箱和自定义前缀（仅尝试使用所选域名，不保证地址独占或可用）：
`https://www.1secmail.com/api/v1/`

该服务、域名、跨域策略、邮件保留期限及可用性均由第三方控制。这个项目不是自建邮件服务器，也不保证服务长期可用。若 API 不可用，需要更换邮件 API 或自建接收邮件后端。

## 重要安全提醒
- 临时邮箱不是私人邮箱。其他人可能猜到或重复使用相同地址。
- 不要接收银行、支付、医疗、政府、社交账号找回等敏感邮件。
- 不要用临时邮箱注册 GitHub、Cloudflare 等需要长期找回的平台账号。
- 当前项目不提供用户登录、私有收件箱隔离、附件下载或邮件持久化。
- 邮件正文按纯文本显示，不直接渲染邮件 HTML。
- 若要正式公开运营，请加入后端代理、限流、滥用防护、隐私政策、服务条款，并确认邮件服务商允许此类集成。

## 文件结构
- `index.html`：页面结构
- `style.css`：黑色科技风样式
- `app.js`：随机/自定义地址、刷新收件箱、读取邮件


## 手动删除
V3 增加“删除邮箱”按钮。确认后会清除当前页面中的邮箱地址和邮件列表、停止轮询并重置界面。由于当前使用 1secmail 公共 API，不能保证删除第三方服务端的邮箱或邮件数据。
