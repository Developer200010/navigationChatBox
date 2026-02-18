import type { ToolCall, ToolResult } from "@/lib/types";

const HIGHLIGHT_CLASS = "co-highlight-pulse";
const CHAT_UI_SELECTOR = "[data-chat-ui='true']";

const SECTION_ALIASES: Record<string, string[]> = {
  hero: ["hero", "home", "top", "intro", "landing"],
  about: ["about", "bio", "background", "profile"],
  projects: ["projects", "portfolio", "work", "case studies", "case-study"],
  skills: ["skills", "tech", "stack", "expertise"],
  contact: ["contact", "hire", "email", "reach", "message"],
};

const ORDINAL_TO_INDEX: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function readString(
  args: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readNumber(
  args: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function safeQuery(selector: string): HTMLElement | null {
  try {
    return document.querySelector<HTMLElement>(selector);
  } catch {
    return null;
  }
}

function isInsideChatUi(element: HTMLElement): boolean {
  return Boolean(element.closest(CHAT_UI_SELECTOR));
}

function addHighlight(element: HTMLElement): void {
  element.classList.add(HIGHLIGHT_CLASS);
  window.setTimeout(() => {
    element.classList.remove(HIGHLIGHT_CLASS);
  }, 2600);
}

function describeElement(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const trimmed = text ? ` \"${text.slice(0, 44)}\"` : "";
  return `<${tag}>${trimmed}`;
}

function parseOrdinal(hint: string): number | null {
  const normalizedHint = normalize(hint);

  for (const [word, index] of Object.entries(ORDINAL_TO_INDEX)) {
    if (normalizedHint.includes(word)) {
      return index;
    }
  }

  const numericMatch = normalizedHint.match(/\b(\d+)\b/);
  if (numericMatch) {
    const value = Number(numericMatch[1]);
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

function resolveSectionFromHint(hint: string): HTMLElement | null {
  const normalizedHint = normalize(hint).replace(/^#/, "");
  if (!normalizedHint) {
    return null;
  }

  const directById = document.getElementById(normalizedHint);
  if (directById) {
    return directById;
  }

  for (const [id, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.some((alias) => normalizedHint.includes(alias))) {
      const candidate = document.getElementById(id);
      if (candidate) {
        return candidate;
      }
    }
  }

  const sectionCandidates = Array.from(
    document.querySelectorAll<HTMLElement>("section[id]")
  ).filter((section) => {
    const heading = section.querySelector("h1, h2, h3")?.textContent ?? "";
    return normalize(`${section.id} ${heading}`).includes(normalizedHint);
  });

  return sectionCandidates[0] ?? null;
}

function findProjectCardByHint(hint: string): HTMLElement | null {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>("[data-project-card]")
  );
  if (cards.length === 0) {
    return null;
  }

  const normalizedHint = normalize(hint);

  if (
    normalizedHint.includes("most recent") ||
    normalizedHint.includes("latest") ||
    normalizedHint.includes("newest")
  ) {
    const latest = cards.find((card) => card.dataset.projectOrder === "1");
    return latest ?? cards[0];
  }

  const ordinal = parseOrdinal(normalizedHint);
  if (ordinal && ordinal >= 1 && ordinal <= cards.length) {
    const byOrder = cards.find(
      (card) => Number(card.dataset.projectOrder) === ordinal
    );
    return byOrder ?? cards[ordinal - 1] ?? null;
  }

  const byTitle = cards.find((card) => {
    const title = card.dataset.projectTitle ?? card.textContent ?? "";
    return normalize(title).includes(normalizedHint);
  });

  return byTitle ?? null;
}

function findByText(text: string): HTMLElement | null {
  const target = normalize(text);
  if (!target) {
    return null;
  }

  const query =
    "section[id], [data-project-card], a, button, input, textarea, select, h1, h2, h3, p, li";

  const ranked = Array.from(document.querySelectorAll<HTMLElement>(query))
    .filter((element) => !isInsideChatUi(element))
    .map((element) => {
      const content = normalize(
        `${element.textContent ?? ""} ${element.getAttribute("aria-label") ?? ""} ${
          element.getAttribute("placeholder") ?? ""
        } ${element.getAttribute("data-project-title") ?? ""}`
      );

      const index = content.indexOf(target);
      const score = index === -1 ? Number.POSITIVE_INFINITY : index + content.length;

      return { element, score };
    })
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => a.score - b.score);

  return ranked[0]?.element ?? null;
}

function findInputByFieldName(fieldName: string): HTMLElement | null {
  const normalizedField = normalize(fieldName);
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("input, textarea")
  );

  for (const candidate of candidates) {
    if (isInsideChatUi(candidate)) {
      continue;
    }

    const attrs = [
      candidate.getAttribute("name"),
      candidate.getAttribute("id"),
      candidate.getAttribute("placeholder"),
      candidate.getAttribute("aria-label"),
    ]
      .filter((item): item is string => Boolean(item))
      .map((item) => normalize(item));

    if (attrs.some((attr) => attr.includes(normalizedField))) {
      return candidate;
    }
  }

  return null;
}

function findElement(args: Record<string, unknown>): HTMLElement | null {
  const sectionHint = readString(args, "sectionId", "section", "targetSection");
  if (sectionHint) {
    const section = resolveSectionFromHint(sectionHint);
    if (section) {
      return section;
    }
  }

  const selector = readString(args, "selector");
  if (selector) {
    const bySelector = safeQuery(selector);
    if (bySelector && !isInsideChatUi(bySelector)) {
      return bySelector;
    }
  }

  const textHint = readString(args, "text", "label", "target", "projectName");
  if (textHint) {
    const projectCard = findProjectCardByHint(textHint);
    if (projectCard) {
      return projectCard;
    }

    const section = resolveSectionFromHint(textHint);
    if (section) {
      return section;
    }

    const byText = findByText(textHint);
    if (byText) {
      return byText;
    }
  }

  return null;
}

function setFieldValue(element: HTMLElement, value: string): void {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const descriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      "value"
    );

    if (descriptor?.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.focus();
  }
}

function result(call: ToolCall, success: boolean, output: string): ToolResult {
  return {
    toolCallId: call.id,
    name: call.name,
    success,
    output,
  };
}

function runScrollBy(call: ToolCall, args: Record<string, unknown>): ToolResult {
  const delta = readNumber(args, "delta", "amount");
  if (delta === null) {
    return result(call, false, "Missing numeric delta argument.");
  }

  window.scrollBy({ top: delta, behavior: "smooth" });
  return result(
    call,
    true,
    delta >= 0
      ? `Scrolled down by ${Math.round(delta)} pixels.`
      : `Scrolled up by ${Math.round(Math.abs(delta))} pixels.`
  );
}

function runNavigateToSection(
  call: ToolCall,
  args: Record<string, unknown>
): ToolResult {
  const sectionHint = readString(args, "sectionId", "section", "target");
  if (!sectionHint) {
    return result(call, false, "Missing target section id.");
  }

  const target = resolveSectionFromHint(sectionHint);
  if (!target) {
    return result(call, false, `Section \"${sectionHint}\" was not found.`);
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  if (target.id) {
    history.replaceState(null, "", `#${target.id}`);
  }
  addHighlight(target);

  return result(call, true, `Moved to section \"${target.id || sectionHint}\".`);
}

function chooseLinkFromProjectCard(
  card: HTMLElement,
  hint: string | null
): HTMLElement | null {
  const links = Array.from(card.querySelectorAll<HTMLElement>("a"));
  if (links.length === 0) {
    return null;
  }

  const normalizedHint = normalize(hint ?? "");
  if (normalizedHint.includes("github")) {
    return links.find((link) => normalize(link.textContent ?? "").includes("github")) ?? links[0];
  }

  if (
    normalizedHint.includes("live") ||
    normalizedHint.includes("demo") ||
    normalizedHint.includes("preview")
  ) {
    return links.find((link) => normalize(link.textContent ?? "").includes("live")) ?? links[0];
  }

  return links[0];
}

function runClickElement(call: ToolCall, args: Record<string, unknown>): ToolResult {
  let target = findElement(args);
  if (!target) {
    return result(call, false, "Could not find an element to click.");
  }

  const hint = readString(args, "text", "label", "target");

  if (target.matches("[data-project-card]")) {
    const projectLink = chooseLinkFromProjectCard(target, hint);
    if (projectLink) {
      target = projectLink;
    }
  }

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  addHighlight(target);

  if (target instanceof HTMLButtonElement && target.disabled) {
    return result(call, false, "Target button is disabled and cannot be clicked.");
  }

  if (target instanceof HTMLAnchorElement) {
    const href = target.getAttribute("href") ?? "";
    if (href.startsWith("#")) {
      const section = resolveSectionFromHint(href);
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        addHighlight(section);
        history.replaceState(null, "", href);
        return result(call, true, `Moved to ${href}.`);
      }
    }
  }

  target.click();
  return result(call, true, `Clicked ${describeElement(target)}.`);
}

function runHighlightElement(
  call: ToolCall,
  args: Record<string, unknown>
): ToolResult {
  const target = findElement(args);
  if (!target) {
    return result(call, false, "Could not find an element to highlight.");
  }

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  addHighlight(target);
  return result(call, true, `Highlighted ${describeElement(target)}.`);
}

function fillSingleField(
  call: ToolCall,
  fieldName: string,
  value: string,
  selector: string | null
): string {
  let target: HTMLElement | null = null;

  if (selector) {
    target = safeQuery(selector);
  }

  if (!target) {
    target = findInputByFieldName(fieldName);
  }

  if (!target) {
    throw new Error(`Could not find input field for \"${fieldName}\".`);
  }

  setFieldValue(target, value);
  addHighlight(target);
  return `${fieldName} updated`;
}

function runFillInput(call: ToolCall, args: Record<string, unknown>): ToolResult {
  const selector = readString(args, "selector");

  const values = args.values;
  if (isObject(values)) {
    const updates = Object.entries(values).filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" && typeof entry[1] === "string"
    );

    if (updates.length > 0) {
      const outputs: string[] = [];
      for (const [fieldName, value] of updates) {
        try {
          outputs.push(fillSingleField(call, fieldName, value, selector));
        } catch (error) {
          const text = error instanceof Error ? error.message : "Unknown field error.";
          return result(call, false, text);
        }
      }

      return result(call, true, `Filled ${outputs.length} field(s): ${outputs.join(", ")}.`);
    }
  }

  const value = readString(args, "value");
  if (!value) {
    return result(call, false, "Missing input value.");
  }

  const fieldName = readString(args, "fieldName", "name", "field") ?? "input";

  try {
    const output = fillSingleField(call, fieldName, value, selector);
    return result(call, true, `${output} with \"${value.slice(0, 80)}\".`);
  } catch (error) {
    const text = error instanceof Error ? error.message : "Could not fill input field.";
    return result(call, false, text);
  }
}

export function executeToolCall(call: ToolCall): ToolResult {
  if (!isObject(call.args)) {
    return result(call, false, "Invalid tool arguments.");
  }

  switch (call.name) {
    case "scroll_by":
      return runScrollBy(call, call.args);
    case "navigate_to_section":
      return runNavigateToSection(call, call.args);
    case "click_element":
      return runClickElement(call, call.args);
    case "highlight_element":
      return runHighlightElement(call, call.args);
    case "fill_input":
      return runFillInput(call, call.args);
    default:
      return result(call, false, `Unknown tool \"${call.name}\".`);
  }
}
