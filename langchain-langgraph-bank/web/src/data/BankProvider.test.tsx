import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BankProvider, fetchBank } from "./BankProvider";
import { BankGate } from "./BankGate";
import { makeBank } from "../test/fixtures";

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as unknown as Response;

describe("fetchBank", () => {
  it("returns a valid bank", async () => {
    const bank = makeBank(1);
    await expect(fetchBank("/bank.json", vi.fn().mockResolvedValue(okResponse(bank)))).resolves.toEqual(bank);
  });

  it("rejects on HTTP errors", async () => {
    const res = { ok: false, status: 404 } as Response;
    await expect(fetchBank("/bank.json", vi.fn().mockResolvedValue(res))).rejects.toThrow(/HTTP 404/);
  });

  it("rejects invalid JSON and unexpected shapes", async () => {
    const badJson = { ok: true, status: 200, json: () => Promise.reject(new SyntaxError("x")) } as unknown as Response;
    await expect(fetchBank("/b", vi.fn().mockResolvedValue(badJson))).rejects.toThrow(/not valid JSON/);
    await expect(fetchBank("/b", vi.fn().mockResolvedValue(okResponse({ questions: [] })))).rejects.toThrow(
      /unexpected format/,
    );
  });
});

describe("BankGate", () => {
  it("shows loading, then content", async () => {
    let resolve!: (b: ReturnType<typeof makeBank>) => void;
    const loader = () => new Promise<ReturnType<typeof makeBank>>((r) => (resolve = r));
    render(
      <BankProvider loader={loader}>
        <BankGate>
          <p>Loaded!</p>
        </BankGate>
      </BankProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/loading questions/i);
    resolve(makeBank(1));
    expect(await screen.findByText("Loaded!")).toBeInTheDocument();
  });

  it("shows an error with a working retry", async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("Could not load the question bank (HTTP 500)."))
      .mockResolvedValueOnce(makeBank(1));
    render(
      <BankProvider loader={loader}>
        <BankGate>
          <p>Loaded!</p>
        </BankGate>
      </BankProvider>,
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/HTTP 500/);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Loaded!")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
