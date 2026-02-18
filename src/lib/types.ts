export type ChatRole = "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface SectionData {
  id: string;
  heading: string;
  textPreview: string;
}

export interface ElementData {
  selector: string;
  tag: string;
  text: string;
  ariaLabel: string;
  href: string;
  inputName: string;
  inputType: string;
  sectionId: string;
}

export interface PageSnapshot {
  url: string;
  title: string;
  capturedAt: string;
  sections: SectionData[];
  elements: ElementData[];
}

export type ToolName =
  | "scroll_by"
  | "navigate_to_section"
  | "click_element"
  | "highlight_element"
  | "fill_input";

export interface ToolCall {
  id: string;
  name: ToolName;
  args: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: ToolName;
  success: boolean;
  output: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  pageSnapshot: PageSnapshot;
  toolResults?: ToolResult[];
}

export interface ChatResponse {
  assistantMessage: string;
  toolCalls?: ToolCall[];
  awaitingToolResults: boolean;
}
