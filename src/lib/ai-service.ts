import { GoogleGenAI } from "@google/genai";

export type AIProvider = "gemini" | "grok" | "groq" | "openai" | "auto";

export interface AIResponse {
  text: string;
  provider: Exclude<AIProvider, "auto">;
}

export interface AIRequestOptions {
  model?: string;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  maxOutputTokens?: number;
}

export interface AIMessage {
  role: "user" | "bot" | "system";
  content: string | any[];
}

type EnvKeyPrefix = "GEMINI_API_KEY" | "GROK_API_KEY" | "GROQ_API_KEY" | "OPENAI_API_KEY";

/** Static env reads so Vite `define` can replace each `process.env.*` at build time (dynamic lookups are not inlined). */
function keysFromEnvPrefix(prefix: EnvKeyPrefix): string[] {
  let raw: (string | undefined)[];
  switch (prefix) {
    case "GEMINI_API_KEY":
      raw = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_1,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
        process.env.GEMINI_API_KEY_4,
        process.env.GEMINI_API_KEY_5,
        process.env.GEMINI_API_KEY_6,
        process.env.GEMINI_API_KEY_7,
        process.env.GEMINI_API_KEY_8,
        process.env.GEMINI_API_KEY_9,
        process.env.GEMINI_API_KEY_10,
      ];
      break;
    case "GROK_API_KEY":
      raw = [
        process.env.GROK_API_KEY,
        process.env.GROK_API_KEY_1,
        process.env.GROK_API_KEY_2,
        process.env.GROK_API_KEY_3,
        process.env.GROK_API_KEY_4,
        process.env.GROK_API_KEY_5,
        process.env.GROK_API_KEY_6,
        process.env.GROK_API_KEY_7,
        process.env.GROK_API_KEY_8,
        process.env.GROK_API_KEY_9,
        process.env.GROK_API_KEY_10,
      ];
      break;
    case "GROQ_API_KEY":
      raw = [
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_1,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3,
        process.env.GROQ_API_KEY_4,
        process.env.GROQ_API_KEY_5,
        process.env.GROQ_API_KEY_6,
        process.env.GROQ_API_KEY_7,
        process.env.GROQ_API_KEY_8,
        process.env.GROQ_API_KEY_9,
        process.env.GROQ_API_KEY_10,
      ];
      break;
    case "OPENAI_API_KEY":
      raw = [
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_API_KEY_1,
        process.env.OPENAI_API_KEY_2,
        process.env.OPENAI_API_KEY_3,
        process.env.OPENAI_API_KEY_4,
        process.env.OPENAI_API_KEY_5,
        process.env.OPENAI_API_KEY_6,
        process.env.OPENAI_API_KEY_7,
        process.env.OPENAI_API_KEY_8,
        process.env.OPENAI_API_KEY_9,
        process.env.OPENAI_API_KEY_10,
      ];
      break;
    default: {
      const _exhaustive: never = prefix;
      throw new Error(`Unhandled key prefix: ${_exhaustive}`);
    }
  }
  return raw.filter((k): k is string => Boolean(k));
}

class KeyManager {
  private keys: string[] = [];
  private currentIndex: number = 0;

  constructor(prefix: EnvKeyPrefix) {
    this.keys = keysFromEnvPrefix(prefix);
  }

  getNextKey(): string | null {
    if (this.keys.length === 0) return null;
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return key;
  }

  hasKeys(): boolean {
    return this.keys.length > 0;
  }
}

class AIService {
  private geminiKeys: KeyManager;
  private grokKeys: KeyManager;
  private groqKeys: KeyManager;
  private openaiKeys: KeyManager;

  constructor() {
    this.geminiKeys = new KeyManager("GEMINI_API_KEY");
    this.grokKeys = new KeyManager("GROK_API_KEY");
    this.groqKeys = new KeyManager("GROQ_API_KEY");
    this.openaiKeys = new KeyManager("OPENAI_API_KEY");
  }

