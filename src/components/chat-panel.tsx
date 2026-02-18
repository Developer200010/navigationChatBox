"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { extractPageSnapshot } from "@/lib/page-snapshot";
import { executeToolCall } from "@/lib/tool-runner";
import { MAX_TOOL_CALLS_PER_TURN } from "@/lib/tool-definitions";
import type { ChatMessage, ChatRequest, ChatResponse, ToolResult } from "@/lib/types";

const MAX_HISTORY = 18;
const MAX_FLOW_ITEMS = 10;

const QUICK_PROMPTS = [
  "What projects are showcased here?",
  "Go to the projects section and highlight the most recent one.",
  "Highlight the second project card.",
  "Fill contact form with name Alex and email alex@test.com.",
  "Take me to contact section.",
];

type FlowStatus = "running" | "success" | "failed";

interface FlowItem {
  id: string;
  label: string;
  detail: string;
  status: FlowStatus;
}

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function formatToolLabel(name: string): string {
  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function postChat(payload: ChatRequest): Promise<ChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const fallback = "I hit an error while talking to Gemini.";
    const text = await response.text();
    throw new Error(text || fallback);
  }

  return (await response.json()) as ChatResponse;
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l-4.3 3.8a.8.8 0 0 1-1.3-.6V17H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v9h5.1c.44 0 .8.36.8.8v2.52l3.28-2.92a.8.8 0 0 1 .53-.2H20V6H4Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.72 5.3 12 10.58l5.28-5.28a1 1 0 1 1 1.42 1.42L13.42 12l5.28 5.28a1 1 0 0 1-1.42 1.42L12 13.42 6.72 18.7a1 1 0 0 1-1.42-1.42L10.58 12 5.3 6.72A1 1 0 0 1 6.72 5.3Z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.36 3.27a1 1 0 0 1 1.05-.18l16.9 7.24a1 1 0 0 1 0 1.84l-16.9 7.24a1 1 0 0 1-1.4-1.1l1.42-5.84c.03-.1.03-.2 0-.3L2 6.33a1 1 0 0 1 1.36-1.06Zm2 4.11.98 4.02h6.4a1 1 0 0 1 0 2h-6.4l-.98 4.02L18.4 11.25 5.35 7.38Z" />
    </svg>
  );
}

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "assistant",
      "I can navigate this portfolio for you. Ask me to jump sections, highlight projects, click links, or fill the contact form."
    ),
  ]);
  const [draft, setDraft] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [flowItems, setFlowItems] = useState<FlowItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const messageListRef = useRef<HTMLOListElement | null>(null);
  const previousMessageCountRef = useRef(messages.length);

  const statusText = useMemo(() => {
    return isBusy ? "Running your request..." : "Ready";
  }, [isBusy]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const list = messageListRef.current;
    if (!list) {
      return;
    }

    list.scrollTo({
      top: list.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isOpen]);

  useEffect(() => {
    const previousCount = previousMessageCountRef.current;
    if (messages.length > previousCount && !isOpen) {
      const fresh = messages.slice(previousCount).filter((item) => item.role !== "user");
      if (fresh.length > 0) {
        setUnreadCount((value) => Math.min(9, value + fresh.length));
      }
    }
    previousMessageCountRef.current = messages.length;
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((value) => !value);
      }

      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function runConversation(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || isBusy) {
      return;
    }

    setIsOpen(true);
    setDraft("");
    setIsBusy(true);

    const userMessage = createMessage("user", message);
    let history = [...messages, userMessage].slice(-MAX_HISTORY);
    setMessages(history);

    try {
      const firstReply = await postChat({
        message,
        history,
        pageSnapshot: extractPageSnapshot(),
      });

      if (firstReply.assistantMessage.trim()) {
        const planningMessage = createMessage("assistant", firstReply.assistantMessage);
        history = [...history, planningMessage].slice(-MAX_HISTORY);
        setMessages(history);
      }

      const toolCalls = firstReply.toolCalls?.slice(0, MAX_TOOL_CALLS_PER_TURN) ?? [];
      if (firstReply.awaitingToolResults && toolCalls.length > 0) {
        const toolResults: ToolResult[] = [];

        for (const call of toolCalls) {
          setFlowItems((previous) =>
            [
              ...previous,
              {
                id: call.id,
                label: formatToolLabel(call.name),
                detail: "Executing action...",
                status: "running" as FlowStatus,
              },
            ].slice(-MAX_FLOW_ITEMS) as FlowItem[]
          );

          await delay(140);
          const result = executeToolCall(call);
          toolResults.push(result);

          setFlowItems((previous) =>
            previous.map((item) => {
              if (item.id !== call.id) {
                return item;
              }

              return {
                ...item,
                detail: result.output,
                status: (result.success ? "success" : "failed") as FlowStatus,
              };
            })
          );

          const toolMessage = createMessage("tool", `${result.name}: ${result.output}`);
          history = [...history, toolMessage].slice(-MAX_HISTORY);
          setMessages(history);

          await delay(200);
        }

        const finalReply = await postChat({
          message,
          history,
          pageSnapshot: extractPageSnapshot(),
          toolResults,
        });

        const finalMessage = createMessage(
          "assistant",
          finalReply.assistantMessage.trim() || "Action completed."
        );
        history = [...history, finalMessage].slice(-MAX_HISTORY);
        setMessages(history);
      } else if (!firstReply.assistantMessage.trim()) {
        const fallbackMessage = createMessage(
          "assistant",
          "I could not generate a response. Please rephrase your request."
        );
        history = [...history, fallbackMessage].slice(-MAX_HISTORY);
        setMessages(history);
      }
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Unexpected error while processing the request.";

      setMessages((previous) =>
        [
          ...previous,
          createMessage("assistant", `I couldn't complete that request. ${text}`),
        ].slice(-MAX_HISTORY)
      );
    } finally {
      setIsBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runConversation(draft);
  }

  return (
    <div className="chat-shell" data-chat-ui="true">
      <button
        type="button"
        className="chat-launcher"
        onClick={() => setIsOpen(true)}
        aria-label="Open assistant chat"
      >
        <span className="launcher-icon" aria-hidden="true">
          <ChatIcon />
        </span>
        <span className="launcher-copy">
          <strong>Assistant</strong>
          <small>Chat + Co-Browse</small>
        </span>
        {unreadCount > 0 ? <span className="launcher-badge">{unreadCount}</span> : null}
      </button>

      <aside
        className={`chat-panel ${isOpen ? "open" : ""}`}
        aria-hidden={!isOpen}
        aria-label="AI co-browsing chat panel"
      >
        <header className="chat-header">
          <div>
            <p className="eyebrow">Co-Browsing Agent</p>
            <h2>Portfolio Command Center</h2>
            <p className="chat-status" aria-live="polite">
              {statusText}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat panel"
          >
            <CloseIcon />
          </button>
        </header>

        <section className="quick-actions" aria-label="Quick prompts">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="quick-chip"
              onClick={() => void runConversation(prompt)}
              disabled={isBusy}
            >
              {prompt}
            </button>
          ))}
        </section>

        <section className="flow-board" aria-live="polite">
          <div className="flow-board-header">
            <h3>Action Flow</h3>
            <p>{flowItems.length === 0 ? "No actions yet" : "Live execution timeline"}</p>
          </div>
          {flowItems.length === 0 ? (
            <p className="flow-empty">Tool calls will appear here as they run.</p>
          ) : (
            <ol>
              {flowItems.map((item) => (
                <li key={item.id} className={`flow-item ${item.status}`}>
                  <div>
                    <p className="flow-label">{item.label}</p>
                    <p className="flow-detail">{item.detail}</p>
                  </div>
                  <span className="flow-state" aria-label={item.status} />
                </li>
              ))}
            </ol>
          )}
        </section>

        <ol className="message-list" aria-live="polite" ref={messageListRef}>
          {messages.map((messageItem, index) => (
            <li
              key={`${messageItem.createdAt}-${index}`}
              className={`message ${messageItem.role}`}
            >
              <p className="message-role">{messageItem.role}</p>
              <p>{messageItem.content}</p>
            </li>
          ))}
          {isBusy ? (
            <li className="message assistant typing">
              <p className="message-role">assistant</p>
              <p className="typing-indicator">
                <span />
                <span />
                <span />
              </p>
            </li>
          ) : null}
        </ol>

        <form className="chat-form" onSubmit={handleSubmit}>
          <label htmlFor="chat-input">Ask anything or issue a page command</label>
          <textarea
            id="chat-input"
            name="chat-input"
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Example: Open projects, highlight the latest one, then take me to contact."
            disabled={isBusy}
          />
          <div className="form-row">
            <p className="key-hint">Press Ctrl+K to toggle chat</p>
            <button type="submit" disabled={isBusy || !draft.trim()}>
              <SendIcon />
              <span>{isBusy ? "Working..." : "Send"}</span>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
