import { describe, expect, it } from "@jest/globals";
import { Point } from "cartesian/domain";
import { Effect } from "effect";
import { range } from "effect/Array";
import seedrandom from "seedrandom";
import { CellState, initialBoard, randomBoard } from "./domain";
import { shuffle } from "./utils";
import { boardToImage, formatLiving } from "./view";

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
  describe("view", () => {
    describe("formatLiving", () => {
      it("renders dead cells as ' '", () => {
        expect(formatLiving(CellState.Dead)).toStrictEqual(" ");
      });
      it("renders living cells as ●", () => {
        expect(formatLiving(CellState.Living)).toStrictEqual("●");
      });
    });
    describe("boardToImage", () => {
      it("renders individual positions based on the formatter and board given", () => {
        const image = boardToImage(
          (n: number) => n.toString(),
          ({ x, y }: Point) => x + y,
        );
        expect(image({ x: 0, y: 0 })).toStrictEqual("0");
        expect(image({ x: 1, y: 0 })).toStrictEqual("1");
        expect(image({ x: 1, y: 1 })).toStrictEqual("2");
      });
    });
  });
});
