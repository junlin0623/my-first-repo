// Build the beta packages testers unzip and double-click:
//   dist/一人工作台-测试版-Mac-Apple芯片.zip, -Mac-Intel.zip, -Windows.zip
// Each holds the built app (no personal data), a Node runtime, fonts, a start script and a guide.
// The shared model key comes from .env.beta.local (BETA_API_KEY=...), or from your saved
// connection named in BETA_FROM (default: DeepSeek). It is written only into the packages.
//
//   node scripts/pack-beta.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CACHE = path.join(DIST, '.cache');
const NODE_VERSION = process.versions.node; // ship the same Node the app was built with
const NODE_MIRROR = `https://npmmirror.com/mirrors/node/v${NODE_VERSION}`;
const PORT = 3456;
const TARGETS = [
  { id: 'Mac-Apple芯片', node: `node-v${NODE_VERSION}-darwin-arm64.tar.gz`, mac: true },
  { id: 'Mac-Intel', node: `node-v${NODE_VERSION}-darwin-x64.tar.gz`, mac: true },
  { id: 'Windows', node: `node-v${NODE_VERSION}-win-x64.zip`, mac: false },
];
const FONTS = [
  ['NotoSansSC.ttf', 'https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf'],
  ['SpaceGrotesk.ttf', 'https://github.com/google/fonts/raw/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf'],
  ['JetBrainsMono.ttf', 'https://github.com/google/fonts/raw/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf'],
];

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });
const readEnv = (file) =>
  fs.existsSync(file)
    ? Object.fromEntries(fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
    : {};

// curl rather than fetch: it follows redirects and honours the system proxy settings.
async function download(url, file) {
  if (fs.existsSync(file)) return file;
  console.log(`下载 ${url}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  run('curl', ['-fsSL', '--retry', '3', '-o', `${file}.part`, url]);
  fs.renameSync(`${file}.part`, file);
  return file;
}

// The shared connection testers will use. Never printed.
async function sharedConnection() {
  const beta = readEnv(path.join(ROOT, '.env.beta.local'));
  if (beta.BETA_API_KEY) {
    return { name: beta.BETA_NAME || 'DeepSeek', kind: beta.BETA_KIND || 'openai', baseUrl: beta.BETA_BASE_URL ?? 'https://api.deepseek.com/v1', apiKey: beta.BETA_API_KEY, model: beta.BETA_MODEL || 'deepseek-v4-flash' };
  }
  const { default: Database } = await import('better-sqlite3');
  const db = new Database(path.join(ROOT, 'data', 'workbench.db'), { readonly: true });
  const name = beta.BETA_FROM || 'DeepSeek';
  const c = db.prepare('SELECT * FROM connections WHERE name = ?').get(name);
  if (!c) throw new Error(`没有名为「${name}」的模型连接；在 .env.beta.local 里写 BETA_API_KEY=... 或 BETA_FROM=连接名`);
  const model = beta.BETA_MODEL || db.prepare("SELECT model FROM agents WHERE connection_id = ? AND model != '' LIMIT 1").get(c.id)?.model;
  if (!model) throw new Error('这个连接还没有 agent 在用，不知道用哪个模型；在 .env.beta.local 里写 BETA_MODEL=...');
  const secret = process.env.ENCRYPTION_KEY || readEnv(path.join(ROOT, '.env.local')).ENCRYPTION_KEY || fs.readFileSync(path.join(ROOT, 'data', 'secret.key'), 'utf8').trim();
  const [iv, tag, data] = c.api_key_enc.split('.').map((s) => Buffer.from(s, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(secret).digest(), iv);
  decipher.setAuthTag(tag);
  const apiKey = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  return { name: c.name, kind: c.kind, baseUrl: c.base_url ?? '', apiKey, model };
}

const MAC_START = `#!/bin/bash
# 双击启动一人工作台。关闭这个窗口，软件就停止。
cd "$(dirname "$0")"
xattr -dr com.apple.quarantine . 2>/dev/null
cd app
export HOSTNAME=127.0.0.1 PORT=${PORT} NODE_ENV=production
URL=http://127.0.0.1:${PORT}
if curl -s -o /dev/null "$URL"; then open "$URL"; exit 0; fi
(for i in $(seq 1 30); do sleep 1; curl -s -o /dev/null "$URL" && open "$URL" && break; done) &
echo "一人工作台正在启动，浏览器会自动打开 $URL"
echo "用完关闭这个窗口即可。"
exec ../runtime/node server.js
`;

const WIN_START = `@echo off
chcp 65001 >nul
rem 双击启动一人工作台。关闭这个窗口，软件就停止。
cd /d "%~dp0app"
set HOSTNAME=127.0.0.1
set PORT=${PORT}
set NODE_ENV=production
start "" /min cmd /c "timeout /t 5 >nul & start http://127.0.0.1:${PORT}"
echo 一人工作台正在启动，浏览器会自动打开 http://127.0.0.1:${PORT}
echo 用完关闭这个窗口即可。
"..\\runtime\\node.exe" server.js
pause
`;

const GUIDE = (mac) => `一人工作台 · 测试版 使用说明
================================

【启动】
${mac
    ? `1. 解压后，进入「一人工作台」文件夹。
2. 第一次：右键点「启动一人工作台.command」→ 选「打开」→ 再点「打开」。
   （直接双击会提示"无法验证开发者"，这是因为测试版没有上架签名，右键打开一次就好。）
3. 以后直接双击它就行。`
    : `1. 解压后，进入「一人工作台」文件夹。
2. 双击「启动一人工作台.bat」。
   如果弹出"Windows 已保护你的电脑"，点「更多信息」→「仍要运行」。
3. 如果弹出防火墙提示，选「取消」或只允许专用网络都可以（软件只在本机使用）。`}
4. 浏览器会自动打开 http://127.0.0.1:${PORT} 。没打开的话手动输入这个地址。
5. 用完关闭那个黑色窗口，软件就停止。

【第一次用，按这个顺序】
1. 设置 → 品牌：填你的账号名、一句话定位、语气。所有 agent 都按这个写。
2. 首页「主编」：直接说话，比如「我想写一篇关于 XX 的小红书」，或者贴一个链接。
3. 灵感池 → 「用灵感池出今天的选题单」，在选题单里点开一条，点「做」，写手就开始写。
4. 稿件页：看稿、对写手说「改：……」、满意了点「通过，定稿」。
5. 发布包：复制排版好的公众号正文、下载小红书卡片。

【需要】
- 出卡片图需要电脑上装了 Google Chrome。
- 模型已经配好（用的是测试组织者的 Key），不用自己填。请不要把这个安装包转发给别人。

【你的数据】
- 稿件、设置都只存在你自己电脑上：「一人工作台/app/data」文件夹。
- 想清空重来：先关掉软件，再删掉 data 文件夹（会丢失所有内容）。

【反馈】
用的过程中觉得哪里不顺、哪里看不懂、哪里写得不好，直接私聊告诉我。截图最好。
`;

async function main() {
  const conn = await sharedConnection();

  console.log('\n== 构建 ==');
  run('npx', ['next', 'build']);

  console.log('\n== 组装 app ==');
  const app = path.join(DIST, 'build', 'app');
  fs.rmSync(path.join(DIST, 'build'), { recursive: true, force: true });
  const standalone = path.join(ROOT, '.next', 'standalone');
  // External packages the file tracer copies only partly: put them in whole first.
  // better-sqlite3 carries prebuilt binaries for every platform; playwright-core needs its data files.
  for (const pkg of ['better-sqlite3', 'playwright-core']) {
    fs.rmSync(path.join(standalone, 'node_modules', pkg), { recursive: true, force: true });
    fs.cpSync(path.join(ROOT, 'node_modules', pkg), path.join(standalone, 'node_modules', pkg), { recursive: true });
  }
  // .next/node_modules holds symlinks to those packages; dereference them into real folders so the
  // app doesn't point back at this machine (and works after a Windows unzip, which drops symlinks).
  fs.cpSync(standalone, app, { recursive: true });
  const nm = path.join(app, '.next', 'node_modules');
  for (const name of fs.existsSync(nm) ? fs.readdirSync(nm) : []) {
    const link = path.join(nm, name);
    if (!fs.lstatSync(link).isSymbolicLink()) continue;
    const real = fs.realpathSync(link);
    const inApp = real.startsWith(standalone) ? path.join(app, path.relative(standalone, real)) : real;
    fs.rmSync(link);
    fs.cpSync(inApp, link, { recursive: true });
  }
  fs.cpSync(path.join(ROOT, '.next', 'static'), path.join(app, '.next', 'static'), { recursive: true });
  if (fs.existsSync(path.join(ROOT, 'public'))) fs.cpSync(path.join(ROOT, 'public'), path.join(app, 'public'), { recursive: true });
  // nothing personal goes out: no database, media, brand seed, secrets or env files
  for (const p of ['data', 'dist', 'scripts', '.claude']) fs.rmSync(path.join(app, p), { recursive: true, force: true });
  for (const f of fs.readdirSync(app)) if (f.startsWith('.env')) fs.rmSync(path.join(app, f));
  fs.mkdirSync(path.join(app, 'data'));
  fs.writeFileSync(path.join(app, 'data', 'beta.seed.json'), JSON.stringify(conn));
  fs.mkdirSync(path.join(app, 'fonts'));
  for (const [name, url] of FONTS) fs.copyFileSync(await download(url, path.join(CACHE, 'fonts', name)), path.join(app, 'fonts', name));

  const links = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isSymbolicLink()) links.push(p);
    else if (e.isDirectory()) walk(p);
  });
  walk(app);
  if (links.length) throw new Error(`安装包里还有符号链接：${links.slice(0, 3).join(', ')}`);
  let absolute = '';
  try {
    absolute = execFileSync('grep', ['-rlF', ROOT, path.join(app, '.next', 'server')], { encoding: 'utf8' }).trim();
  } catch {
    // grep exits 1 when nothing matches
  }
  if (absolute) console.log(`注意：这些文件里写着本机路径（通常只是报错信息里的路径）：\n${absolute.split('\n').slice(0, 5).join('\n')}`);

  const leaked = ['workbench.db', 'brand.local.json', 'secret.key', '.env.local'].filter((n) => fs.existsSync(path.join(app, 'data', n)) || fs.existsSync(path.join(app, n)));
  if (leaked.length) throw new Error(`安装包里不该有这些文件：${leaked.join(', ')}`);

  for (const t of TARGETS) {
    console.log(`\n== 打包 ${t.id} ==`);
    const root = path.join(DIST, 'build', t.id, '一人工作台');
    fs.cpSync(app, path.join(root, 'app'), { recursive: true });
    fs.mkdirSync(path.join(root, 'runtime'), { recursive: true });
    const archive = await download(`${NODE_MIRROR}/${t.node}`, path.join(CACHE, t.node));
    const tmp = path.join(CACHE, 'x', t.id);
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    if (t.mac) {
      run('tar', ['-xzf', archive, '-C', tmp]);
      const bin = path.join(tmp, t.node.replace('.tar.gz', ''), 'bin', 'node');
      fs.copyFileSync(bin, path.join(root, 'runtime', 'node'));
      fs.chmodSync(path.join(root, 'runtime', 'node'), 0o755);
      fs.writeFileSync(path.join(root, '启动一人工作台.command'), MAC_START, { mode: 0o755 });
    } else {
      run('unzip', ['-q', archive, `${t.node.replace('.zip', '')}/node.exe`, '-d', tmp]);
      fs.copyFileSync(path.join(tmp, t.node.replace('.zip', ''), 'node.exe'), path.join(root, 'runtime', 'node.exe'));
      fs.writeFileSync(path.join(root, '启动一人工作台.bat'), WIN_START.replace(/\n/g, '\r\n'));
    }
    fs.writeFileSync(path.join(root, '使用说明.txt'), t.mac ? GUIDE(true) : GUIDE(false).replace(/\n/g, '\r\n'));
    const zip = path.join(DIST, `一人工作台-测试版-${t.id}.zip`);
    fs.rmSync(zip, { force: true });
    // ditto keeps the executable bits on macOS
    run('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', root, zip]);
    console.log(`完成：${path.relative(ROOT, zip)}（${(fs.statSync(zip).size / 1e6).toFixed(0)} MB）`);
  }
}

main().catch((e) => {
  console.error(`\n打包失败：${e.message}`);
  process.exit(1);
});
