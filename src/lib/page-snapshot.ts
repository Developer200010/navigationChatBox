import type { ElementData, PageSnapshot, SectionData } from "@/lib/types";

const MAX_SECTIONS = 12;
const MAX_ELEMENTS = 160;
const MAX_TEXT = 260;

function normalizeText(value: string, maxLength = MAX_TEXT): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 3)}...`;
}

function escapeAttribute(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeCssIdentifier(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function isVisible(element: Element): boolean {
  const htmlElement = element as HTMLElement;
  const style = window.getComputedStyle(htmlElement);
  const rect = htmlElement.getBoundingClientRect();

  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function buildSelector(element: Element): string {
  const htmlElement = element as HTMLElement;
  const tag = htmlElement.tagName.toLowerCase();

  if (htmlElement.id) {
    return `#${escapeCssIdentifier(htmlElement.id)}`;
  }

  const name = htmlElement.getAttribute("name");
  if (name) {
    const byName = `${tag}[name="${escapeAttribute(name)}"]`;
    if (document.querySelectorAll(byName).length === 1) {
      return byName;
    }
  }

  const href = htmlElement.getAttribute("href");
  if (href && tag === "a") {
    const byHref = `a[href="${escapeAttribute(href)}"]`;
    if (document.querySelectorAll(byHref).length === 1) {
      return byHref;
    }
  }

  const path: string[] = [];
  let current: Element | null = htmlElement;

  while (current && path.length < 4 && current !== document.body) {
    const nodeTag = current.tagName.toLowerCase();
    const currentId = (current as HTMLElement).id;

    if (currentId) {
      path.unshift(`#${escapeCssIdentifier(currentId)}`);
      break;
    }

    const parentElement: Element | null = current.parentElement;
    if (!parentElement) {
      path.unshift(nodeTag);
      break;
    }

    const siblings = Array.from(parentElement.children).filter(
      (sibling) => sibling.tagName === current?.tagName
    );
    const nth = siblings.indexOf(current) + 1;
    path.unshift(`${nodeTag}:nth-of-type(${nth})`);
    current = parentElement;
  }

  return path.join(" > ");
}

function collectSections(root: ParentNode): SectionData[] {
  const sectionNodes = Array.from(
    root.querySelectorAll<HTMLElement>("section[id]")
  ).filter(isVisible);

  return sectionNodes.slice(0, MAX_SECTIONS).map((section) => {
    const heading =
      section.querySelector("h1, h2, h3")?.textContent ?? section.id;
    const textPreview =
      section.dataset.summary ?? section.textContent ?? section.id;

    return {
      id: section.id,
      heading: normalizeText(heading, 80),
      textPreview: normalizeText(textPreview),
    };
  });
}

function collectElements(root: ParentNode): ElementData[] {
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>(
      "section[id], [data-project-card], a[href], button, input, textarea, select, [role='button']"
    )
  ).filter(isVisible);

  return nodes.slice(0, MAX_ELEMENTS).map((element) => {
    const sectionId = element.closest("section[id]")?.id ?? "";
    const textSource = [
      element.textContent,
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("data-project-title"),
      element.getAttribute("data-section"),
    ]
      .filter((item): item is string => Boolean(item))
      .join(" ");

    return {
      selector: buildSelector(element),
      tag: element.tagName.toLowerCase(),
      text: normalizeText(textSource, 120),
      ariaLabel: normalizeText(element.getAttribute("aria-label") ?? "", 80),
      href: normalizeText(element.getAttribute("href") ?? "", 120),
      inputName: normalizeText(
        element.getAttribute("name") ??
          element.getAttribute("id") ??
          element.getAttribute("placeholder") ??
          "",
        80
      ),
      inputType: normalizeText(element.getAttribute("type") ?? "", 40),
      sectionId,
    };
  });
}

export function extractPageSnapshot(): PageSnapshot {
  const root =
    document.querySelector<HTMLElement>("[data-portfolio-root]") ??
    document.body;

  return {
    url: window.location.href,
    title: document.title,
    capturedAt: new Date().toISOString(),
    sections: collectSections(root),
    elements: collectElements(root),
  };
}
