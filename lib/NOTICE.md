# 第三方组件声明（NOTICE）

本目录下的文件均为第三方开源组件的**原样拷贝**，版权归各自作者所有，
在此仅作署名与许可证随附之用。各组件均保留其原始许可证要求。

---

## 1. Tailwind CSS

| 项 | 值 |
|---|---|
| 文件 | `js/tailwindcss.js`（Play CDN 浏览器版） |
| 版本 | 3.4.17 |
| 版权 | Copyright (c) Tailwind Labs, Inc. |
| 许可证 | MIT |
| 主页 | https://tailwindcss.com |

> Play CDN 版会在浏览器内实时编译 CSS，**不适合生产环境**，本项目仅用于原型演示。

---

## 2. Font Awesome Free

| 项 | 值 |
|---|---|
| 文件 | `css/all.min.css`、`webfonts/fa-solid-900.woff2`、`webfonts/fa-regular-400.woff2`、`webfonts/fa-brands-400.woff2` |
| 版本 | 6.4.0 |
| 版权 | Copyright (c) Fonticons, Inc. |
| 主页 | https://fontawesome.com |

许可证为**三重许可**，使用时须同时满足：

- **图标（icons）** — CC BY 4.0
  必须署名："Font Awesome Free 6.4.0 by @fontawesome"，并附 <https://fontawesome.com> 链接。
- **字体（fonts）** — SIL OFL 1.1
  须随包分发 OFL 许可证全文；如再分发字体文件本身，须使用相同文件名。
- **代码（code）** — MIT

> 本仓库随包分发的字体为 `.woff2`；`all.min.css` 中还声明了 `.ttf` 回退路径，
> 但该文件未随包提供（现代浏览器均支持 woff2，故不影响使用）。

---

## 3. marked

| 项 | 值 |
|---|---|
| 文件 | `js/marked.min.js` |
| 版本 | 15.0.12 |
| 版权 | Copyright (c) 2011-2025, Christopher Jeffrey |
| 许可证 | MIT |
| 主页 | https://github.com/markedjs/marked |

---

## 4. html2canvas

| 项 | 值 |
|---|---|
| 文件 | `js/html2canvas.min.js` |
| 版本 | 1.4.1 |
| 版权 | Copyright (c) 2022 Niklas von Hertzen |
| 许可证 | MIT |
| 主页 | https://html2canvas.hertzen.com |

---

## 5. 页面图片（`images/`）

`images/` 下的 `.jpg` 来自 [Unsplash](https://unsplash.com)，依 Unsplash License 发布
（可免费商用与修改，无需署名，但**不得未经编译直接转售**）。
其中的 `.svg` 为本项目自行生成的占位图，无第三方版权约束。

> 由 `tools/localize-images.js` 统一下载与本地化，文件名保留原 photo id 与尺寸，
> 便于回溯来源。示例来源：`https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=800&fit=crop`

---

## 构建期依赖（不进入运行时分发）

| 包 | 版本 | 许可证 |
|---|---|---|
| glob | 13.0.6 | BlueOak-1.0.0 |
| minimatch | 10.2.5 | BlueOak-1.0.0 |
| brace-expansion | 5.0.5 | MIT |
| balanced-match | 4.0.4 | MIT |
| minipass | 7.1.3 | BlueOak-1.0.0 |
| path-scurry | 2.0.2 | BlueOak-1.0.0 |
| lru-cache | 11.3.5 | BlueOak-1.0.0 |

---

**本项目自身的许可证见仓库根目录的 `LICENSE` 文件。**