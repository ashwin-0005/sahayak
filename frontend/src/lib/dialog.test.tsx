import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import "../i18n";
import { useDialog } from "./dialog";
import { NumberPad } from "../components/NumberPad";

function DialogHarness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, open, () => {
    setOpen(false);
    onClose();
  });
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        open it
      </button>
      {open ? (
        <div ref={ref} role="alertdialog" aria-modal="true" aria-label="Confirm">
          <button type="button">cancel</button>
          <button type="button" data-autofocus>
            confirm
          </button>
        </div>
      ) : null}
    </div>
  );
}

describe("useDialog", () => {
  it("moves focus to [data-autofocus], traps Tab, and closes on Escape with focus restored", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DialogHarness onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "open it" }));
    // Initial focus lands on the marked control, not the first button.
    expect(screen.getByRole("button", { name: "confirm" })).toHaveFocus();

    // Shift+Tab from first wraps to last (trap).
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", { name: "confirm" })).toHaveFocus();

    // Escape dismisses and returns focus to the trigger.
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "open it" })).toHaveFocus();
  });
});

describe("NumberPad labelling", () => {
  it("names the key group with the full translated label (spaces/parens intact)", () => {
    render(<NumberPad value="" onChange={() => undefined} label="Systolic (top number)" id="systolic" />);
    expect(screen.getByRole("group", { name: "Systolic (top number)" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Systolic (top number)" })).toBeInTheDocument();
  });
});
