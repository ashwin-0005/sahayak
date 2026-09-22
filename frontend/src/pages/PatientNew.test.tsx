import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { db } from "../db/db.js";
import "../i18n";
import PatientNewPage from "./PatientNew";

// Saving a patient MUST be gated behind explicit consent: the form validates,
// the consent sheet appears, and the save stays disabled until the worker
// confirms the patient has agreed.

beforeEach(async () => {
  db.patients.clear();
  db.visits.clear();
  db.outbox.clear();
  await new Promise((r) => setTimeout(r, 10));
});

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText("Patient name"), "Sunita");
  await userEvent.type(screen.getByLabelText("Village"), "Depalpur");
  await userEvent.type(screen.getByLabelText("Age"), "38");
}

describe("PatientNew consent gate", () => {
  it("blocks saving until consent is confirmed in the sheet", async () => {
    render(
      <MemoryRouter initialEntries={["/patients/new"]}>
        <PatientNewPage />
      </MemoryRouter>
    );

    await fillValidForm();

    // Open the consent sheet from the (now enabled) save button.
    await userEvent.click(screen.getByRole("button", { name: "Save patient" }));

    const dialog = await screen.findByRole("dialog", { name: "Patient consent" });

    // Save inside the sheet starts disabled.
    const sheetSave = within(dialog).getByRole("button", { name: "Save patient" });
    expect(sheetSave).toBeDisabled();

    // Not persisted yet.
    expect(await db.patients.count()).toBe(0);

    // Checking consent enables save.
    await userEvent.click(within(dialog).getByRole("checkbox"));
    expect(sheetSave).toBeEnabled();

    await userEvent.click(sheetSave);

    // Patient persisted ONLY after consent, then enqueued for sync.
    await waitFor(async () => {
      expect(await db.patients.count()).toBe(1);
    });

    const saved = (await db.patients.toArray())[0];
    expect(saved.consent_given).toBe(1);
    expect(saved.consent_at).toBeTruthy();
    expect(await db.outbox.count()).toBe(1);
  });

  it("keeps the primary save disabled until the form is valid", async () => {
    render(
      <MemoryRouter initialEntries={["/patients/new"]}>
        <PatientNewPage />
      </MemoryRouter>
    );

    // Empty form: save is disabled and nothing can be submitted.
    const saveBtn = screen.getByRole("button", { name: "Save patient" });
    expect(saveBtn).toBeDisabled();
    await userEvent.click(saveBtn);
    expect(screen.queryByRole("dialog", { name: "Patient consent" })).toBeNull();
    expect(await db.patients.count()).toBe(0);

    // A clearly nonsensical age also keeps it disabled.
    await userEvent.type(screen.getByLabelText("Patient name"), "Sunita");
    await userEvent.type(screen.getByLabelText("Village"), "Depalpur");
    await userEvent.type(screen.getByLabelText("Age"), "12");
    expect(screen.getByRole("button", { name: "Save patient" })).toBeEnabled();

    // Age 12 is plausible, so the gate moves to the consent sheet.
    await userEvent.click(screen.getByRole("button", { name: "Save patient" }));
    expect(await screen.findByRole("dialog", { name: "Patient consent" })).toBeTruthy();
    expect(await db.patients.count()).toBe(0);
  });
});