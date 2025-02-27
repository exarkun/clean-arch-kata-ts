import { describe, expect, it } from "@jest/globals";
import { initialBoard, randomBoard, shuffle } from "./commands";
import { CellState } from "./domain";
import seedrandom from "seedrandom";
import { range } from "effect/Array";
import { Effect } from "effect";

describe("The Game of Life", () => {
  const prng = seedrandom("x");
  const randomEffect = Effect.sync(prng);
  describe("shuffle", () => {
    it("mixes up an array", () => {
      const ordered = range(0, 3);
      const disordered = Effect.runSync(shuffle(randomEffect)(ordered));
      expect(disordered).toStrictEqual([3, 1, 2, 0]);
    });
  });
  describe("initialBoard", () => {
    it("can return an empty board", () => {
      const board = initialBoard(2, 2, 0);
      expect(board({ x: 0, y: 0 })).toEqual(CellState.Dead);
      expect(board({ x: 0, y: 1 })).toEqual(CellState.Dead);
      expect(board({ x: 1, y: 0 })).toEqual(CellState.Dead);
      expect(board({ x: 0, y: 1 })).toEqual(CellState.Dead);
    });

    it("can return a board with some living cells", () => {
      const board = initialBoard(2, 2, 3);
      expect(board({ x: 0, y: 0 })).toEqual(CellState.Living);
      expect(board({ x: 0, y: 1 })).toEqual(CellState.Living);
      expect(board({ x: 1, y: 0 })).toEqual(CellState.Living);
      expect(board({ x: 1, y: 1 })).toEqual(CellState.Dead);
    });
  });
  describe("randomBoard", () => {
    it("can return an empty board", () => {
      const board = Effect.runSync(randomBoard(2, 2, 0, randomEffect));
      expect(board({ x: 0, y: 0 })).toEqual(CellState.Dead);
      expect(board({ x: 0, y: 1 })).toEqual(CellState.Dead);
      expect(board({ x: 1, y: 0 })).toEqual(CellState.Dead);
      expect(board({ x: 0, y: 1 })).toEqual(CellState.Dead);
    });

    it("can return a board with some living cells", () => {
      const board = Effect.runSync(randomBoard(2, 2, 2, randomEffect));
      expect(board({ x: 0, y: 0 })).toEqual(CellState.Living);
      expect(board({ x: 0, y: 1 })).toEqual(CellState.Living);
      expect(board({ x: 1, y: 0 })).toEqual(CellState.Dead);
      expect(board({ x: 0, y: 1 })).toEqual(CellState.Living);
    });
  });
});
