import { describe, expect, it } from "vitest";
import { render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "../i18n";
import { BigButton } from "./BigButton";
import { ConsentSheet } from "./ConsentSheet";
import { FilterTabs } from "./FilterTabs";
import { NumberPad } from "./NumberPad";
import { ToggleGroup } from "./ToggleGroup";

// Axe's button-name rule (mirrored by Lighthouse Accessibility): every
// <button> must expose a non-empty accessible name, including icon-only
// controls (sheet close, mic, steppers) whose name comes from aria-label.
describe("button accessible names", () => {
  it("every button in the shared family has a non-empty name", () => {
    const { container } = render(
      <MemoryRouter>
        <BigButton>Save patient</BigButton>
        <BigButton variant="danger">Delete</BigButton>
        <BigButton variant="ghost">Cancel</BigButton>
        <ToggleGroup
          label="Sex"
          value="F"
          onChange={() => undefined}
          options={[
            { value: "F", label: "Female" },
            { value: "M", label: "Male" }
          ]}
        />
        <ToggleGroup
          pill
          label="Language"
          value="en"
          onChange={() => undefined}
          options={[
            { value: "en", label: "English" },
            { value: "hi", label: "हिन्दी" }
          ]}
        />
        <FilterTabs
          label="Filter follow-ups"
          value="today"
          onChange={() => undefined}
          options={[
            { key: "today", label: "Today", count: 1 },
            { key: "all", label: "All", count: 2 }
          ]}
        />
        <NumberPad value="" onChange={() => undefined} label="Systolic (top number)" id="systolic" />
        <ConsentSheet open checked={false} onCheck={() => undefined} onClose={() => undefined} onSave={() => undefined} />
      </MemoryRouter>
    );
    const buttons = within(container).getAllByRole("button");
    // BigButton x3 + sex x2 + lang x2 + filters x2 + numpad x11 + sheet close/save.
    expect(buttons.length).toBeGreaterThan(10);
    for (const b of buttons) {
      const name = b.getAttribute("aria-label") ?? b.textContent ?? "";
      expect(name.trim().length).toBeGreaterThan(0);
    }
  });
});