  async generateContent(
    prompt: string | any[],
    options: AIRequestOptions = {},
    preferredProvider: AIProvider = "auto",
    history: AIMessage[] = []
  ): Promise<AIResponse> {
    if (preferredProvider === "auto") {
      const availableProviders: Promise<AIResponse>[] = [];

      if (this.geminiKeys.hasKeys()) {
        availableProviders.push(this.callGemini(prompt, options, history));
      }
      if (this.grokKeys.hasKeys()) {
        availableProviders.push(this.callGrok(prompt, options, history));
      }
      if (this.groqKeys.hasKeys()) {
        availableProviders.push(this.callGroq(prompt, options, history));
      }
      if (this.openaiKeys.hasKeys()) {
        availableProviders.push(this.callOpenAI(prompt, options, history));
      }

      if (availableProviders.length === 0) {
        throw new Error(
          "No AI providers available. Set at least one of GEMINI_API_KEY, GROK_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in a .env file in the project root (see .env.example), then restart the dev server."
        );
      }

      try {
        return await Promise.any(availableProviders);
      } catch (err: any) {
        console.error("All AI providers failed in auto mode:", err);
        throw new Error("All AI providers failed to respond.");
      }
    }

    const providers: Exclude<AIProvider, "auto">[] = [
      preferredProvider as any,
      "gemini",
      "grok",
      "groq",
      "openai",
    ];
    const uniqueProviders = Array.from(new Set(providers));

    let lastError: Error | null = null;

    for (const provider of uniqueProviders) {
      try {
        if (provider === "gemini" && this.geminiKeys.hasKeys()) {
          return await this.callGemini(prompt, options, history);
        }
        if (provider === "grok" && this.grokKeys.hasKeys()) {
          return await this.callGrok(prompt, options, history);
        }
        if (provider === "groq" && this.groqKeys.hasKeys()) {
          return await this.callGroq(prompt, options, history);
        }
        if (provider === "openai" && this.openaiKeys.hasKeys()) {
          return await this.callOpenAI(prompt, options, history);
        }
      } catch (err: any) {
        console.error(`AI Provider ${provider} failed:`, err);
        lastError = err;
        continue;
      }
    }

    throw lastError || new Error("No AI providers available or all failed.");
  }

  private async callGemini(prompt: string | any[], options: AIRequestOptions, history: AIMessage[]): Promise<AIResponse> {
    const apiKey = this.geminiKeys.getNextKey();
    if (!apiKey) throw new Error("Gemini API Key not configured");

    const genAI = new GoogleGenAI({ apiKey });
    const modelName = options.model || "gemini-3-flash-preview";

    if (history.length > 0) {
      const chat = genAI.chats.create({
        model: modelName,
        config: {
          systemInstruction: options.systemInstruction,
          responseMimeType: options.responseMimeType as any,
          responseSchema: options.responseSchema,
          maxOutputTokens: options.maxOutputTokens,
        },
        history: history.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: Array.isArray(msg.content) ? msg.content : [{ text: msg.content as string }],
        })),
      });

      const response = await chat.sendMessage({
        message: prompt as any,
      });

      return {
        text: response.text || "",
        provider: "gemini",
      };
    }

    const response = await genAI.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: typeof prompt === "string" ? [{ text: prompt }] : prompt,
        },
      ],
      config: {
        systemInstruction: options.systemInstruction,
        responseMimeType: options.responseMimeType as any,
        responseSchema: options.responseSchema,
        maxOutputTokens: options.maxOutputTokens,
      },
    });

    return {
      text: response.text || "",
      provider: "gemini",
    };
  }

  private async callGrok(prompt: string | any[], options: AIRequestOptions, history: AIMessage[]): Promise<AIResponse> {
    const apiKey = this.grokKeys.getNextKey();
    if (!apiKey) throw new Error("Grok API Key not configured");

    return this.callOpenAICompatible(
      "https://api.x.ai/v1/chat/completions",
      apiKey,
      options.model || "grok-beta",
      prompt,
      options,
      "grok",
      history
    );
  }

  private async callGroq(prompt: string | any[], options: AIRequestOptions, history: AIMessage[]): Promise<AIResponse> {
    const apiKey = this.groqKeys.getNextKey();
    if (!apiKey) throw new Error("Groq API Key not configured");

    return this.callOpenAICompatible(
      "https://api.groq.com/openai/v1/chat/completions",
      apiKey,
      options.model || "llama-3.3-70b-versatile",
      prompt,
      options,
      "groq",
      history
    );
  }

  private async callOpenAI(prompt: string | any[], options: AIRequestOptions, history: AIMessage[]): Promise<AIResponse> {
    const apiKey = this.openaiKeys.getNextKey();
    if (!apiKey) throw new Error("OpenAI API Key not configured");

    return this.callOpenAICompatible(
      "https://api.openai.com/v1/chat/completions",
      apiKey,
      options.model || "gpt-4o-mini",
      prompt,
      options,
      "openai",
      history
    );
  }

  private async callOpenAICompatible(
    url: string,
    apiKey: string,
    model: string,
    prompt: string | any[],
    options: AIRequestOptions,
    provider: Exclude<AIProvider, "auto">,
    history: AIMessage[]
  ): Promise<AIResponse> {
    const messages: any[] = [];

    if (options.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }

    for (const msg of history) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }

    if (typeof prompt === "string") {
      messages.push({ role: "user", content: prompt });
    } else {
      const contentParts = prompt
        .map((part: any) => {
          if (part.text) return { type: "text", text: part.text };
          if (part.inlineData) {
            return {
              type: "image_url",
              image_url: {
                url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
              },
            };
          }
          return null;
        })
        .filter(Boolean);
      messages.push({ role: "user", content: contentParts });
    }

    const body: any = {
      model,
      messages,
      max_tokens: options.maxOutputTokens,
    };

    if (options.responseMimeType === "application/json") {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`${provider} API error: ${response.status} ${JSON.stringify(errData)}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content || "",
      provider,
    };
  }
}

export const aiService = new AIService();
