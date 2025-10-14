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
	LUA_VALUE: any;
	JS_VALUE: any;
	FatalJSError: any;
	LuaError: any;
	GlueError: any;
	transactionData: any;
	environments: any;
	fprint: (...args: any) => any;
	fprintwarn: (...args: any) => any;
	fprinterr: (...args: any) => any;
}

export declare const InternalLuauWasmModule: InternalLuauWasmModule;