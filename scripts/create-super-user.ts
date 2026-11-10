import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

import { ZodError } from "zod";

import {
  createFirstSuperUser,
  type FirstSuperUserResult,
} from "@/modules/access";

const ENTER_KEYS = new Set(["\r", "\n"]);
const BACKSPACE_KEYS = new Set(["\u007f", "\b"]);
const CANCEL_KEY = "\u0003";

const RESULT_MESSAGES: Record<FirstSuperUserResult, string> = {
  created: "Super user creado.",
  "super-user-already-exists":
    "Ya existe un Super user: el script no crea otro.",
  "email-already-registered": "Ese correo ya tiene una cuenta.",
};

function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let answer = "";

    function stopReading() {
      stdin.off("data", readCharacters);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    }

    function readCharacters(chunk: string) {
      for (const character of chunk) {
        if (ENTER_KEYS.has(character)) {
          stopReading();
          resolve(answer);
          return;
        }
        if (character === CANCEL_KEY) {
          stopReading();
          reject(new Error("Operación cancelada."));
          return;
        }
        answer = BACKSPACE_KEYS.has(character)
          ? answer.slice(0, -1)
          : answer + character;
      }
    }

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    stdin.on("data", readCharacters);
  });
}

async function askVisible(question: string): Promise<string> {
  const reader = createInterface({ input: stdin, output: stdout });
  try {
    return await reader.question(question);
  } finally {
    reader.close();
  }
}

async function main(): Promise<number> {
  if (!stdin.isTTY) {
    console.error("Ejecutá el script en una terminal interactiva.");
    return 1;
  }

  const name = await askVisible("Nombre: ");
  const email = await askVisible("Correo: ");
  const password = await askHidden("Contraseña: ");
  const passwordConfirmation = await askHidden("Repetí la contraseña: ");

  if (password !== passwordConfirmation) {
    console.error("Las contraseñas no coinciden.");
    return 1;
  }

  const result = await createFirstSuperUser({ name, email, password });
  const message = RESULT_MESSAGES[result];
  if (result !== "created") {
    console.error(message);
    return 1;
  }
  console.log(message);
  return 0;
}

main()
  .then((exitCode) => process.exit(exitCode))
  .catch((error: unknown) => {
    if (error instanceof ZodError) {
      for (const issue of error.issues) {
        console.error(issue.message);
      }
    } else {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exit(1);
  });
