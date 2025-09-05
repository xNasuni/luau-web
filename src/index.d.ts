export class CompileError extends Error {
	constructor(message: string);
}

export interface LuauEnv {
	[key: string]: any;
}

export class LuauState {
	static async createAsync(env: LuauEnv);
	constructor(env: LuauEnv);

	loadstring(source: string, chunkname: string = "LuauWeb", throwOnCompilationError?: boolean): ((...args: any[]) => [any]) | string;
	makeTransaction(value: any): number;
	setEnvironment(env: LuauEnv): void;
	getValue(idx: number): any;
	destroy(): void;
}