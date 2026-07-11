#!/usr/bin/env node
/**
 * BREAKBOX LAN host — plain Node.js, zero deps.
 * Serves static files + WebSocket session relay on 0.0.0.0
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8765;
const HOST = '0.0.0.0';
const SESSION = (process.env.SESSION || genCode()).toUpperCase();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

function genCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += alphabet[crypto.randomInt(alphabet.length)];
  return s;
}

function lanIPs() {
  const ips = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name] || []) {
      if (info.family === 'IPv4' && !info.internal) ips.push(info.address);
    }
  }
  return ips.length ? ips : ['127.0.0.1'];
}

/* ---------- minimal WebSocket (text frames) ---------- */
const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const clients = new Set();

function wsAccept(key) {
  return crypto.createHash('sha1').update(key + WS_MAGIC).digest('base64');
}

function wsSend(socket, text) {
  if (socket.destroyed) return;
  const payload = Buffer.from(String(text), 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }
  socket.write(Buffer.concat([header, payload]));
}

function wsBroadcast(text, except) {
  for (const c of clients) {
    if (c !== except && c.joined) wsSend(c.socket, text);
  }
}

function attachWebSocket(socket, head) {
  let buf = head && head.length ? Buffer.from(head) : Buffer.alloc(0);
  const client = { socket, joined: false };
  clients.add(client);

  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (true) {
      if (buf.length < 2) return;
      const b0 = buf[0];
      const b1 = buf[1];
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let off = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2));
        off = 10;
      }
      const maskLen = masked ? 4 : 0;
      if (buf.length < off + maskLen + len) return;
      let payload = buf.subarray(off + maskLen, off + maskLen + len);
      if (masked) {
        const mask = buf.subarray(off, off + 4);
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
      }
      buf = buf.subarray(off + maskLen + len);

      if (opcode === 0x8) {
        try { socket.end(); } catch (_) {}
        return;
      }
      if (opcode === 0x9) {
        // pong
        const pong = Buffer.alloc(2);
        pong[0] = 0x8a;
        pong[1] = 0;
        socket.write(pong);
        continue;
      }
      if (opcode === 0x1 || opcode === 0x0) {
        handleMessage(client, payload.toString('utf8'));
      }
    }
  });

  const cleanup = () => {
    clients.delete(client);
  };
  socket.on('close', cleanup);
  socket.on('error', cleanup);
}

function handleMessage(client, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch (_) { return; }

  if (msg.type === 'join') {
    const code = String(msg.session || '').toUpperCase();
    if (code !== SESSION) {
      wsSend(client.socket, JSON.stringify({ type: 'error', error: 'bad_session' }));
      return;
    }
    client.joined = true;
    client.role = msg.role || 'ctrl';
    wsSend(client.socket, JSON.stringify({
      type: 'welcome',
      session: SESSION,
      peers: [...clients].filter((c) => c.joined).length,
    }));
    wsBroadcast(JSON.stringify({
      type: 'peer',
      peers: [...clients].filter((c) => c.joined).length,
    }), client);
    return;
  }

  if (!client.joined) return;

  // Relay state / step / cmd to everyone else in the session
  if (msg.type === 'state' || msg.type === 'step' || msg.type === 'cmd') {
    wsBroadcast(JSON.stringify(msg), client);
  }
}

/* ---------- static HTTP ---------- */
function safePath(urlPath) {
  const clean = decodeURIComponent((urlPath || '/').split('?')[0]);
  let rel = clean === '/' ? '/breakbox_1.html' : clean;
  if (rel === '/index.html') rel = '/breakbox_1.html';
  const full = path.normalize(path.join(__dirname, rel));
  if (!full.startsWith(__dirname)) return null;
  return full;
}

const server = http.createServer((req, res) => {
  if (req.url?.startsWith('/api/session')) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ session: SESSION, port: PORT }));
    return;
  }

  const file = safePath(req.url || '/');
  if (!file) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Error');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || req.headers.upgrade?.toLowerCase() !== 'websocket') {
    socket.destroy();
    return;
  }
  const accept = wsAccept(key);
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n` +
    '\r\n'
  );
  attachWebSocket(socket, head);
});

server.listen(PORT, HOST, () => {
  const ips = lanIPs();
  console.log('');
  console.log('  BREAKBOX LAN host');
  console.log('  ─────────────────');
  console.log(`  Session  ${SESSION}`);
  console.log(`  Port     ${PORT}`);
  console.log('');
  for (const ip of ips) {
    const base = `http://${ip}:${PORT}`;
    console.log(`  Host (audio):  ${base}/?s=${SESSION}&view=full&role=host`);
    console.log(`  Break+FX:     ${base}/?s=${SESSION}&view=break,fx&role=ctrl`);
    console.log(`  Seq+Mixer:    ${base}/?s=${SESSION}&view=seq,mixer&role=ctrl`);
    for (const v of ['transport', 'break', 'fx', 'seq', 'mixer', 'visuals']) {
      console.log(`  ${v.padEnd(10)}  ${base}/?s=${SESSION}&view=${v}&role=ctrl`);
    }
    console.log('');
  }
  console.log('  Controllers default to role=ctrl (no audio).');
  console.log('  Toggle multiple panels in the session bar, or use view=break,fx');
  console.log('  Same Wi‑Fi required. Ctrl+C to stop.');
  console.log('');
});
