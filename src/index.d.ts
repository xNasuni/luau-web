export class CompileError extends Error {
	constructor(message: string);
}

export interface LuauEnv {
	[key: string]: any;
}

export interface LuauTable {
	get(key: any): any;
	set(key: any, value: any): any;
	[key: string]: any;
}

export type LuauFunction = (...args: any) => any;

export function Mutable(object: object | Map<any, any>): Map<any, any>;

export class LuauState {
	env: LuauEnv | undefined;
	envIdx: number;

	static createAsync(env?: LuauEnv): Promise<LuauState>;
	constructor(env?: LuauEnv);

	loadstring(source: string, chunkname: string, throwOnCompilationError: true): LuauFunction;
	loadstring(source: string, chunkname?: string, throwOnCompilationError?: boolean): (LuauFunction) | string;
	makeTransaction(value: any): number;
	setEnvironment(env: LuauEnv): void;
	getValue(idx: number): any;
	destroy(): void;
}

export interface InternalLuauWasmModule {
	ccall: (ident: any, returnType: any, argTypes: any, args: any, opts: any) => any;
	cwrap: (ident: any, returnType: any, argTypes: any, opts: any) => any;
	onRuntimeInitialized: (arg: any) => any;
	LUA_VALUE: symbol;
	JS_VALUE: symbol;
	JS_MUTABLE: symbol;
	FatalJSError: Error;
	LuaError: Error;
	GlueError: Error;
	transactionData: object[];
	environments: LuauEnv[];
	fprint: (...args: any[]) => void;
	fprintwarn: (...args: any[]) => void;
	fprinterr: (...args: any[]) => void;
}

export declare const InternalLuauWasmModule: InternalLuauWasmModule;