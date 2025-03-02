import { Option } from "effect";

export type Subject = {
  name: string;
};

const defaultGreeting = "Hello, :subject!";

export const getGreeting =
  (greeting: Option.Option<string>) => (subject: Subject) => {
    const g = Option.match(greeting, {
      onSome: (greeting) => greeting,
      onNone: () => defaultGreeting,
    });
    return g.replace(":subject", subject.name);
  };
