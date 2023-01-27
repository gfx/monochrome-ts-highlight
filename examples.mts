#!node
// 1行コメント

/**
 * 複数行コメント
 */

// importなど
import * as fs from "node:fs";

// 変数宣言など
const yes: boolean = true;
const no: boolean = false;
const int: number = -42;
const bigint: bigint = 123n;
const float: number = 3.14;
const dqs: string = "foo";
const sqs: string = 'bar';
const tmpl: string = `abs(int): ${Math.abs(int)}, str: ${dqs + sqs}`;
const tagged: string = tag`abs(int): ${Math.abs(int)}, str: ${dqs + sqs}`;
const re: RegExp = /^foo(?:\.[\w-]+)+$/;
const a = [1, 2, 3] as const satisfies ReadonlyArray<number>;

// 関数宣言など
function add(x: number, y: number): number {
  return x + y;
}

async function *gen(): AsyncGenerator<number> {
    for (let i = 0; i < 3; i++) {
        yield i;
    }
}

function tag(strings: TemplateStringsArray, ...values: unknown[]): string {
    if (strings.length !== values.length + 1) {
        debugger;
        throw new Error("Invalid template");
    }
    return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
}

function mustBePositiveInt(x: unknown): x is number {
    if (x === undefined || x === null) {
        return false;
    }

    if (typeof x !== "number") {
        return false;
    }
    return x > 0 && Number.isInteger(x);
}

// クラスやインターフェイス
class C {
  hello(): string {
    return "Hello, world!\n";
  }
}

interface I {
    hello(): string;
}

type T = {
    hello(): string;
}

// 関数呼び出しなど
console.log(add(1, 2));

setTimeout(() => {
    const c = new C();
    c.hello();
}, 1000);

