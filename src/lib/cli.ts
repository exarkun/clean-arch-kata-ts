import { Options } from "@effect/cli";
import { p } from "@effect/cli/HelpDoc";
import { error } from "@effect/cli/HelpDoc/Span";
import { invalidValue } from "@effect/cli/ValidationError";
import { pipe } from "effect";

export const withMinimum = (n: number) => (o: Options.Options<number>) =>
  pipe(
    o,
    Options.map((m: number) => {
      if (m < n) {
        // From https://github.com/Effect-TS/effect/blob/main/packages/cli/src/internal/primitive.ts#L417
        // it looks like Effect.orElseFail might be the right way to produce parse errors.  This way
        // produces extremely ugly errors.
        throw invalidValue(
          p(
            error(
              `${Options.getIdentifier(o)}: ${m} is less than the minimum allowed value ${n}`,
            ),
          ),
        );
      } else {
        return m;
      }
    }),
  );
