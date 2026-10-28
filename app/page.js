'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { md5 } from '@noble/hashes/legacy.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { ArrowDownToLine, ArrowLeftRight, ArrowRight, Braces, Check, ChevronRight, Clock3, Code2, Copy, Fingerprint, Hash, KeyRound, LockKeyhole, QrCode, RotateCcw, Search, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';

const tools = [
  { id: 'qr', name: '二维码生成', short: '二维码', description: '将链接、文字快速变成二维码', icon: QrCode, group: '常用工具', tag: 'POPULAR' },
  { id: 'base64', name: 'Base64 编解码', short: 'Base64', description: '文本与 Base64 相互转换', icon: Code2, group: '编码转换' },
  { id: 'url', name: 'URL 编解码', short: 'URL 编码', description: '安全转换 URL 中的特殊字符', icon: ArrowLeftRight, group: '编码转换' },
  { id: 'hash', name: '哈希生成', short: '哈希生成', description: '计算 SHA-256、SHA-512 和 MD5', icon: Hash, group: '加密与安全' },
  { id: 'aes', name: 'AES 文本加密', short: 'AES 加密', description: '用密码加密或解密一段文字', icon: LockKeyhole, group: '加密与安全' },
  { id: 'json', name: 'JSON 格式化', short: 'JSON 格式化', description: '格式化、压缩并校验 JSON', icon: Braces, group: '开发工具' },
  { id: 'time', name: '时间戳转换', short: '时间戳转换', description: '在 Unix 时间戳与日期之间转换', icon: Clock3, group: '开发工具' },
  { id: 'uuid', name: 'UUID 生成', short: 'UUID 生成', description: '生成随机的 UUID v4', icon: Fingerprint, group: '开发工具' },
];

function randomUuid() {
  const bytes = new Uint8Array(16);
  if (!globalThis.crypto?.getRandomValues) throw new Error('当前浏览器不支持安全随机数。');
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
async function encrypt(text, password) {
  if (!globalThis.crypto?.getRandomValues) throw new Error('当前浏览器不支持安全随机数。');
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await pbkdf2Async(sha256, password, salt, { c: 210000, dkLen: 32 });
  const encrypted = gcm(key, nonce).encrypt(new TextEncoder().encode(text));
  const data = btoa(Array.from(encrypted, b => String.fromCharCode(b)).join(''));
  return ['TL2', bytesToHex(salt), bytesToHex(nonce), data].join('.');
}
async function decrypt(value, password) {
  const parts = value.trim().split('.');
  if (parts.length !== 4 || parts[0] !== 'TL2' || !/^[0-9a-f]{32}$/.test(parts[1]) || !/^[0-9a-f]{24}$/.test(parts[2]) || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(parts[3])) throw new Error('密文格式不正确，请粘贴完整的 TL2 密文。');
  const key = await pbkdf2Async(sha256, password, hexToBytes(parts[1]), { c: 210000, dkLen: 32 });
  try {
    const data = Uint8Array.from(atob(parts[3]), c => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(gcm(key, hexToBytes(parts[2])).decrypt(data));
  } catch { throw new Error('密码错误或密文已被修改。'); }
}
function base64Encode(input) { return btoa(Array.from(new TextEncoder().encode(input), n => String.fromCharCode(n)).join('')); }
function base64Decode(input) {
  const clean = input.replace(/\s/g, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(clean)) throw new Error('请输入有效的 Base64 字符串。');
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(clean), c => c.charCodeAt(0)));
}
function dateFromTimestamp(value) {
  const raw = value.trim(); if (!/^-?\d+(?:\.\d+)?$/.test(raw)) throw new Error('请输入有效的 Unix 时间戳。');
  const n = Number(raw); const date = new Date(Math.abs(n) < 1e11 ? n * 1000 : n);
  if (Number.isNaN(date.getTime())) throw new Error('时间戳超出支持范围。');
  return `本地时间：${date.toLocaleString('zh-CN', { hour12: false })}\nUTC：${date.toISOString()}\n毫秒：${date.getTime()}`;
}

export default function Home() {
  const [active, setActive] = useState('qr'); const [query, setQuery] = useState('');
  const [input, setInput] = useState('https://example.com'); const [output, setOutput] = useState('');
  const [mode, setMode] = useState('encode'); const [password, setPassword] = useState('');
  const [algorithm, setAlgorithm] = useState('SHA-256'); const [qr, setQr] = useState('');
  const [error, setError] = useState(''); const [copied, setCopied] = useState(false); const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(null); const [secure, setSecure] = useState(null);
  const item = tools.find(t => t.id === active); const Icon = item.icon;
  const filtered = useMemo(() => tools.filter(t => `${t.name}${t.description}`.toLowerCase().includes(query.toLowerCase())), [query]);
  useEffect(() => { setSecure(window.isSecureContext); setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (active !== 'qr') return;
    let live = true; if (!input.trim()) { setQr(''); setError(''); return; }
    QRCode.toDataURL(input, { width: 600, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#101b32', light: '#ffffff' } }).then(url => { if (live) { setQr(url); setError(''); } }).catch(() => { if (live) { setQr(''); setError('内容太长，无法生成二维码。'); } });
    return () => { live = false; };
  }, [input, active]);
  function selectTool(id) {
    setActive(id); setInput(id === 'qr' ? 'https://example.com' : ''); setOutput(''); setError(''); setMode('encode'); setPassword(''); setCopied(false);
  }
  function run() {
    setError(''); setCopied(false); setBusy(true);
    setTimeout(async () => { try {
      let result = '';
      if (active === 'base64') result = mode === 'encode' ? base64Encode(input) : base64Decode(input);
      if (active === 'url') result = mode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input);
      if (active === 'hash') result = bytesToHex(({'SHA-256': sha256, 'SHA-512': sha512, MD5: md5})[algorithm](new TextEncoder().encode(input)));
      if (active === 'aes') { if (!input || !password) throw new Error('请输入内容和密码。'); result = await (mode === 'encode' ? encrypt(input, password) : decrypt(input, password)); }
      if (active === 'json') result = JSON.stringify(JSON.parse(input), null, mode === 'encode' ? 2 : 0);
      if (active === 'time') result = dateFromTimestamp(input);
      if (active === 'uuid') result = Array.from({length: Math.max(1, Math.min(20, Number(input) || 1))}, randomUuid).join('\n');
      setOutput(result);
    } catch (e) { setOutput(''); setError(e instanceof Error ? e.message : '操作失败，请检查输入。'); } finally { setBusy(false); } }, 30);
  }
  async function copy(value) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else { const el = document.createElement('textarea'); el.value = value; el.style.position = 'fixed'; el.style.opacity = '0'; document.body.appendChild(el); el.select(); const ok = document.execCommand('copy'); el.remove(); if (!ok) throw new Error(); }
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { setError('复制失败，请手动选择结果复制。'); }
  }
  const dual = ['base64','url','aes','json'].includes(active);
  const primaryLabel = active === 'hash' ? '生成哈希' : active === 'time' ? '转换时间' : active === 'uuid' ? '生成 UUID' : active === 'json' ? (mode === 'encode' ? '格式化 JSON' : '压缩 JSON') : mode === 'encode' ? (active === 'aes' ? '加密文本' : '开始编码') : (active === 'aes' ? '解密文本' : '开始解码');
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><WandSparkles size={20}/></div><div><strong>Toolbox<span>.</span></strong><small>YOUR DIGITAL SIDEKICK</small></div></div>
      <div className="side-caption">WORKSPACE <span>01</span></div>
      <nav aria-label="工具导航">{['常用工具','编码转换','加密与安全','开发工具'].map(group => <div className="nav-group" key={group}><div className="nav-label">{group}</div>{tools.filter(t => t.group === group).map(t => { const I=t.icon; return <button key={t.id} className={`nav-item ${active===t.id?'selected':''}`} onClick={() => selectTool(t.id)}><I size={17}/><span>{t.short}</span>{active===t.id && <ChevronRight size={15}/>}</button>; })}</div>)}</nav>
      <div className="side-bottom"><div className="side-bottom-icon"><ShieldCheck size={18}/></div><div><strong>简单，也安心</strong><p>工具在浏览器中运行</p></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumbs"><span>工作台</span><ChevronRight size={14}/><strong>{item.name}</strong></div><div className="top-right"><span className="status-dot"/> ALL SYSTEMS READY <span className="top-divider"/><div className="avatar">T</div></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><span/> YOUR EVERYDAY TOOLKIT</div><h1>想做什么<span>，</span><br/>今天就搞定<span>。</span></h1><p>一些趁手的小工具，让日常工作更简单。</p></div><div className="hero-decoration" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-symbol"><Sparkles size={31}/></div><span className="star star-a">✳</span><span className="star star-b">✦</span><span className="hero-label">MAKE IT<br/>SIMPLE.</span></div></div>
        <div className="section-head"><div><span className="section-kicker">THE TOOLKIT</span><h2>探索工具 <span> /  01—08</span></h2></div><label className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索工具..." aria-label="搜索工具"/></label></div>
        <div className="tool-grid">{filtered.map(t=>{const I=t.icon;return <button className={`tool-card ${active===t.id?'active':''}`} key={t.id} onClick={()=>selectTool(t.id)}><div className="card-top"><span className="tool-icon"><I size={20}/></span>{t.tag ? <span className="tag">{t.tag}</span> : <ArrowRight className="card-arrow" size={17}/>}</div><strong>{t.name}</strong><p>{t.description}</p></button>})}{!filtered.length && <div className="no-results">没有找到相关工具，试试其他关键词。</div>}</div>
        <div className="workspace-head"><div><span className="section-kicker">LET’S GET TO WORK</span><h2>开始使用 <span> /  WORKSPACE</span></h2></div><div className="local-note"><ShieldCheck size={15}/> 本地处理，不上传内容</div></div>
        <section className="workspace" aria-label={item.name}>
          <div className="workspace-title"><div className="workspace-icon"><Icon size={22}/></div><div><div className="title-line"><h3>{item.name}</h3><span className="live-pill"><i/> READY</span></div><p>{item.description}</p></div><button className="reset" onClick={()=>selectTool(active)} title="重置"><RotateCcw size={16}/><span>重置</span></button></div>
          {active === 'qr' ? <div className="qr-layout"><div className="field-column"><label className="field-label" htmlFor="qr-input">输入内容 <span>CONTENT</span></label><textarea id="qr-input" value={input} onChange={e=>setInput(e.target.value)} placeholder="输入网址、文字或任何内容..."/><div className="input-foot"><span>支持链接、文字等内容</span><span>{input.length} 字符</span></div><div className="tip"><Sparkles size={17}/><div><strong>小提示</strong><p>内容越简短，二维码越容易被识别。生成后可下载高清 PNG。</p></div></div></div><div className="qr-preview"><div className="preview-label">PREVIEW <span>实时预览</span></div><div className="qr-frame">{qr ? <img src={qr} alt="生成的二维码"/> : <QrCode size={68} strokeWidth={1}/>}</div><p>扫描二维码查看内容</p><a className={`download ${!qr?'disabled':''}`} href={qr || undefined} download="toolbox-qrcode.png" aria-disabled={!qr}><ArrowDownToLine size={16}/> 下载二维码</a></div></div> : <div className="form-area">
            {dual && <div className="segmented"><button className={mode==='encode'?'on':''} onClick={()=>{setMode('encode');setOutput('');setError('')}}>{active==='json'?'格式化':active==='aes'?'加密':'编码'}</button><button className={mode==='decode'?'on':''} onClick={()=>{setMode('decode');setOutput('');setError('')}}>{active==='json'?'压缩':active==='aes'?'解密':'解码'}</button></div>}
            {active==='hash' && <div className="options">{['SHA-256','SHA-512','MD5'].map(a=><button key={a} className={algorithm===a?'on':''} onClick={()=>setAlgorithm(a)}>{a}</button>)}</div>}
            {active==='time' && <div className="current-time"><Clock3 size={17}/><span>当前 Unix 时间戳</span><strong>{now ? Math.floor(now/1000) : '—'}</strong><button onClick={()=>setInput(String(Math.floor(Date.now()/1000)))}>使用当前时间</button></div>}
            <div className="field-label-row"><label className="field-label" htmlFor="input">{active==='uuid'?'生成数量':active==='time'?'Unix 时间戳':mode==='decode'&&active==='aes'?'密文':'输入内容'} <span>INPUT</span></label>{active==='uuid' && <span className="tiny">一次最多 20 个</span>}</div>
            {['time','uuid'].includes(active) ? <input className="single-input" id="input" value={input} onChange={e=>setInput(e.target.value)} placeholder={active==='time'?'输入秒或毫秒时间戳':'输入数量，默认 1'} inputMode="numeric"/> : <textarea id="input" value={input} onChange={e=>setInput(e.target.value)} placeholder={active==='json'?'在这里粘贴 JSON...':active==='aes'&&mode==='decode'?'粘贴完整的 TL2 密文...':'在这里输入或粘贴内容...'}/>}
            {active==='aes' && <div className="password-field"><label className="field-label" htmlFor="password">密码 <span>PASSWORD</span></label><input id="password" type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)} placeholder="输入加密密码"/><p>请妥善保存密码；忘记密码将无法恢复内容。仅支持本工具生成的 TL2 密文。</p>{secure === false && <p className="subtle-warning">当前连接未使用 HTTPS，页面传输可能被篡改，请勿处理敏感内容。</p>}</div>}
            {active==='hash' && algorithm==='MD5' && <p className="subtle-warning">MD5 不适合密码存储或安全校验，请优先使用 SHA-256。</p>}
            <button className="primary" onClick={run} disabled={busy}>{busy?'处理中...':primaryLabel} <ArrowRight size={16}/></button>
            {output && <div className="result"><div className="result-head"><label className="field-label" htmlFor="output">处理结果 <span>OUTPUT</span></label><button onClick={()=>copy(output)}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?'已复制':'复制结果'}</button></div><textarea id="output" readOnly value={output}/></div>}
          </div>}
          {error && <div className="error" role="alert">{error}</div>}
        </section>
        <footer><div><span className="footer-mark">✳</span><strong>Toolbox.</strong> <span>为每一个灵感，准备好工具。</span></div><span>MADE FOR THE LITTLE THINGS &nbsp; © 2026</span></footer>
      </div>
    </main>
  </div>;
}
