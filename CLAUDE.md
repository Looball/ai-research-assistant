# CLAUDE.md — AI Research Assistant

## 开始工作前

> **前提**：Python FastAPI 后端必须在 `127.0.0.1:8000` 运行（或 `.env` 中 `BACKEND_ORIGIN` 指定的地址），否则所有 API 返回 502。

---

## 项目角色

这是一个**纯前端项目**。Next.js 的职责是：

1. **渲染 UI** — 聊天界面、会话管理、知识库面板、设置页、登录注册
2. **反向代理** — `src/app/api/*` 将所有请求转发至 FastAPI 后端

**本项目不包含任何业务逻辑。** LLM 调用、向量存储、RAG、数据库、文件处理全部在 Python FastAPI 后端完成。

---

## 架构一览

```
浏览器 (React SPA)
    │
    ▼ HTTP / SSE
Next.js 16 (本项目)
    ├── src/app/*/page.tsx     前端页面（纯 UI）
    ├── src/app/api/*/route.ts 反向代理 → FastAPI 后端
    └── src/lib/auth.ts        JWT 认证工具
    │
    ▼ HTTP
Python FastAPI (独立服务)
    ├── LLM 调用 (DeepSeek)
    ├── 向量存储 & RAG
    ├── 知识库管理
    ├── 文件上传 & 处理
    └── 数据库操作
```

---

## 关键文件

| 文件 | 用途 |
|---|---|
| `src/app/page.tsx` | 主聊天界面（会话、知识库、SSE 流、Markdown 渲染）⚠️ 3700+ 行，待拆分 |
| `src/app/layout.tsx` | 根布局 + metadata（标题：本地知识库问答系统Demo） |
| `src/app/globals.css` | Tailwind + 设计系统 CSS 变量 + 自定义组件类 |
| `src/app/login/page.tsx` | 登录页 |
| `src/app/register/page.tsx` | 注册页 |
| `src/app/settings/page.tsx` | LLM / Embedding / 系统提示词配置 |
| `src/app/api/chat/route.ts` | 聊天代理（支持 SSE 流透传） |
| `src/app/api/chat/knowledge-bases/` | 知识库 CRUD 代理 |
| `src/app/api/chat/conversations/` | 会话管理代理 |
| `src/app/api/login/route.ts` | 登录代理 |
| `src/app/api/register/route.ts` | 注册代理 |
| `src/lib/auth.ts` | `parseAuthState`、`buildAuthorizationHeader`、类型守卫 |
| `.env` | `BACKEND_ORIGIN`、`BACKEND_LOGIN_PATH` |
| `.env.local` | `DEEPSEEK_API_KEY`（gitignore） |
| `next.config.ts` | `allowedDevOrigins: ["localhost", "127.0.0.1"]` |
| `tsconfig.json` | `strict: true`、`@/*` → `./src/*` |

---

## 新增 API 代理路由

模板（复制即用）：

```ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";

const backendOrigin =
  process.env.BACKEND_ORIGIN?.replace(/\/+$/, "") ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headers = new Headers({
      "Content-Type": request.headers.get("Content-Type") ?? "application/json",
    });
    const auth = request.headers.get("Authorization");
    if (auth) headers.set("Authorization", auth);

    const res = await fetch(`${backendOrigin}/your-path`, {
      method: "POST", headers, body, cache: "no-store",
    });

    return new Response(res.body ?? await res.text(), {
      status: res.status,
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": res.headers.get("Content-Type") ?? "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { detail: "连接后端失败，请确认后端已启动。" },
      { status: 502 }
    );
  }
}
```

- 如果是 SSE 流，在返回 Headers 中加 `"X-Accel-Buffering": "no"`
- `GET` / `DELETE` 方法不需要 body，用 `URLSearchParams` 读取查询参数

---

## 必须遵守的约定

### TypeScript
- `strict: true` — 不允许 `any`
- JSON 解析：`JSON.parse(x) as unknown` → 类型守卫收窄，禁止直接 `as MyType`
- 类型守卫写法参考 `src/lib/auth.ts`

### React 状态
- **派生值不设 state** — `const current = sessions.find(...)` 而非再 `useState`
- **会话级状态按 ID 隔离** — `Record<string, boolean>`，不用全局布尔值
- **localStorage 先恢复再保存** — 用 `hasLoaded` 防覆盖

### 样式
- 优先 Tailwind 原子类，复杂样式复用 `globals.css` 语义类名
- 颜色用 CSS 变量：`var(--research)`、`var(--coral)`、`var(--paper)` 等
- 新动画配 `prefers-reduced-motion` 回退

### 文案
- 面向用户全部**简体中文**
- 错误格式："问题描述，建议操作。"

### 环境变量
- `.env`：可提交（非敏感配置）
- `.env.local`：禁止提交（密钥等）
- `.gitignore` 已配置忽略 `.env.local`、`.agents/`、`PROJECT_NOTES.md`、`.vscode/`

---

## 提交前

```bash
npm run lint          # 零警告
git status --short    # 确认变更范围，不混入无关文件
```

提交信息末尾加：
```
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 待重构

- `src/app/page.tsx`（3700+ 行）急需拆分，新功能**不要继续往里堆**
- 建议创建 `src/components/` 目录，候选组件：
  - `ChatPanel` — 消息列表 + 输入区
  - `SessionList` — 左侧会话列表
  - `KnowledgeBasePanel` — 知识库管理面板
  - `MessageBubble` — 单条消息渲染
  - `MarkdownRenderer` — Markdown 渲染
