import { describe, expect, it } from "@jest/globals";
import { getGreeting } from "./domain";
import { Option } from "effect";

describe("getGreeting", () => {
  it("returns a greeting", () => {
    expect(getGreeting(Option.none())({ name: "World" })).toEqual(
      "Hello, World!",
    );
  });
});
