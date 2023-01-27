#!/usr/bin/env npx ts-node --esm

import * as fs from "node:fs";

const TML_PREFIX =
  "https://raw.githubusercontent.com/microsoft/TypeScript-TmLanguage/master";

const OUTPUT_DIR = "./tml";

const grammarPaths = [
  `TypeScript.tmLanguage`,
  `TypeScriptReact.tmLanguage`,
] as const satisfies ReadonlyArray<string>;

try {
    await fs.promises.mkdir(OUTPUT_DIR);
} catch (e) {
    if (!(e instanceof Error && (e as any).code == "EEXIST")) {
        throw e;
    }

    // ignore EEXIST
}

for (const path of grammarPaths) {
  const url = `${TML_PREFIX}/${path}`;
  console.log("Synchronizing", url, "to", `${OUTPUT_DIR}/${path}`);

  const response = await fetch(url);
  const content = await response.text();

  await fs.promises.writeFile(`${OUTPUT_DIR}/${path}`, content, "utf8");
}
