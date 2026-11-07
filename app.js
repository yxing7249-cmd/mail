const API = "https://www.1secmail.com/api/v1/";
const $ = (id) => document.getElementById(id);
let currentEmail = "";
let messages = [];
let poller = null;

function setStatus(text) { $("statusMessage").textContent = text; }
function splitEmail(address) {
  const parts = address.split("@");
  if (parts.length !== 2) throw new Error("邮箱地址格式不正确");
  return { login: parts[0], domain: parts[1] };
}
async function api(params) {
  const url = API + "?" + new URLSearchParams(params).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error("邮件服务暂时无法响应，请稍后重试");
  return response.json();
}
async function generateEmail() {
  $("generateBtn").disabled = true;
  setStatus("正在生成邮箱地址…");
  try {
    const result = await api({ action: "genRandomMailbox", count: "1" });
    if (!Array.isArray(result) || !result[0]) throw new Error("服务没有返回邮箱地址");
    currentEmail = result[0];
    $("emailAddress").textContent = currentEmail;
    $("copyBtn").disabled = false;
    $("refreshBtn").disabled = false;
    $("deleteBtn").disabled = false;
    messages = [];
    renderMessages();
    setStatus("邮箱已生成。请将地址提供给发件人，然后刷新收件箱。");
    await refreshInbox();
    if (poller) clearInterval(poller);
    poller = setInterval(refreshInbox, 30000);
  } catch (error) {
    setStatus(error.message + "。也可能是第三方服务限制了访问。");
  } finally {
    $("generateBtn").disabled = false;
  }
}
async function createCustomEmail() {
  const prefix = $("customPrefix").value.trim().toLowerCase();
  const domain = $("domainSelect").value;
  if (!prefix) {
    setStatus("请先输入邮箱前缀，例如 myidea。");
    $("customPrefix").focus();
    return;
  }
  if (!/^[a-z0-9._-]{1,32}$/.test(prefix) || prefix.startsWith(".") || prefix.endsWith(".") || prefix.includes("..")) {
    setStatus("前缀格式不正确：请使用 1–32 位英文字母、数字、点、下划线或短横线。");
    $("customPrefix").focus();
    return;
  }
  const candidate = `${prefix}@${domain}`;
  $("customBtn").disabled = true;
  setStatus("正在检查自定义邮箱…");
  try {
    // 通过查询收件箱验证 API 是否接受该登录名；该服务不保证地址独占。
    const result = await api({ action: "getMessages", login: prefix, domain });
    if (!Array.isArray(result)) throw new Error("邮件服务没有返回有效结果");
    currentEmail = candidate;
    $("emailAddress").textContent = currentEmail;
    $("copyBtn").disabled = false;
    $("refreshBtn").disabled = false;
    $("deleteBtn").disabled = false;
    messages = result;
    renderMessages();
    $("lastUpdated").textContent = "更新于 " + new Date().toLocaleTimeString();
    setStatus(`已切换到 ${candidate}。请注意：此地址可能已被他人使用，不保证独占。`);
    if (poller) clearInterval(poller);
    poller = setInterval(refreshInbox, 30000);
  } catch (error) {
    setStatus("无法确认该自定义地址：" + error.message + "。请尝试其他前缀或随机生成。");
  } finally {
    $("customBtn").disabled = false;
  }
}
function deleteCurrentMailbox() {
  if (!currentEmail) return;
  const confirmed = window.confirm(
    `确定要从本页面删除邮箱 ${currentEmail} 吗？\n\n这会清除当前页面中的地址和收件箱显示，并停止自动刷新；不会保证删除第三方服务器上的邮件。`
  );
  if (!confirmed) return;

  if (poller) {
    clearInterval(poller);
    poller = null;
  }
  currentEmail = "";
  messages = [];
  $("emailAddress").textContent = "点击下方按钮生成邮箱";
  $("customPrefix").value = "";
  $("copyBtn").disabled = true;
  $("refreshBtn").disabled = true;
  $("deleteBtn").disabled = true;
  $("lastUpdated").textContent = "尚未检查";
  $("copyBtn").textContent = "复制";
  renderMessages();
  setStatus("当前页面中的邮箱已清除。你可以重新生成一个邮箱地址。");
}
async function refreshInbox() {
  if (!currentEmail) return;
  $("refreshBtn").disabled = true;
  try {
    const { login, domain } = splitEmail(currentEmail);
    const result = await api({ action: "getMessages", login, domain });
    messages = Array.isArray(result) ? result : [];
    renderMessages();
    $("lastUpdated").textContent = "更新于 " + new Date().toLocaleTimeString();
    setStatus(messages.length ? `已收到 ${messages.length} 封邮件。` : "收件箱已检查，暂时没有新邮件。");
  } catch (error) {
    setStatus(error.message + "。你可以稍后手动刷新。");
  } finally {
    $("refreshBtn").disabled = false;
  }
}
function renderMessages() {
  $("mailCount").textContent = messages.length;
  const list = $("messageList");
  if (!messages.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">⌁</div><strong>暂时没有邮件</strong><p>新邮件通常会在发件方发送后出现。</p></div>';
    $("messageView").innerHTML = '<div class="empty-reading"><div>✉</div><strong>选择一封邮件</strong><p>邮件内容会显示在这里。</p></div>';
    return;
  }
  list.innerHTML = "";
  messages.forEach((mail) => {
    const button = document.createElement("button");
    button.className = "message-item";
    const sender = document.createElement("small");
    sender.className = "sender";
    sender.textContent = mail.from || mail.from_email || "未知发件人";
    const subject = document.createElement("strong");
    subject.textContent = mail.subject || "（无主题）";
    const date = document.createElement("small");
    date.textContent = mail.date || mail.receivedAt || "";
    button.append(sender, subject, date);
    button.addEventListener("click", () => openMessage(mail.id, button));
    list.appendChild(button);
  });
}
async function openMessage(id, button) {
  document.querySelectorAll(".message-item").forEach(el => el.classList.remove("selected"));
  button.classList.add("selected");
  const view = $("messageView");
  view.innerHTML = '<div class="empty-reading"><strong>正在读取邮件…</strong></div>';
  try {
    const { login, domain } = splitEmail(currentEmail);
    const mail = await api({ action: "readMessage", login, domain, id: String(id) });
    view.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "message-content";
    const label = document.createElement("div");
    label.className = "small-label";
    label.textContent = "MESSAGE DETAIL";
    const title = document.createElement("h3");
    title.textContent = mail.subject || "（无主题）";
    const meta = document.createElement("div");
    meta.className = "message-meta";
    meta.textContent = `发件人：${mail.from || ""} ${mail.from_email || ""}\n收件时间：${mail.date || mail.receivedAt || ""}`;
    const body = document.createElement("div");
    body.className = "message-body";
    // 仅以纯文本显示邮件正文，避免直接执行邮件中的 HTML。
    body.textContent = mail.textBody || mail.body || mail.text || mail.content || "该邮件没有可显示的纯文本正文。";
    wrap.append(label, title, meta, body);
    view.appendChild(wrap);
  } catch (error) {
    view.textContent = "读取失败：" + error.message;
  }
}
$("generateBtn").addEventListener("click", generateEmail);
$("customBtn").addEventListener("click", createCustomEmail);
$("deleteBtn").addEventListener("click", deleteCurrentMailbox);
$("customPrefix").addEventListener("keydown", (event) => {
  if (event.key === "Enter") createCustomEmail();
});
$("refreshBtn").addEventListener("click", refreshInbox);
$("copyBtn").addEventListener("click", async () => {
  if (!currentEmail) return;
  try {
    await navigator.clipboard.writeText(currentEmail);
    $("copyBtn").textContent = "已复制";
    setTimeout(() => $("copyBtn").textContent = "复制", 1500);
  } catch {
    setStatus("复制失败，请手动选择邮箱地址复制。");
  }
});
window.addEventListener("beforeunload", () => { if (poller) clearInterval(poller); });
