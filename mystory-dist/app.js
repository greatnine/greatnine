/**
 * app-test.js
 * 双模式获取故事列表（按优先级从高到低）：
 *   1) window.STORIES_MANIFEST  (由 stories-data.js 通过 <script> 注入，全环境可用)
 *      每个元素: { name, hasIndex, cover }
 *   2) 扫描 stories/ 目录        (Python http.server 等带目录索引的本地服务器)
 * 动态生成故事链接列表（书架版 + 封面图）
 */

(function() {
    'use strict';

    const STORIES_PATH = 'stories/';
    const CONTAINER_ID = 'app-list';
    const EMPTY_MSG = '无app可显示';
    const MISSING_MSG = '无故事';
    const READ_MSG = '点击阅读';
    const COVER_EXTS = ['webp', 'jpg', 'jpeg', 'png'];

    function parseManifestItems(data) {
        if (!data || !Array.isArray(data.stories) || data.stories.length === 0) return null;
        return data.stories.map(function(item) {
            if (typeof item === 'string') {
                // 兼容旧格式：纯目录名，默认可点击
                return { name: item, hasIndex: true, cover: null };
            }
            if (item && item.name) {
                return {
                    name: item.name,
                    hasIndex: item.hasIndex !== false,
                    cover: item.cover || null
                };
            }
            return null;
        }).filter(Boolean);
    }

    async function init() {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) return;

        showLoading(container);

        try {
            let items = null;

            // 模式 1：优先读 stories-data.js 注入的全局变量
            if (typeof window !== 'undefined' && window.STORIES_MANIFEST) {
                items = parseManifestItems(window.STORIES_MANIFEST);
            }

            // 模式 2：自动扫描 stories/ 目录（仅在 Python http.server 等返回目录列表时可用）
            if (!items || items.length === 0) {
                try {
                    const dirNames = await scanDirectories(STORIES_PATH);
                    if (dirNames.length > 0) {
                        items = dirNames.map(function(name) {
                            return { name: name, hasIndex: true, cover: null };
                        });
                    }
                } catch (e) {
                    console.warn('目录扫描失败，已跳过:', e);
                }
            }

            if (!items || items.length === 0) {
                renderEmpty(container);
                return;
            }
            renderApps(container, items);
        } catch (err) {
            console.error('渲染失败:', err);
            renderError(container, err);
        }
    }

    function showLoading(container) {
        container.innerHTML = '<p class="loading">正在翻阅书卷，请稍候...</p>';
    }

    async function scanDirectories(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error('无法读取目录: ' + path + ' (HTTP ' + response.status + ')');
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));

        const dirs = [];
        const seen = {};
        const currentDir = path.replace(/\/+$/, '').split('/').pop() || '';

        links.forEach(function(link) {
            const href = link.getAttribute('href');
            if (!href) return;

            if (href === '../' || href === '..' || href === './' || href === '/') return;
            if (href.charAt(0) === '#' || href.charAt(0) === '?') return;

            const normalized = href.replace(/\/+$/, '');
            const lastSeg = normalized.split('/').pop() || '';
            if (/\.[a-zA-Z0-9]{1,8}$/.test(lastSeg)) return;

            const dirName = extractDirName(href);
            if (!dirName || dirName === '..' || dirName === '.') return;
            if (dirName === currentDir) return;
            if (seen[dirName]) return;
            seen[dirName] = true;
            dirs.push(dirName);
        });

        return dirs.sort();
    }

    function extractDirName(href) {
        try {
            const url = new URL(href, window.location.href);
            let pathname = decodeURIComponent(url.pathname);
            pathname = pathname.replace(/\/+$/, '');
            const parts = pathname.split('/').filter(Boolean);
            return parts.length > 0 ? parts[parts.length - 1] : null;
        } catch (e) {
            let path = (href || '').replace(/\/+$/, '');
            const parts = path.split('/').filter(function(p) { return p && p !== '..' && p !== '.'; });
            return parts.length > 0 ? parts[parts.length - 1] : null;
        }
    }

    function renderEmpty(container) {
        container.innerHTML = '<p class="empty-state">' + EMPTY_MSG + '</p>';
    }

    function renderError(container, err) {
        container.innerHTML =
            '<div class="error-state">' +
            '  <p>扫描目录时遇到问题。</p>' +
            '  <p class="error-detail">' + escapeHtml(err.message) + '</p>' +
            '  <p class="hint">提示：请通过本地服务器访问此页面（如使用 VS Code Live Server、Python <code>python -m http.server</code> 等），直接打开文件可能无法正常工作。</p>' +
            '</div>';
    }

    function renderApps(container, items) {
        const isFileProtocol = (typeof window !== 'undefined' &&
                                window.location &&
                                window.location.protocol === 'file:');

        const grid = document.createElement('div');
        grid.className = 'app-grid';

        const cardMap = {};
        const needBackgroundCheck = [];

        items.forEach(function(item) {
            const encodedName = encodeURIComponent(item.name);
            const indexUrl = STORIES_PATH + encodedName + '/index.html';

            const card = document.createElement('a');
            const ok = item.hasIndex !== false;
            card.className = 'app-card' + (item.cover ? ' has-cover' : '') + (ok ? '' : ' missing');
            if (ok) {
                card.href = indexUrl;
            }
            card.innerHTML =
                '<div class="book">' +
                '  <div class="cover-veil"></div>' +
                '  <div class="book-top"></div>' +
                '  <h3 class="app-name">' + escapeHtml(item.name) + '</h3>' +
                '  <p class="app-status">' +
                '    <span class="status-badge ' + (ok ? 'ok' : 'missing') + '">' + (ok ? READ_MSG : MISSING_MSG) + '</span>' +
                '  </p>' +
                '</div>';

            const bookEl = card.querySelector('.book');
            if (item.cover && bookEl) {
                bookEl.style.backgroundImage = 'url("' + item.cover + '")';
            } else if (bookEl) {
                needBackgroundCheck.push({ name: item.name, encodedName: encodedName, bookEl: bookEl, card: card });
            }

            cardMap[item.name] = card;
            grid.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(grid);

        // manifest 没有提供封面时，只在服务器环境下尝试探测封面（file:// 下 fetch 会被禁）
        if (!isFileProtocol && needBackgroundCheck.length > 0) {
            needBackgroundCheck.forEach(async function(info) {
                const cover = await findCover(info.encodedName);
                if (cover && info.bookEl) {
                    info.bookEl.style.backgroundImage = 'url("' + cover + '")';
                    info.card.classList.add('has-cover');
                }
            });
        }
    }

    async function findCover(encodedDirName) {
        const base = STORIES_PATH + encodedDirName + '/images/cover';
        for (let i = 0; i < COVER_EXTS.length; i++) {
            const url = base + '.' + COVER_EXTS[i];
            try {
                const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
                if (res.ok) return url;
            } catch (e) {
                // 继续试下一个扩展名
            }
        }
        return null;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
