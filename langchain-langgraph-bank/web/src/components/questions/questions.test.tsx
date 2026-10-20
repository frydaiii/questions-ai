import { describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Answer, Question } from "../../types";
import { QuestionInput } from "./QuestionInput";
import { matching, multi, ordering, single } from "../../test/fixtures";
import { expectNoAxeViolations } from "../../test/axe";

function Harness({ question, layout, initial }: { question: Question; layout?: string[]; initial?: Answer }) {
  const [value, setValue] = useState<Answer | undefined>(initial);
  return (
    <div>
      <p id="stem">{question.stem}</p>
      <p id="hint">hint</p>
      <QuestionInput
        question={question}
        value={value}
        onChange={setValue}
        layout={layout}
        labelledBy="stem"
        describedBy="hint"
      />
      <pre data-testid="value">{JSON.stringify(value ?? null)}</pre>
    </div>
  );
}

const valueOf = () => JSON.parse(screen.getByTestId("value").textContent ?? "null");

describe("single choice", () => {
  it("selects and changes an answer by click", async () => {
    const user = userEvent.setup();
    render(<Harness question={single()} />);
    const group = screen.getByRole("group", { name: /which option is correct/i });
    await user.click(within(group).getByRole("radio", { name: /bravo/i }));
    expect(valueOf()).toEqual(["B"]);
    await user.click(within(group).getByRole("radio", { name: /delta/i }));
    expect(valueOf()).toEqual(["D"]);
    expect(within(group).getByRole("radio", { name: /delta/i })).toBeChecked();
  });

  it("is operable by keyboard only", async () => {
    const user = userEvent.setup();
    render(<Harness question={single()} />);
    await user.tab();
    expect(screen.getByRole("radio", { name: /alpha/i })).toHaveFocus();
    await user.keyboard(" ");
    expect(valueOf()).toEqual(["A"]);
    await user.keyboard("{ArrowDown}");
    expect(valueOf()).toEqual(["B"]);
  });

  it("has no axe violations", async () => {
    const { container } = render(<Harness question={single()} initial={["C"]} />);
    await expectNoAxeViolations(container);
  });
});

describe("multiple response", () => {
  it("caps selections at select_count and lets you swap after deselecting", async () => {
    const user = userEvent.setup();
    render(<Harness question={multi()} />);
    await user.click(screen.getByRole("checkbox", { name: /charlie/i }));
    await user.click(screen.getByRole("checkbox", { name: /alpha/i }));
    expect(valueOf()).toEqual(["A", "C"]);
    expect(screen.getByText(/2 of 2 selected/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /bravo/i })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: /alpha/i }));
    expect(valueOf()).toEqual(["C"]);
    expect(screen.getByRole("checkbox", { name: /bravo/i })).toBeEnabled();
    await user.click(screen.getByRole("checkbox", { name: /charlie/i }));
    expect(valueOf()).toBeNull();
  });

  it("toggles with the keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness question={multi()} />);
    await user.tab();
    await user.keyboard(" ");
    await user.tab();
    await user.keyboard(" ");
    expect(valueOf()).toEqual(["A", "B"]);
  });

  it("has no axe violations", async () => {
    const { container } = render(<Harness question={multi()} initial={["A", "B"]} />);
    await expectNoAxeViolations(container);
  });
});

describe("ordering", () => {
  const q = ordering();
  const layout = ["C", "A", "B"];
  const items = () => screen.getAllByRole("listitem").map((li) => li.textContent?.replace(/^\d/, "").trim());

  it("starts from the scrambled layout and is unanswered until changed or confirmed", async () => {
    const user = userEvent.setup();
    render(<Harness question={q} layout={layout} />);
    expect(items()[0]).toContain("Third step");
    expect(valueOf()).toBeNull();
    await user.click(screen.getByRole("button", { name: /keep this order/i }));
    expect(valueOf()).toEqual(["C", "A", "B"]);
  });

  it("moves items with buttons, announces the move, and keeps focus on the moved item", async () => {
    const user = userEvent.setup();
    render(<Harness question={q} layout={layout} />);
    const down = screen.getByRole("button", { name: /move “third step” down/i });
    await user.click(down);
    expect(valueOf()).toEqual(["A", "C", "B"]);
    expect(screen.getByRole("status")).toHaveTextContent("Moved “Third step” to position 2 of 3.");
    expect(screen.getByRole("button", { name: /move “third step” down \(position 2/i })).toHaveFocus();

    // Keyboard: Enter on the focused button keeps moving the same item.
    await user.keyboard("{Enter}");
    expect(valueOf()).toEqual(["A", "B", "C"]);
    // At the bottom edge, focus falls back to the "up" button.
    expect(screen.getByRole("button", { name: /move “third step” up/i })).toHaveFocus();
    expect(screen.getByRole("button", { name: /move “third step” down/i })).toBeDisabled();
  });

  it("disables moving the first item up", () => {
    render(<Harness question={q} layout={layout} />);
    expect(screen.getByRole("button", { name: /move “third step” up/i })).toBeDisabled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Harness question={q} layout={layout} />);
    await expectNoAxeViolations(container);
  });
});

describe("matching", () => {
  const q = matching();
  const layout = ["R3", "R1", "R2"];

  it("numbers descriptions in layout order and records pairs", async () => {
    const user = userEvent.setup();
    render(<Harness question={q} layout={layout} />);
    const chatbot = screen.getByRole("combobox", { name: "Chatbot" });
    const options = within(chatbot).getAllByRole("option").map((o) => o.textContent);
    expect(options[1]).toBe("1. Model decides its actions");
    await user.selectOptions(chatbot, "R1");
    expect(valueOf()).toEqual({ L1: "R1" });
    expect(screen.getByText(/1 of 3 matched/)).toBeInTheDocument();
  });

  it("uses each description once, moving it when reassigned", async () => {
    const user = userEvent.setup();
    render(<Harness question={q} layout={layout} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Chatbot" }), "R1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Workflow" }), "R1");
    expect(valueOf()).toEqual({ L2: "R1" });
    expect(screen.getByRole("combobox", { name: "Chatbot" })).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent(/moved from “Chatbot” to “Workflow”/);
  });

  it("clears a pair and the whole answer when emptied", async () => {
    const user = userEvent.setup();
    render(<Harness question={q} layout={layout} />);
    const agent = screen.getByRole("combobox", { name: "Agent" });
    await user.selectOptions(agent, "R3");
    await user.selectOptions(agent, "");
    expect(valueOf()).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Harness question={q} layout={layout} initial={{ L1: "R2" }} />);
    await expectNoAxeViolations(container);
  });
});
