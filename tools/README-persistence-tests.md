# 持久化层测试流程

针对 `js/storage.js` / `js/page-manager/page-manager.js` / `js/page-library/page-library.js`
的一整套测试与联调流程。分三层，每层解决不同的问题：

| 层 | 命令 | 作用 | 耗时 |
|---|---|---|---|
| 1. 单元/集成 | `node tools/test-persistence.js` | 36 条用例，覆盖三个缺陷 | ~3 秒 |
| 2. 回归有效性 | `node tools/verify-regression.js` | 证明第 1 层不是"永远绿" | ~30 秒 |
| 3. 浏览器实测 | 起服务 + 打开 `canvas-editor.html` | 真实 localStorage / 真实 fetch | 手动 |

---

## 层 1：自动化用例

```bash
node tools/test-persistence.js            # 全部
node tools/test-persistence.js --verbose  # 带堆栈
```

做法：在 `vm` 沙箱里加载**真实的框架源码**（`js/storage.js` 等），只替换浏览器宿主对象：

- `localStorage` —— 可设配额（默认 5MB，测试里调到 20KB 来快速触发溢出）
- `fetch` —— 可编程：指定状态码 / 制造网络错误 / 制造挂起 / 设置单次往返延迟
- `document` —— 最小 DOM 桩；`PageLibraryRender` 相关用例注入可查询的 DOM
- `location.protocol` —— 可切 `http:` / `file:` 验证协议短路

覆盖分组：

- **问题 1（静默失败）**：配额溢出、SecurityError、序列化失败、限频不刷屏、
  脏标记保留、退出兜底（不依赖 fetch）、损坏数据隔离、加载后不误报未保存
- **问题 2（清空缓存）**：9 个键一次清干净、保留 `prototypeDebug` 与其他应用的数据、
  定时器停止、内存重置为**一个空白页**、清空后继续编辑仍能存下、无内容时不谎报成功
- **问题 3（探测 I/O）**：去重（30 元素 → 1 请求）、并发（耗时 ≈ max 而非 sum）、
  超时、三态判定（200 保留 / 404 删除 / 网络错误保留）、启动期已判定无效不再重复探测

> ⚠️ 注意事项
> - **不要**把 `js/element-manager/element-manager.js` 放回加载列表：它在顶层用
>   `const ElementManager` 声明，会在 vm 全局词法作用域里**遮蔽**注入的宿主桩。
> - 捕获提示信息要挂在 `PageLibraryRender`（渲染链末端）而不是 `PageLibrary`，
>   否则会把"中转层是否透传 duration"这条链路一起 mock 掉。

---

## 层 2：回归有效性验证

```bash
node tools/verify-regression.js           # 验证后自动清理基线目录
node tools/verify-regression.js --keep    # 保留基线目录供排查
```

**为什么需要它**：测试全绿可能只是因为用例根本没测到东西。这个脚本会：

1. 把当前代码复制到 `tools/.baseline-prefix/`
2. 用正则把三处修复**回滚成修复前的原始实现**
3. 用同一套用例跑一遍
4. 要求：三个缺陷**每一条都至少有一个用例变红**
5. 断言失败即退出非零

当前结果：基线 **15 项失败**，分别命中问题 1（3 项）、问题 2（6 项）、问题 3（6 项）。

用例带 5 秒看门狗（`PERSIST_TEST_CASE_TIMEOUT` 可调）——修复前的 `probePage` 没有超时，
挂起的 `fetch` 会永不返回，没有看门狗整个进程会卡死而不是报失败。

---

## 层 3：浏览器实测

### 起服务（热部署）

```bash
node tools/serve.js          # http://127.0.0.1:8899
node tools/serve.js 9000     # 换端口
```

**不要用 `python -m http.server`**：它带强缓存头，改完 `js/` 浏览器仍加载旧文件，
会让人误以为"代码改了没生效"。`tools/serve.js` 统一发 `Cache-Control: no-store`。

> 注：问题 3 只在 **HTTP** 下才会暴露。`file://` 协议下 `checkPageExists` 第一行就短路返回，
> 所以本地双击打开永远测不出串行探测的问题，必须用 HTTP 验证。

### 重置状态

浏览器联调前先访问 `http://127.0.0.1:8899/tools/reset-storage.html`，
点"清空全部"，再打开编辑器。否则上一轮的脏画布会在启动时被渲染成大量 iframe，把页面拖死。

### 手动用例清单

| # | 用例 | 做法 | 期望 |
|---|---|---|---|
| A | 配额溢出（自动保存） | 控制台把 localStorage 填到抛 `QuotaExceededError`，画布放数千元素后 `Storage.saveSilently()` | 红色常驻横幅 + 状态栏红色"保存失败:存储空间不足"，脏标记保留 |
| B | 配额溢出（手动保存） | `localStorage` 满时点保存按钮 | 横幅 + 状态栏 + `alert` 弹窗 |
| C | 清空缓存 | 铺满 9 个键 → 点清空按钮 → 确认 | 只剩 `prototypeDebug` 与其他应用数据；等待 80s 后画布键**不复活** |
| D | 退出兜底 | 改画布后**不按 Ctrl+S**，直接离开页面 | 离开时已自动落盘（未等 60s 也没手动保存） |
| E | 数据损坏 | 往画布键写坏 JSON 后刷新 | 生成 `.corrupt.<时间戳>` 备份键，内容一致；常驻告警；主键保留 |
| F | 探测性能 | 100 元素 / 10 个唯一页面，包一层 `fetch` 统计 | **10** 个 HEAD、最大并发 10；修复前为 100 个串行请求 |
| G | 三态判定 | 让某个页面 404、另一个网络故障 | 404 的元素删除，网络故障的元素**保留** |
| H | 正常回归 | 加 2 个元素 → `Storage.save()` → 刷新 | 数据完整恢复，且不误报"未保存" |

证据截图见 `.docs/evidence/`。

### 测量时的坑

- 每次注入 `window.fetch` 包装都会**再包一层**，多次测量会让请求计数成倍虚高。
  用完必须还原原生 `fetch`，或每次重载页面再测。
- `ego_navigate` 到相同 URL 可能**复用标签页而不真正重载**，端到端验证要确认页面真的换了。
- `Storage` / `PageLibrary` 等是经典脚本的顶层 `const`，只进全局词法作用域 ——
  `window.Storage` 是 `undefined`。在控制台里要用裸标识符 `Storage`，不能用 `window.Storage`。

---

## 接入 CI

```bash
node tools/check-config.js && \
node tools/check-references.js && \
node tools/test-persistence.js && \
node tools/verify-regression.js
```

全部脚本失败时以非零码退出，可直接串进流水线。
