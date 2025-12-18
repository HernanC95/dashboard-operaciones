import type { ActorRef } from "../interfaces/ActorRef";

export const PEOPLE: ActorRef[] = [
  { id: "ch", name: "Cavalieri Hernan" },
  { id: "sg", name: "Saudejaud German" },
  { id: "gf", name: "Gomez Fernando" },
  { id: "fa", name: "Franzolini Andres" },
  { id: "mm", name: "Manibardo Mario" },
  { id: "pc", name: "Presser Carlos" },
  { id: "gj", name: "Gudeikis Javier" },
] as const;
