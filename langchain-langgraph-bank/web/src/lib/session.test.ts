import { describe, expect, it } from "vitest";
import { sessionReducer } from "./session";
import { createSession } from "./storage";
import { generateSet } from "./generator";
import { makeBank } from "../test/fixtures";

const bank = makeBank(8);
const base = () => createSession(bank, generateSet(bank, "easy", 1));

describe("sessionReducer", () => {
  it("stores, replaces and clears answers without mutating state", () => {
    const s0 = base();
    const id = s0.questionIds[0] as string;
    const s1 = sessionReducer(s0, { type: "answer", id, answer: ["A"] });
    expect(s1.answers[id]).toEqual(["A"]);
    expect(s0.answers).toEqual({});
    const s2 = sessionReducer(s1, { type: "answer", id, answer: ["B"] });
    expect(s2.answers[id]).toEqual(["B"]);
    const s3 = sessionReducer(s2, { type: "answer", id, answer: undefined });
    expect(id in s3.answers).toBe(false);
  });

  it("toggles flags", () => {
    const s0 = base();
    const id = s0.questionIds[3] as string;
    const s1 = sessionReducer(s0, { type: "toggleFlag", id });
    expect(s1.flags).toEqual([id]);
    expect(sessionReducer(s1, { type: "toggleFlag", id }).flags).toEqual([]);
  });

  it("navigates within bounds", () => {
    const s0 = base();
    expect(sessionReducer(s0, { type: "prev" }).current).toBe(0);
    expect(sessionReducer(s0, { type: "next" }).current).toBe(1);
    expect(sessionReducer(s0, { type: "goto", index: 99 }).current).toBe(29);
    expect(sessionReducer(s0, { type: "goto", index: -4 }).current).toBe(0);
    const last = sessionReducer(s0, { type: "goto", index: 29 });
    expect(sessionReducer(last, { type: "next" }).current).toBe(29);
  });
});
