#!/usr/bin/env node
'use strict';

/**
 * 画像站发布：先自定义分享链接的子域名前缀(appName)，再调用 sites skill 的 publish.js 发布。
 *
 * 链接结构：https://<appName>.app.workbuddy.host
 *   - <appName>           —— 可自定义（本脚本负责）
 *   - app.workbuddy.host  —— 平台固定后缀，不可改
 *
 * appName 会写入 ~/.workbuddy-sandbox-publish/state.json，publish.js 下次发布直接复用，
 * 因此改 appName = 换域名；旧的分享链接会失效。
 *
 * 用法:
 *   node publish-named.js --dir <项目目录> [--name <slug>] [--dry-run]
 *   --name 省略时沿用本地已记录的 appName（即保持现有链接不变）。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const STATE_FILE = path.join(os.homedir(), '.workbuddy-sandbox-publish', 'state.json');

// sites skill 的发布脚本，兼容不同环境的 skills 根目录
const PUBLISHER_CANDIDATES = [
  path.join(os.homedir(), '.codebuddy', 'skills', 'sites', 'scripts', 'publish.js'),
  path.join(os.homedir(), '.workbuddy', 'skills', 'sites', 'scripts', 'publish.js'),
  path.join(os.homedir(), '.agents', 'skills', 'sites', 'scripts', 'publish.js'),
];

// DNS label 安全：小写字母开头；主体 a-z0-9-；不以 - 结尾；总长 1..40
const NAME_RE = /^[a-z](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

function out(o) {
  process.stdout.write(JSON.stringify(o) + '\n');
}

function parseArgs(argv) {
  const o = { dir: process.cwd(), name: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') o.dir = argv[++i];
    else if (a === '--name') o.name = argv[++i];
    else if (a === '--dry-run') o.dryRun = true;
  }
  return o;
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function findPublisher() {
  for (const p of PUBLISHER_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function main() {
  const opts = parseArgs(process.argv);
  const dir = path.resolve(opts.dir);
  if (!fs.existsSync(dir)) throw new Error(`项目目录不存在：${dir}`);

  const state = readState() || {};
  const runtimeId = String(state.runtimeId || process.env.AGENTOS_RUNTIME_ID || '').trim();
  if (!/^[1-9]\d*$/.test(runtimeId)) {
    throw new Error('缺少 runtimeId（state.json 与环境变量均未提供），无法发布。');
  }

  const previous = state.appName || null;
  let name = previous;

  if (opts.name) {
    name = String(opts.name).trim().toLowerCase();
    if (!NAME_RE.test(name)) {
      throw new Error(
        `域名前缀不合法：「${opts.name}」。要求：小写字母开头，仅含 a-z 0-9 与 -，不以 - 结尾，长度 ≤ 40。`,
      );
    }
  }
  if (!name) throw new Error('未提供 --name，且本地没有历史 appName 可沿用。');

  // dry-run 只做预览，不落盘、不发布
  if (opts.dryRun) {
    out({
      dryRun: true,
      appName: name,
      previousAppName: previous,
      changed: previous !== name,
      shareLinkPreview: `https://${name}.app.workbuddy.host`,
    });
    return;
  }

  // 写回 state（保留 lastReleaseId，供 unpublish 使用）——必须在 publish.js 之前落盘
  const next = {
    runtimeId,
    appName: name,
    lastReleaseId: state.lastReleaseId || null,
    createdAt: state.createdAt || Date.now(),
  };
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2), 'utf-8');

  const publisher = findPublisher();
  if (!publisher) throw new Error('未找到 sites 发布脚本（publish.js），无法发布。');

  const r = spawnSync(process.execPath, [publisher, '--dir', dir, '--language', 'static'], {
    encoding: 'utf-8',
  });
  const lines = String(r.stdout || '').trim().split('\n').filter(Boolean);
  let parsed = null;
  try {
    parsed = JSON.parse(lines[lines.length - 1] || 'null');
  } catch {
    /* 保留原始输出，下面统一报错 */
  }

  if (r.status !== 0 || !parsed || !parsed.shareLink) {
    out({
      error: (parsed && parsed.error) || `发布失败（exit ${r.status}）`,
      detail: String(r.stderr || '').slice(-1200),
    });
    process.exit(1);
  }

  out({
    shareLink: parsed.shareLink,
    verified: parsed.verified,
    appName: name,
    previousAppName: previous,
    changed: previous !== name,
  });
}

try {
  main();
} catch (e) {
  out({ error: e && e.message ? e.message : String(e) });
  process.exit(1);
}
