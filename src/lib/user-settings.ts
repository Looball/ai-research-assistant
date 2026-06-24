export type CredentialMode = "platform" | "user";

export type UserLLMSettings = {
  credentialMode: CredentialMode;
  provider: string;
  model: string;
  baseUrl: string;
  hasApiKey: boolean;
};

export type ModelProviderPreset = {
  value: string;
  label: string;
  models: string[];
};

export const FALLBACK_PROVIDER_PRESETS: ModelProviderPreset[] = [
  { value: "deepseek", label: "DeepSeek", models: ["deepseek-chat", "deepseek-reasoner"] },
  { value: "qwen", label: "通义千问", models: ["qwen-turbo", "qwen-plus", "qwen-max"] },
  { value: "kimi", label: "Kimi", models: ["moonshot-v1-8k", "kimi-k2"] },
  { value: "zhipu", label: "智谱", models: ["glm-4-flash", "glm-4-plus"] },
  { value: "doubao", label: "豆包", models: ["doubao-seed-1-6-250615"] },
  { value: "minimax", label: "MiniMax", models: ["MiniMax-Text-01"] },
];

export const DEFAULT_USER_LLM_SETTINGS: UserLLMSettings = {
  credentialMode: "platform",
  provider: "deepseek",
  model: "deepseek-chat",
  baseUrl: "",
  hasApiKey: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readModelName(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!isRecord(value)) {
    return "";
  }

  return readString(value.value, readString(value.id, readString(value.model, readString(value.name)))).trim();
}

function toProviderPreset(value: unknown): ModelProviderPreset | null {
  if (!isRecord(value)) {
    return null;
  }

  const provider = readString(value.value, readString(value.id, readString(value.provider))).trim();

  if (!provider) {
    return null;
  }

  const models = Array.isArray(value.models)
    ? value.models.map(readModelName).filter(Boolean)
    : [];

  return {
    value: provider,
    label: readString(value.label, readString(value.display_name, readString(value.name, provider))).trim(),
    models,
  };
}

export function parseProviderPresets(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const candidates = Array.isArray(value.providers)
    ? value.providers
    : Array.isArray(value.data)
      ? value.data
      : null;

  if (!candidates) {
    return null;
  }

  const presets = candidates
    .map(toProviderPreset)
    .filter((preset): preset is ModelProviderPreset => preset !== null);

  return presets.length > 0 ? presets : null;
}

export function parseUserLLMSettings(value: unknown): UserLLMSettings | null {
  if (!isRecord(value)) {
    return null;
  }

  const settings = isRecord(value.settings) ? value.settings : value;
  const credentialMode = settings.credential_mode;

  if (credentialMode !== "platform" && credentialMode !== "user") {
    return null;
  }

  return {
    credentialMode,
    provider: readString(settings.provider, DEFAULT_USER_LLM_SETTINGS.provider),
    model: readString(settings.model, DEFAULT_USER_LLM_SETTINGS.model),
    baseUrl: readString(settings.base_url),
    hasApiKey: settings.has_api_key === true,
  };
}

export function toUserLLMSettingsPayload(
  settings: UserLLMSettings,
  apiKey: string
) {
  const trimmedApiKey = apiKey.trim();

  return {
    credential_mode: settings.credentialMode,
    provider: settings.provider.trim(),
    model: settings.model.trim(),
    base_url: settings.provider === "custom" ? settings.baseUrl.trim() : null,
    ...(trimmedApiKey ? { api_key: trimmedApiKey } : {}),
  };
}

export function getSettingsMessage(value: unknown, fallback: string) {
  if (!isRecord(value)) {
    return fallback;
  }

  for (const key of ["detail", "error", "message"] as const) {
    const candidate = value[key];

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return fallback;
}

export function isSuccessfulResponse(value: unknown) {
  return isRecord(value) && value.success === true;
}
