import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";
import { greetCommand } from "greet/commands";
import { lifeCommand } from "life";
import { rollCommand } from "roll/commands";

const program = Command.make("cli").pipe(
  Command.withSubcommands([lifeCommand, greetCommand, rollCommand]),
);

const cli = Command.run(program, {
  name: "Clean Arch Kata CLI",
  version: "0.0.1",
});

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
