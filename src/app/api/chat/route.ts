import { NextRequest, NextResponse } from "next/server";
import {
  GEMINI_TOOL_DECLARATIONS,
  MAX_TOOL_CALLS_PER_TURN,
} from "@/lib/tool-definitions";
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  PageSnapshot,
  ToolCall,
  ToolName,
  ToolResult,
} from "@/lib/types";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const HISTORY_WINDOW = 10;

interface GeminiFunctionCall {
  name?: string;
  args?: unknown;
}

interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

const TOOL_NAMES: ToolName[] = [
  "scroll_by",
  "navigate_to_section",
  "click_element",
  "highlight_element",
  "fill_input",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item): item is ChatMessage => {
      return (
        isRecord(item) &&
        typeof item.role === "string" &&
        typeof item.content === "string" &&
        typeof item.createdAt === "string"
      );
    })
    .slice(-HISTORY_WINDOW)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 1200),
      createdAt: message.createdAt,
    }));
}

function toToolResults(toolResults: unknown): ToolResult[] {
  if (!Array.isArray(toolResults)) {
    return [];
  }

  return toolResults
    .filter((item): item is ToolResult => {
      return (
        isRecord(item) &&
        typeof item.toolCallId === "string" &&
        typeof item.name === "string" &&
        typeof item.success === "boolean" &&
        typeof item.output === "string"
      );
    })
    .slice(0, MAX_TOOL_CALLS_PER_TURN);
}

function isPageSnapshot(snapshot: unknown): snapshot is PageSnapshot {
  if (!isRecord(snapshot)) {
    return false;
  }

  return (
    typeof snapshot.url === "string" &&
    typeof snapshot.title === "string" &&
    typeof snapshot.capturedAt === "string" &&
    Array.isArray(snapshot.sections) &&
    Array.isArray(snapshot.elements)
  );
}

function slimSnapshot(snapshot: PageSnapshot): Record<string, unknown> {
  return {
    url: snapshot.url,
    title: snapshot.title,
    capturedAt: snapshot.capturedAt,
    sections: snapshot.sections.slice(0, 10),
    elements: snapshot.elements.slice(0, 80),
  };
}

function historyToText(history: ChatMessage[]): string {
  if (history.length === 0) {
    return "No previous conversation.";
  }

  return history
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
}

