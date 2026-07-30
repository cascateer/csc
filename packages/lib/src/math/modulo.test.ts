import { expect, test } from "vitest";
import { modulo } from "./modulo";

test("modulo", () => expect(modulo(-1, 3)).toEqual(2));
