/**
 * 本地静态服务器（热部署 / 浏览器联调用）
 *
 * 为什么不用 `python -m http.server`：
 *   它会带强缓存头，浏览器在改完 js/ 后仍加载旧文件，
 *   导致"代码明明改了却测的是旧行为"。这里统一发 no-store，
 *   每次刷新都拿最新文件。
 *
 * 用法：
 *   node tools/serve.js            # 默认 8899 端口
 *   node tools/serve.js 9000
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 8899);

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.map': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
    let urlPath;
    try {
        urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
        urlPath = '/';
    }
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(ROOT, urlPath);
    // 防目录穿越
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403).end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 Not Found');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            // 关键：禁用缓存，保证改完 js/ 刷新即生效
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Last-Modified': stat.mtime.toUTCString(),
        });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`静态服务器已启动: http://127.0.0.1:${PORT}/`);
    console.log(`  画布编辑器: http://127.0.0.1:${PORT}/canvas-editor.html?debug=1`);
    console.log(`  根目录: ${ROOT}`);
    console.log('  缓存策略: no-store（改完刷新即生效）');
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`端口 ${PORT} 已被占用，换一个：node tools/serve.js ${PORT + 1}`);
        process.exit(1);
    }
    throw e;
});