function parseFunctionArgs(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

function parseGeminiParts(response: GeminiResponse): GeminiPart[] {
  return response.candidates?.[0]?.content?.parts ?? [];
}

function extractText(parts: GeminiPart[]): string {
  return parts
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

function extractToolCalls(parts: GeminiPart[]): ToolCall[] {
  const calls: ToolCall[] = [];

  for (const part of parts) {
    const maybeCall = part.functionCall;
    if (!maybeCall || typeof maybeCall.name !== "string") {
      continue;
    }

    const toolName = maybeCall.name as ToolName;
    if (!TOOL_NAMES.includes(toolName)) {
      continue;
    }

    calls.push({
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${calls.length}`,
      name: toolName,
      args: parseFunctionArgs(maybeCall.args),
    });
  }

  return calls.slice(0, MAX_TOOL_CALLS_PER_TURN);
}

async function callGemini(
  apiKey: string,
  payload: Record<string, unknown>
): Promise<GeminiResponse> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Gemini API request failed.");
  }

  return (await response.json()) as GeminiResponse;
}

function normalizeServerErrorMessage(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();

  if (
    rawMessage.includes('"code": 429') ||
    lower.includes("quota exceeded") ||
    lower.includes("rate-limits")
  ) {
    return "Gemini key is configured, but quota is exhausted. Enable billing or create a new key with available quota in Google AI Studio.";
  }

  if (rawMessage.includes('"code": 401') || lower.includes("api key not valid")) {
    return "Gemini API key is invalid. Update GEMINI_API_KEY in .env.local and redeploy.";
  }

  if (rawMessage.includes('"code": 404') || lower.includes("not found")) {
    return "Configured Gemini model is unavailable. Set GEMINI_MODEL to a valid model from ListModels.";
  }

  return rawMessage;
}

function buildPlanningPrompt(
  message: string,
  history: ChatMessage[],
  snapshot: PageSnapshot
): string {
  return [
    "You are an AI co-browsing assistant for a portfolio website.",
    "Use the provided page snapshot to answer questions and decide tool calls.",
    "If user intent is ambiguous, ask a clarifying question instead of calling a tool.",
    `You may call at most ${MAX_TOOL_CALLS_PER_TURN} tools in one turn.`,
    "For section navigation requests, prefer navigate_to_section with section aliases.",
    "For project requests like latest/most recent/second project, use highlight_element or click_element with text hints.",
    "For contact form requests with multiple fields, prefer one fill_input call using values object.",
    "Do not invent sections or elements that do not exist in the snapshot.",
    "",
    "Conversation history:",
    historyToText(history),
    "",
    `Latest user message: ${message}`,
    "",
    "Current page snapshot (JSON):",
    JSON.stringify(slimSnapshot(snapshot), null, 2),
    "",
    "First decide: answer directly OR call tools if an action is requested.",
  ].join("\n");
}

function buildFinalPrompt(
  message: string,
  history: ChatMessage[],
  snapshot: PageSnapshot,
  toolResults: ToolResult[]
): string {
  return [
    "You are an AI co-browsing assistant for a portfolio website.",
    "You already requested tools and now have execution results.",
    "Write the final assistant response for the user.",
    "Explain what was done and whether it succeeded.",
    "If a tool failed, provide one concrete recovery suggestion.",
    "If all tools succeeded, mention the final on-page state the user should now see.",
    "Keep the answer concise and conversational.",
    "",
    "Conversation history:",
    historyToText(history),
    "",
    `Latest user message: ${message}`,
    "",
    "Tool execution results (JSON):",
    JSON.stringify(toolResults, null, 2),
    "",
    "Updated page snapshot (JSON):",
    JSON.stringify(slimSnapshot(snapshot), null, 2),
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          assistantMessage:
            "Server configuration is missing GEMINI_API_KEY in environment variables.",
          awaitingToolResults: false,
        } satisfies ChatResponse,
        { status: 500 }
      );
    }

    const body = (await request.json()) as Partial<ChatRequest>;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = toHistory(body.history);
    const toolResults = toToolResults(body.toolResults);

    if (!message) {
      return NextResponse.json(
        {
          assistantMessage: "Missing user message.",
          awaitingToolResults: false,
        } satisfies ChatResponse,
        { status: 400 }
      );
    }

    if (!isPageSnapshot(body.pageSnapshot)) {
      return NextResponse.json(
        {
          assistantMessage: "Missing or invalid page snapshot.",
          awaitingToolResults: false,
        } satisfies ChatResponse,
        { status: 400 }
      );
    }

    const snapshot = body.pageSnapshot;

    if (toolResults.length > 0) {
      const finalPrompt = buildFinalPrompt(message, history, snapshot, toolResults);
      const finalResponse = await callGemini(apiKey, {
        contents: [
          {
            role: "user",
            parts: [{ text: finalPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
        },
      });

      const finalText =
        extractText(parseGeminiParts(finalResponse)) ||
        "I completed the requested action.";

      return NextResponse.json({
        assistantMessage: finalText,
        awaitingToolResults: false,
      } satisfies ChatResponse);
    }

    const planningPrompt = buildPlanningPrompt(message, history, snapshot);
    const planningResponse = await callGemini(apiKey, {
      contents: [
        {
          role: "user",
          parts: [{ text: planningPrompt }],
        },
      ],
      tools: [
        {
          functionDeclarations: GEMINI_TOOL_DECLARATIONS,
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    });

    const parts = parseGeminiParts(planningResponse);
    const assistantText = extractText(parts);
    const toolCalls = extractToolCalls(parts);

    return NextResponse.json({
      assistantMessage:
        assistantText || (toolCalls.length > 0 ? "I will handle that now." : ""),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      awaitingToolResults: toolCalls.length > 0,
    } satisfies ChatResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    const normalizedMessage = normalizeServerErrorMessage(message);

    return NextResponse.json(
      {
        assistantMessage: `I ran into an error: ${normalizedMessage}`,
        awaitingToolResults: false,
      } satisfies ChatResponse,
      { status: 500 }
    );
  }
}
