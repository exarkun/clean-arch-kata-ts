import { describe, expect, it } from "@jest/globals";
import { getGreeting } from "./domain";

describe("getGreet", () => {
  it("returns a greeting", () => {
    expect(getGreeting({ name: "World" })).toEqual("Hello, World!");
  });
});
