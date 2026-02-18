import type { ToolName } from "@/lib/types";

export interface GeminiFunctionDeclaration {
  name: ToolName;
  description: string;
  parameters: {
    type: "OBJECT";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const MAX_TOOL_CALLS_PER_TURN = 3;

export const GEMINI_TOOL_DECLARATIONS: GeminiFunctionDeclaration[] = [
  {
    name: "scroll_by",
    description:
      "Scroll the page vertically by a pixel amount. Positive delta scrolls down, negative scrolls up.",
    parameters: {
      type: "OBJECT",
      properties: {
        delta: {
          type: "NUMBER",
          description:
            "Vertical scroll offset in pixels. Positive means down and negative means up.",
        },
      },
      required: ["delta"],
    },
  },
  {
    name: "navigate_to_section",
    description:
      "Navigate to a section by section ID or alias, such as home, about, projects, skills, or contact.",
    parameters: {
      type: "OBJECT",
      properties: {
        sectionId: {
          type: "STRING",
          description:
            "Target section id without # when possible, for example projects or contact.",
        },
      },
      required: ["sectionId"],
    },
  },
  {
    name: "click_element",
    description:
      "Click a button or link on the page by CSS selector or visible text.",
    parameters: {
      type: "OBJECT",
      properties: {
        selector: {
          type: "STRING",
          description:
            "A CSS selector for the element to click. Prefer this when available.",
        },
        text: {
          type: "STRING",
          description:
            "Visible element text to match when selector is not reliable.",
        },
      },
    },
  },
  {
    name: "highlight_element",
    description:
      "Highlight an element so the user can visually locate it, using selector, text, section, or project hints.",
    parameters: {
      type: "OBJECT",
      properties: {
        selector: {
          type: "STRING",
          description: "A CSS selector for the element to highlight.",
        },
        text: {
          type: "STRING",
          description:
            "Visible text to match if selector is unavailable or uncertain.",
        },
      },
    },
  },
  {
    name: "fill_input",
    description:
      "Fill one or more text fields. Use selector+value+fieldName for single input or values object for multi-field input.",
    parameters: {
      type: "OBJECT",
      properties: {
        selector: {
          type: "STRING",
          description: "A CSS selector for the target input field.",
        },
        fieldName: {
          type: "STRING",
          description:
            "Form field identifier such as name, email, subject, or message.",
        },
        value: {
          type: "STRING",
          description: "The text value that should be entered into the field.",
        },
        values: {
          type: "OBJECT",
          description:
            "Optional batch input object. Use known keys like name, email, subject, and message.",
          properties: {
            name: {
              type: "STRING",
              description: "Name field value.",
            },
            email: {
              type: "STRING",
              description: "Email field value.",
            },
            subject: {
              type: "STRING",
              description: "Subject field value.",
            },
            message: {
              type: "STRING",
              description: "Message field value.",
            },
          },
        },
      },
      required: [],
    },
  },
];
