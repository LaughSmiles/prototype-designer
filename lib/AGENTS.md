# 素材获取与第三方组件声明

本目录（`lib/`）承载两类文件，规则不同：

| 类别 | 位置 | 说明 |
|---|---|---|
| 第三方组件 | `js/` · `css/` · `webfonts/` | 原样拷贝，版权归各自作者；本文件负责署名与许可证随附（§1–§4） |
| 图片 / 视频素材 | `images/` · `videos/` | 生成原型页时获取并本地化，获取渠道与落地规则见 **§5** |

> 生成或修改原型页之前，**先读 §5**：它规定素材从哪里来、怎么落地、许可证是什么。

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

## 5. 图片与视频素材（`images/` · `videos/`）

原型约定「**完全离线、无 CDN**」：所有图片与视频都必须**下载到本地**再引用，
`images/` 放图片、`videos/` 放视频。页面**不得**直接引用任何图床的外链。

### 5.1 获取渠道

**首选走 MCP 检索**；MCP 不可用、无结果或被限流时，再回退到直连 URL。

| 渠道 | 图片 | 视频 | 首选方式（MCP） | 回退方式（直连 URL） |
|---|---|---|---|---|
| **Pexels** | ✅ | ✅ | `photos_search` / `videos_search` | `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=<w>&h=<h>`<br>`https://videos.pexels.com/video-files/<id>/<file>.mp4` |
| **Unsplash** | ✅ | ❌ | `search_photos` | `https://images.unsplash.com/photo-<id>?w=<w>&h=<h>&fit=crop` |

- ⚠️ **视频只有 Pexels 提供**，Unsplash 没有视频。需要视频时不要选 Unsplash。
- 页面里已经存在外链时，可用 `tools/localize-images.js` 批量下载并改写引用为本地路径。
  ⚠️ 该脚本**只处理图片**（`src` / `poster` / `data-src` 三个属性），视频需自行下载。
- 两条渠道都拿不到合适素材时，可用生成式工具兜底（`generate_image` / `submit_video_t2v`）。

### 5.2 落地铁律

- 图片必须进 `lib/images/`，视频必须进 `lib/videos/`
- 引用一律用**相对路径**，`../` 层数 = 页面路径中 `/` 的个数：

  | 页面路径 | 深度 | 写法 |
  |---|---|---|
  | `pages/app/feed/detail.html` | 3 | `../../../lib/images/x.jpg` |
  | `pages/admin/home.html` | 2 | `../../lib/images/x.jpg` |

- 三种常见引用形态：

  ```html
  <img src="../../../lib/images/avatar-x.jpg" alt="">
  <div style="background-image:url('../../../lib/images/cover-x.jpg');background-size:cover;background-position:center"></div>
  <video src="../../../lib/videos/feed-x.mp4" poster="../../../lib/images/cover-x.jpg" autoplay muted loop playsinline></video>
  ```

- ⚠️ **`images/` 与 `videos/` 下的文件是交付物的一部分**：删掉任何一个，引用它的页面
  就会留下一块空白，而且**不会有任何报错**。
