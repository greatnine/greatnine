import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOST = 'localhost';

const mimeTypes = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.wav': 'audio/wav', '.mp4': 'video/mp4',
  '.woff': 'application/font-woff', '.woff2': 'application/font-woff2',
  '.ttf': 'application/font-ttf', '.otf': 'application/font-otf'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const safePath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = path.join(__dirname, safePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/html' });
      res.end(err.code === 'ENOENT' ? '<h1>404 Not Found</h1>' : `<h1>500</h1><p>${err.code}</p>`);
    } else {
      res.writeHead(200, { 'Content-Type': mime });
      res.end(content);
    }
  });
});

// 端口 0 = 系统自动分配空闲端口（永不冲突）
server.listen(0, HOST, () => {
  const port = server.address().port;
  const url = `http://${HOST}:${port}`;
  console.log(`✅ Server running at ${url}`);

  // 🌐 自动打开浏览器
  setTimeout(() => {
    let command;
    switch (process.platform) {
      case 'darwin': command = `open "${url}"`; break;
      case 'win32':  command = `start "" "${url}"`; break;
      default:        command = `xdg-open "${url}"`; break;
    }
    exec(command, (error) => {
      if (error) {
        console.log(`⚠️  Cannot open browser: ${error.message}`);
        console.log(`   Please open: ${url}`);
      } else {
        console.log(`🌐 Browser opened: ${url}`);
      }
    });
  }, 500);
});

// 🔑 Ctrl+C 自动关闭并释放端口
process.on('SIGINT', () => {
  console.log('\nClosing server...');
  server.close(() => {
    console.log('✅ Port released. Goodbye!');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 3000).unref(); // 兜底
});