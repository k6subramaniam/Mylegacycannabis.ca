import { ENV } from "./env";
import * as db from "../db";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

// ─── AI Config: reads from site_settings with env var fallback ───

export type AiConfig = {
  provider: "openai" | "gemini";
  apiKey: string;
  baseUrl?: string;
  model?: string;
};

// Cache config for 60s to avoid hammering DB on every LLM call
let _configCache: AiConfig | null = null;
let _configCacheTime = 0;
const CONFIG_CACHE_TTL = 60_000;

export async function getAiConfig(): Promise<AiConfig> {
  const now = Date.now();
  if (_configCache && now - _configCacheTime < CONFIG_CACHE_TTL) return _configCache;

  const [provider, apiKey, model] = await Promise.all([
    db.getSiteSetting("ai_provider"),
    db.getSiteSetting("ai_api_key"),
    db.getSiteSetting("ai_model"),
  ]);

  const config: AiConfig = {
    provider: (provider === "gemini" ? "gemini" : "openai") as "openai" | "gemini",
    apiKey: apiKey || ENV.forgeApiKey || "",
    baseUrl: ENV.forgeApiUrl || undefined,
    model: model || undefined,
  };

  // If admin set an API key, use it (and clear the forge base URL so it goes direct)
  if (apiKey) {
    config.apiKey = apiKey;
    // When admin provides their own key, don't route through Forge proxy
    if (config.provider === "openai") {
      config.baseUrl = "https://api.openai.com/v1";
    }
  }

  _configCache = config;
  _configCacheTime = now;
  return config;
}

/** Clear the config cache (call after admin updates AI settings) */
export function clearAiConfigCache(): void {
  _configCache = null;
  _configCacheTime = 0;
}

const resolveApiUrl = () => {
  if (ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0) {
    return `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`;
  }
  return "https://api.openai.com/v1/chat/completions";
};

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

// ─── Gemini native API adapter ───

function messagesToGeminiContents(messages: Message[]): { systemInstruction?: any; contents: any[] } {
  let systemInstruction: any = undefined;
  const contents: any[] = [];

  for (const msg of messages) {
    const textContent = typeof msg.content === "string"
      ? msg.content
      : ensureArray(msg.content).map(p => typeof p === "string" ? p : (p as any).text || "").join("\n");

    if (msg.role === "system") {
      systemInstruction = { parts: [{ text: textContent }] };
    } else {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: textContent }],
      });
    }
  }

  return { systemInstruction, contents };
}

async function invokeGeminiNative(params: InvokeParams, config: AiConfig): Promise<InvokeResult> {
  const model = config.model || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
  const maxTokens = params.maxTokens || params.max_tokens || 32768;

  const { systemInstruction, contents } = messagesToGeminiContents(params.messages);

  const wantsJson = params.responseFormat?.type === "json_object" || params.response_format?.type === "json_object";

  const body: Record<string, any> = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      ...(wantsJson ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText.slice(0, 500)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Convert to OpenAI-compatible InvokeResult shape
  return {
    id: `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: { role: "assistant", content: text },
      finish_reason: data.candidates?.[0]?.finishReason || "stop",
    }],
    usage: data.usageMetadata ? {
      prompt_tokens: data.usageMetadata.promptTokenCount || 0,
      completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
      total_tokens: data.usageMetadata.totalTokenCount || 0,
    } : undefined,
  };
}

// ─── Main invokeLLM function ───

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  // Check if admin has configured their own AI settings
  const config = await getAiConfig();

  // If admin set Gemini as provider with their own API key, use native Gemini API
  if (config.provider === "gemini" && config.apiKey && !ENV.forgeApiUrl) {
    return invokeGeminiNative(params, config);
  }
  if (config.provider === "gemini" && config.apiKey && config.apiKey !== ENV.forgeApiKey) {
    return invokeGeminiNative(params, config);
  }

  // OpenAI-compatible path (Forge proxy, OpenAI direct, or admin's OpenAI key)
  let apiUrl: string;
  let apiKey: string;
  let modelName: string;

  if (config.apiKey && config.apiKey !== ENV.forgeApiKey) {
    // Admin configured their own OpenAI key
    apiUrl = `${config.baseUrl || "https://api.openai.com/v1"}/chat/completions`;
    apiKey = config.apiKey;
    modelName = config.model || "gpt-4o-mini";
  } else if (ENV.forgeApiKey) {
    // Fall back to Forge proxy (built-in)
    apiUrl = resolveApiUrl();
    apiKey = ENV.forgeApiKey;
    modelName = "gemini-2.5-flash";
  } else {
    throw new Error("No AI API key configured. Go to Admin > Settings > AI Configuration to set one up.");
  }

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: modelName,
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const maxTokens = params.maxTokens || params.max_tokens || 32768;
  payload.max_tokens = maxTokens;

  // Only add thinking for Forge proxy / Gemini-through-OpenAI-compat
  if (apiUrl.includes("forge") || modelName.startsWith("gemini")) {
    payload.thinking = { budget_tokens: 1024 };
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText.slice(0, 500)}`
    );
  }

  return (await response.json()) as InvokeResult;
}
