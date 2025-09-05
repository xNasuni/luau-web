export class CompileError extends Error {
	constructor(message: string);
}

export interface LuauEnv {
	[key: string]: any;
}

export class LuauState {
	static createAsync(env: LuauEnv): Promise<LuauState>;
	constructor(env: LuauEnv);

	loadstring(source: string, chunkname: string, throwOnCompilationError?: boolean): ((...args: any[]) => [any]) | string;
	makeTransaction(value: any): number;
	setEnvironment(env: LuauEnv): void;
	getValue(idx: number): any;
	destroy(): void;
}

export const InternalLuauWasmModule = require("./lib/Luau.Web");