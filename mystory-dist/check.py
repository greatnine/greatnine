# -*- coding: utf-8 -*-
"""
stories-manifest.py
--------------------
自动扫描 dist/stories/ 目录下的子目录，生成 dist/stories-data.js
每个故事目录会检测：
  - 是否包含 index.html       -> hasIndex
  - 是否包含 images/cover.*   -> cover (相对 URL)

stories-data.js 把清单以全局变量形式注入 index.html，使页面：
  - 在 GitHub Pages 等静态托管上可用
  - 在本地 Python http.server 上可用
  - 甚至直接双击 index.html (file://) 也可用

Usage:
    python check.py.py           # 扫描 stories/ -> 生成 data.js
    python check.py --dry      # 仅打印，不写文件
"""

import json
import sys
import argparse
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
STORIES_DIR = SCRIPT_DIR /'stories'
MANIFEST_JS = SCRIPT_DIR /'data.js'
COVER_EXTS = ['webp', 'jpg', 'jpeg', 'png']


def discover_stories(stories_dir: Path):
    """扫描 stories/ 下的子目录，返回列表。

    每个元素: { 'name': '目录名', 'hasIndex': True/False, 'cover': 'images/cover.xxx' 或 None }
    """
    if not stories_dir.is_dir():
        print(f'[WARNING] stories/ 目录未找到: {stories_dir}')
        return []

    results = []
    for entry in sorted(stories_dir.iterdir()):
        if not entry.is_dir() or entry.name.startswith('.'):
            continue

        info = {
            'name': entry.name,
            'hasIndex': (entry / 'index.html').is_file(),
            'cover': None,
        }

        images_dir = entry / 'images'
        if images_dir.is_dir():
            for ext in COVER_EXTS:
                candidate = images_dir / f'cover.{ext}'
                if candidate.is_file():
                    info['cover'] = f'stories/{entry.name}/images/cover.{ext}'
                    break

        results.append(info)
    return results


def write_js(stories, path: Path):
    """以全局变量形式写入 JS 文件，UTF-8 编码，中文保留原样。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {'stories': stories}
    js_content = (
        '// 由 stories-manifest.py 自动生成 —— 请不要手动编辑。\n'
        '// 此文件使 index.html 在任何环境下都能拿到故事目录清单（GitHub Pages / http.server / file://）。\n'
        'if (typeof window !== "undefined") {\n'
        '    window.STORIES_MANIFEST = '
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ';\n'
        '}\n'
    )
    path.write_text(js_content, encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(
        description='扫描 stories/ 并生成 data.js'
    )
    parser.add_argument(
        '--dry', action='store_true',
        help='仅打印清单，不写入文件'
    )
    parser.add_argument(
        '--stories-dir', default=str(STORIES_DIR),
        help=f'故事目录路径 (默认: {STORIES_DIR})'
    )
    parser.add_argument(
        '--output-js', default=str(MANIFEST_JS),
        help=f'输出 JS 文件路径 (默认: {MANIFEST_JS})'
    )
    args = parser.parse_args()

    stories_dir = Path(args.stories_dir).resolve()
    js_path = Path(args.output_js).resolve()

    stories = discover_stories(stories_dir)
    n_has_index = sum(1 for s in stories if s['hasIndex'])
    n_has_cover = sum(1 for s in stories if s['cover'])

    print(f'[OK] 在 {stories_dir} 下发现 {len(stories)} 个故事目录')
    print(f'     - 含 index.html: {n_has_index}')
    print(f'     - 含封面图:      {n_has_cover}')
    print()
    for s in stories:
        flags = []
        if s['hasIndex']:
            flags.append('index.html')
        else:
            flags.append('无故事')
        if s['cover']:
            flags.append('封面')
        print(f'  - {s["name"]}    ({", ".join(flags)})')

    if args.dry:
        print('\n[DRY RUN] 未写入文件。')
        return 0

    write_js(stories, js_path)
    print(f'\n[OK] 清单已写入: {js_path}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
