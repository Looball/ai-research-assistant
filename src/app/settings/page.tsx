"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import {
  AUTH_STORAGE_KEY,
  getAuthUsername,
  parseAuthState,
} from "@/lib/auth";

type SettingsSection = "account" | "llm" | "embedding" | "prompt";

type ProviderConfig = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
};

const sections: Array<{
  id: SettingsSection;
  index: string;
  label: string;
  description: string;
}> = [
  {
    id: "account",
    index: "01",
    label: "账号信息",
    description: "身份与联系信息",
  },
  {
    id: "llm",
    index: "02",
    label: "对话模型",
    description: "回答生成配置",
  },
  {
    id: "embedding",
    index: "03",
    label: "Embedding",
    description: "知识库向量配置",
  },
  {
    id: "prompt",
    index: "04",
    label: "系统提示词",
    description: "定义助手行为",
  },
];

const defaultSystemPrompt =
  "你是一个严谨的本地知识库研究助手。回答问题时优先依据检索到的知识库内容；当资料不足时，应明确说明信息缺失，不要编造事实。";

function ModelFields({
  value,
  onChange,
  showApiKey,
  onToggleApiKey,
  onTest,
  testState,
  embedding = false,
}: {
  value: ProviderConfig;
  onChange: (value: ProviderConfig) => void;
  showApiKey: boolean;
  onToggleApiKey: () => void;
  onTest: () => void;
  testState: "idle" | "testing" | "success";
  embedding?: boolean;
}) {
  const fieldClass =
    "research-focus mt-2 w-full border border-[#b7c4bf] bg-white px-3 py-3 text-sm text-[#17201f]";
  const labelClass =
    "font-utility block text-[10px] font-semibold uppercase text-[#64716d]";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <label className={labelClass}>
          Provider
          <select
            value={value.provider}
            onChange={(event) =>
              onChange({ ...value, provider: event.target.value })
            }
            className={fieldClass}
          >
            <option value="openai">OpenAI</option>
            {embedding ? (
              <>
                <option value="cohere">Cohere</option>
                <option value="voyage">Voyage AI</option>
              </>
            ) : (
              <>
                <option value="anthropic">Anthropic</option>
                <option value="deepseek">DeepSeek</option>
              </>
            )}
            <option value="ollama">Ollama</option>
            <option value="custom">OpenAI Compatible</option>
          </select>
        </label>

        <label className={labelClass}>
          {embedding ? "Embedding Model" : "Model"}
          <input
            value={value.model}
            onChange={(event) =>
              onChange({ ...value, model: event.target.value })
            }
            placeholder={
              embedding ? "text-embedding-3-small" : "gpt-4.1-mini"
            }
            className={fieldClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        API Base URL
        <input
          value={value.baseUrl}
          onChange={(event) =>
            onChange({ ...value, baseUrl: event.target.value })
          }
          placeholder="https://api.openai.com/v1"
          className={fieldClass}
        />
      </label>

      <div>
        <label htmlFor={`${embedding ? "embedding" : "llm"}-api-key`} className={labelClass}>
          API Key
        </label>
        <div className="mt-2 flex border border-[#b7c4bf] bg-white focus-within:border-[#176b62] focus-within:ring-3 focus-within:ring-[#176b62]/15">
          <input
            id={`${embedding ? "embedding" : "llm"}-api-key`}
            type={showApiKey ? "text" : "password"}
            value={value.apiKey}
            onChange={(event) =>
              onChange({ ...value, apiKey: event.target.value })
            }
            autoComplete="off"
            placeholder="输入后将由后端加密保存"
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#17201f] outline-none"
          />
          <button
            type="button"
            onClick={onToggleApiKey}
            className="shrink-0 border-l border-[#d5ded9] px-4 text-xs font-semibold text-[#64716d] transition hover:bg-[#eef3f0] hover:text-[#176b62]"
          >
            {showApiKey ? "隐藏" : "显示"}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-[#7b8884]">
          页面不会把密钥保存到浏览器本地。接入后端后，只在填写新密钥时提交。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-[#d5ded9] pt-5">
        <button
          type="button"
          onClick={onTest}
          disabled={testState === "testing"}
          className="border border-[#176b62] px-4 py-2.5 text-sm font-semibold text-[#176b62] transition hover:bg-[#e2eeea] disabled:border-[#9bada6] disabled:text-[#7b8884]"
        >
          {testState === "testing"
            ? "测试中..."
            : testState === "success"
              ? "字段完整"
              : "测试连接"}
        </button>
        {testState === "success" && (
          <span className="text-xs font-semibold text-[#176b62]">
            配置字段完整，等待后端连接测试接口。
          </span>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("account");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [llm, setLlm] = useState<ProviderConfig>({
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    apiKey: "",
  });
  const [embedding, setEmbedding] = useState<ProviderConfig>({
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "text-embedding-3-small",
    apiKey: "",
  });
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [showEmbeddingKey, setShowEmbeddingKey] = useState(false);
  const [llmTestState, setLlmTestState] = useState<
    "idle" | "testing" | "success"
  >("idle");
  const [embeddingTestState, setEmbeddingTestState] = useState<
    "idle" | "testing" | "success"
  >("idle");
  const [notice, setNotice] = useState("");
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const authState = parseAuthState(localStorage.getItem(AUTH_STORAGE_KEY));

    if (!authState) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.href = "/login";
      return;
    }

    queueMicrotask(() => {
      if (isCancelled) {
        return;
      }

      setUsername(getAuthUsername(authState));
      setHasCheckedAuth(true);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  function handleConnectionTest(
    config: ProviderConfig,
    setState: (state: "idle" | "testing" | "success") => void
  ) {
    if (!config.provider || !config.baseUrl.trim() || !config.model.trim()) {
      setNotice("请先填写 Provider、API 地址和模型名称。");
      return;
    }

    setNotice("");
    setState("testing");
    window.setTimeout(() => setState("success"), 550);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (email && !email.includes("@")) {
      setNotice("请输入有效的邮箱地址。");
      setActiveSection("account");
      return;
    }

    setNotice(
      "配置界面已就绪。接入 PATCH /user/settings 后，这里会保存到后端。"
    );
  }

  if (!hasCheckedAuth) {
    return (
      <main className="research-canvas flex min-h-screen items-center justify-center px-4">
        <div className="font-utility flex items-center gap-3 text-xs font-semibold text-[#176b62]">
          <span className="h-2.5 w-2.5 animate-pulse bg-[#e36b4f]" />
          正在读取用户配置...
        </div>
      </main>
    );
  }

  const activeMeta =
    sections.find((section) => section.id === activeSection) || sections[0];

  return (
    <main className="research-canvas min-h-screen px-3 py-3 md:px-5 md:py-5">
      <form
        onSubmit={handleSubmit}
        className="research-enter mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-[1240px] border border-[#bdcac5] bg-[#fcfdfb] lg:grid-cols-[280px_minmax(0,1fr)]"
      >
        <aside className="flex flex-col border-b border-[#bdcac5] bg-[#edf2ef] p-5 lg:border-b-0 lg:border-r">
          <div className="border-b border-[#c7d1cd] pb-5">
            <p className="font-utility text-[10px] font-semibold uppercase text-[#176b62]">
              Researcher Settings
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold text-[#17201f]">
              用户设置
            </h1>
            <p className="mt-2 truncate text-sm text-[#64716d]">
              {username || "已登录用户"}
            </p>
          </div>

          <nav
            aria-label="用户设置分类"
            className="mt-5 grid grid-cols-2 gap-2 lg:block lg:space-y-2"
          >
            {sections.map((section) => {
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(section.id);
                    setNotice("");
                  }}
                  className={`flex w-full items-start gap-3 border-l-4 px-3 py-3 text-left transition ${
                    isActive
                      ? "border-[#e36b4f] bg-[#17201f] text-white"
                      : "border-transparent bg-[#fcfdfb] text-[#46514e] hover:border-[#d5a83b]"
                  }`}
                >
                  <span
                    className={`font-utility text-[10px] font-semibold ${
                      isActive ? "text-[#d5a83b]" : "text-[#7b8884]"
                    }`}
                  >
                    {section.index}
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm">{section.label}</strong>
                    <span
                      className={`mt-1 hidden text-xs lg:block ${
                        isActive ? "text-[#b8c8c3]" : "text-[#7b8884]"
                      }`}
                    >
                      {section.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto hidden border-t border-[#c7d1cd] pt-5 lg:block">
            <Link
              href="/"
              className="font-utility text-[10px] font-semibold uppercase text-[#176b62] underline decoration-[#d5a83b] decoration-2 underline-offset-4"
            >
              ← 返回研究工作台
            </Link>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="border-b border-[#cbd5d1] px-5 py-6 md:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-utility text-[10px] font-semibold uppercase text-[#176b62]">
                  {activeMeta.index} / Configuration
                </p>
                <h2 className="font-display mt-3 text-3xl font-semibold text-[#17201f]">
                  {activeMeta.label}
                </h2>
                <p className="mt-2 text-sm text-[#64716d]">
                  {activeMeta.description}
                </p>
              </div>
              <Link
                href="/"
                className="text-sm font-semibold text-[#176b62] lg:hidden"
              >
                返回工作台
              </Link>
            </div>
          </header>

          <div className="min-w-0 flex-1 px-5 pb-28 pt-7 md:px-8 md:pb-32 md:pt-9">
            {activeSection === "account" && (
              <div className="max-w-2xl space-y-6">
                <div className="border-l-4 border-[#d5a83b] bg-[#f5f8f6] px-5 py-4">
                  <p className="font-display text-xl font-semibold text-[#17201f]">
                    研究者档案
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#64716d]">
                    用户名由登录账号决定，邮箱用于接收系统通知与找回账号。
                  </p>
                </div>

                <label className="font-utility block text-[10px] font-semibold uppercase text-[#64716d]">
                  用户名
                  <input
                    value={username}
                    disabled
                    className="mt-2 w-full border border-[#d5ded9] bg-[#eef3f0] px-3 py-3 text-sm text-[#64716d]"
                  />
                </label>

                <label className="font-utility block text-[10px] font-semibold uppercase text-[#64716d]">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className="research-focus mt-2 w-full border border-[#b7c4bf] bg-white px-3 py-3 text-sm text-[#17201f]"
                  />
                </label>
              </div>
            )}

            {activeSection === "llm" && (
              <div className="max-w-3xl">
                <div className="mb-6 border-l-4 border-[#176b62] bg-[#eef3f0] px-5 py-4">
                  <p className="font-display text-xl font-semibold text-[#17201f]">
                    对话生成模型
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#64716d]">
                    后端会读取这组配置调用模型。聊天请求体无需携带 API Key。
                  </p>
                </div>
                <ModelFields
                  value={llm}
                  onChange={setLlm}
                  showApiKey={showLlmKey}
                  onToggleApiKey={() => setShowLlmKey((current) => !current)}
                  onTest={() =>
                    handleConnectionTest(llm, setLlmTestState)
                  }
                  testState={llmTestState}
                />
              </div>
            )}

            {activeSection === "embedding" && (
              <div className="max-w-3xl">
                <div className="mb-6 border-l-4 border-[#e36b4f] bg-[#fff1ed] px-5 py-4">
                  <p className="font-display text-xl font-semibold text-[#17201f]">
                    知识库向量模型
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#7d4b3f]">
                    更换 Embedding 模型后，已有知识库必须重新生成向量，避免维度或语义空间不兼容。
                  </p>
                </div>
                <ModelFields
                  value={embedding}
                  onChange={setEmbedding}
                  showApiKey={showEmbeddingKey}
                  onToggleApiKey={() =>
                    setShowEmbeddingKey((current) => !current)
                  }
                  onTest={() =>
                    handleConnectionTest(embedding, setEmbeddingTestState)
                  }
                  testState={embeddingTestState}
                  embedding
                />
              </div>
            )}

            {activeSection === "prompt" && (
              <div className="max-w-3xl">
                <div className="mb-5 flex flex-col justify-between gap-3 border-b border-[#d5ded9] pb-5 sm:flex-row sm:items-end">
                  <div>
                    <p className="font-display text-xl font-semibold text-[#17201f]">
                      系统行为说明
                    </p>
                    <p className="mt-1 text-sm text-[#64716d]">
                      此提示词会放在每次模型调用的 system 消息中。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSystemPrompt(defaultSystemPrompt)}
                    className="shrink-0 text-xs font-semibold text-[#176b62] underline decoration-[#d5a83b] decoration-2 underline-offset-4"
                  >
                    恢复默认
                  </button>
                </div>
                <label className="font-utility block text-[10px] font-semibold uppercase text-[#64716d]">
                  System Prompt
                  <textarea
                    value={systemPrompt}
                    onChange={(event) => setSystemPrompt(event.target.value)}
                    className="research-focus mt-2 min-h-[320px] w-full resize-y border border-[#b7c4bf] bg-white px-4 py-4 font-sans text-sm leading-7 text-[#17201f]"
                  />
                </label>
                <p className="font-utility mt-2 text-right text-[10px] text-[#7b8884]">
                  {systemPrompt.length} characters
                </p>
              </div>
            )}
          </div>

          <footer className="sticky bottom-0 border-t border-[#cbd5d1] bg-[#eef3f0]/95 px-5 py-4 backdrop-blur md:px-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <p
                role="status"
                className={`text-xs ${
                  notice ? "text-[#7d4b3f]" : "text-[#72807b]"
                }`}
              >
                {notice || "API Key 仅在提交新值时发送到后端。"}
              </p>
              <button
                type="submit"
                className="shrink-0 bg-[#176b62] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#105149]"
              >
                保存修改
              </button>
            </div>
          </footer>
        </section>
      </form>
    </main>
  );
}
