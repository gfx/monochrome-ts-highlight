#!/usr/bin/env npx ts-node --esm

import * as path from "node:path";
import * as fs from "node:fs";
import * as url from "node:url";

import { JSDOM } from "jsdom";
import vt from "vscode-textmate";
import oniguruma from "vscode-oniguruma";
import { IRawRule } from "vscode-textmate/release/rawGrammar";

const DIRNAME = path.dirname(url.fileURLToPath(import.meta.url));
const PROJECT_ROOT = DIRNAME;

const VERBOSE = process.argv.includes("--verbose");

const inputFile = process.argv[2];
if (!inputFile) {
  console.error("No input file");
  process.exit(1);
}

type Pair<F, S> = readonly [F, S];

const styleMap = [
  [/^punctuation\.definition\.template\.expression(?:\.[\w-]+)+\.ts$/, "font-weight: normal;"],
  [/^meta\.template\.expression\.ts$/, "font-weight: normal;"],

  [/^comment(?:\.[\w-]+)+\.ts$/, "color: gray;"],
  // [/^meta\.brace\.[\w-]+\.ts$/, "font-weight: bold;"],
  // [/^punctuation(?:\.[\w-]+)+\.ts$/, "font-weight: bold;"],
  [/^storage(?:\.[\w-]+)+\.ts$/, "font-weight: bold;"],
  [/^keyword\.control(?:\.[\w-]+)+\.ts$/, "font-weight: bold;"],
  [/^keyword\.other(?:\.[\w-]+)+\.ts$/, "font-weight: bold;"],
  [/^support\.class(?:\.[\w-]+)+\.ts$/, "font-weight: bold;"],
  [/^support\.function(?:\.[\w-]+)+\.ts$/, "font-weight: bold;"],
  [/^support\.constant(?:\.[\w-]+)+\.ts$/, "font-weight: bold;"],
  [/^support\.type(?:\.[\w-]+)+\.ts$/, "font-weight: bold;"],
  [/^constant\.language(?:\.[\w-]+)+\.ts$/, "font-weight: bold;"],
  [/^string(?:\.[\w-]+)+\.ts$/, "font-weight: bold;"],
] as const satisfies ReadonlyArray<Pair<RegExp, string>>;

const input = await fs.promises.readFile(inputFile, "utf8");

const TML_PREFIX =
  "https://raw.githubusercontent.com/microsoft/TypeScript-TmLanguage/master";

const grammarFileOf = {
  "source.ts": `${PROJECT_ROOT}/tml/TypeScript.tmLanguage`,
  "source.tsx": `${PROJECT_ROOT}/tml/TypeScriptReact.tmLanguage`,
} as const satisfies Record<string, string>;

// FIXME: use import.meta.resolve() to get the path to onig.wasm
// https://nodejs.org/api/esm.html#importmetaresolvespecifier-parent
const wasmBin = await fs.promises.readFile(
  path.join(PROJECT_ROOT, "node_modules/vscode-oniguruma/release/onig.wasm")
);

const onigLib: Promise<vt.IOnigLib> = oniguruma.loadWASM(wasmBin).then(() => {
  return {
    createOnigScanner(patterns) {
      return new oniguruma.OnigScanner(patterns);
    },
    createOnigString(s) {
      return new oniguruma.OnigString(s);
    },
  };
});

const registry = new vt.Registry({
  onigLib,

  async loadGrammar(scopeName: keyof typeof grammarFileOf) {
    const filePath = grammarFileOf[scopeName];
    const content = await fs.promises.readFile(filePath, { encoding: "utf8" });
    return vt.parseRawGrammar(content, scopeName);
  },
});

const grammar: vt.IGrammar | null = /\.m?tsx$/i.test(inputFile)
  ? await registry.loadGrammar("source.tsx")
  : await registry.loadGrammar("source.ts");
if (!grammar) {
  throw new Error("No grammar loaded");
}

type Rule = IRawRule;

function doWalk(rule: Rule, cb: (name: string, parent: string | null) => void) {
  if (rule.name) {
    cb(rule.name, null);
  }

  if (rule.patterns) {
    for (const r of rule.patterns) {
      doWalk(r, cb)
    }
  }
  if (rule.captures) {
    for (const capture of Object.values<Rule>(rule.captures)) {
      if (capture.name) {
        cb(capture.name, rule.name ?? null);
      }
    }
  }
  if (rule.beginCaptures) {
    for (const capture of Object.values<Rule>(rule.beginCaptures)) {
      if (capture.name) {
        cb(capture.name, rule.name ?? null);
      }
    }
  }
  if (rule.endCaptures) {
    for (const capture of Object.values<Rule>(rule.endCaptures)) {
      if (capture.name) {
        cb(capture.name, rule.name ?? null);
      }
    }
  }
}

function walkGrammar(grammar: vt.IGrammar, cb: (name: string, parent: string | null) => void) {
  const repository = (grammar as any)._grammar.repository;

  if (VERBOSE) {
    console.warn(JSON.stringify(repository, null, 2));
  }

  for (const rule of Object.values<any>(repository)) {
    if (/^\$/.test(rule.name)) {
      continue;
    }

    doWalk(rule, cb);
  }
}

function scopeToClassName(scope: string) {
  return scope.replace(/\W/g, "--");
}

let style = "";

const seen = new Set<string>();
walkGrammar(grammar, (name, _parent) => {
  const pair = styleMap.find(([re]) => re.test(name));
  if (pair) {
    if (seen.has(name)) {
      return;
    }
    seen.add(name);

    style += `.${scopeToClassName(name)} { ${pair[1]} }\n`;
  }
});

// Tokenize and highlight the input text

const dom = new JSDOM("");
const document = dom.window.document;
const code = document.createElement("code");
const pre = document.createElement("pre");
pre.appendChild(code);
document.body.appendChild(pre);

const inputLines = input.split(/\n/);
let ruleStack = vt.INITIAL;
for (let i = 0; i < inputLines.length; i++) {
  const line = inputLines[i] + "\n";
  const lineTokens = grammar.tokenizeLine(line, ruleStack);

  for (let j = 0; j < lineTokens.tokens.length; j++) {
    const token = lineTokens.tokens[j];

    const element = document.createElement("span");
    element.textContent = line.substring(token.startIndex, token.endIndex);
    element.classList.add(...token.scopes.map((s) => scopeToClassName(s)));
    code.appendChild(element);
  }
  ruleStack = lineTokens.ruleStack;
}

console.log(`<style>\n${style}\n</style>\n`);
console.log(document.body.innerHTML);
