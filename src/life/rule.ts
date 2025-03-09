import { parserAp } from "@/parse";
import { oneOf, sequenceRight, str, zeroOrMore } from "@/parse";
import { CellDifference, CellState, StateChangeRule } from "./domain";
import { Option, pipe } from "effect";

const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8"]
  .map(str)
  .map((x) => parserAp.map(x, parseInt));

const anyDigit = oneOf(digits);
const someDigits = zeroOrMore(anyDigit);

const partsToRule =
  (birth: readonly number[]) =>
  (survive: readonly number[]): StateChangeRule => {
    return (state, numLivingNeighbors): Option.Option<CellDifference> => {
      if (state === CellState.Living && !survive.includes(numLivingNeighbors)) {
        return Option.some(CellDifference.Death);
      } else if (
        state === CellState.Dead &&
        birth.includes(numLivingNeighbors)
      ) {
        return Option.some(CellDifference.Birth);
      }
      return Option.none();
    };
  };

const prule = parserAp.of(partsToRule);
const pb = pipe(someDigits, sequenceRight(str("B")));
const ps = pipe(someDigits, sequenceRight(str("/S")));

const x = parserAp.ap(prule, pb);
export const ruleParser = parserAp.ap(x, ps);
