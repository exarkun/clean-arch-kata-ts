import { lifeCommand } from "../life/commands";
import { Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

const program = Command.make("cli").pipe(Command.withSubcommands([
  lifeCommand,
]));

const cli = Command.run(program, { name: "Clean Arch Kata CLI", version: "0.0.1" });

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
