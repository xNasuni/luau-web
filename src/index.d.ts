export class CompileError extends Error {
    constructor(message: string)
}

export interface LuauEnv {
    [key: string]: any
}

export interface LuauTable {
    get(key: any): any
    set(key: any, value: any, bypassReadonly?: boolean): boolean
    keys(): any[]
    [Symbol.iterator](): IterableIterator<[any, any]>
    [key: string]: any
}

export type LuauFunction = (...args: any) => any

export function Mutable<T extends object>(
    object: T,
): Map<keyof T, T[keyof T]> & T

export type LuauEnv = LuauTable & {
    istable: (t: any) => boolean
    isfunction: (t: any) => boolean
    isreadonly: (t: LuauTable) => boolean
    setreadonly: (t: LuauTable, readonly: boolean) => void
    getrawmetatable: (t: LuauTable) => LuauTable?
    setrawmetatable: (t: LuauTable, mt: object) => LuauTable
    global: LuauTable
}

export class LuauState {
    destroyed: boolean
    env: LuauEnv
    envIdx: number

    static createAsync(initialEnv?: LuauEnv): Promise<LuauState>
    constructor(initialEnv?: LuauEnv)

    loadstring(
        source: string,
        chunkname: string,
        throwOnCompilationError: true,
    ): LuauFunction
    loadstring(
        source: string,
        chunkname?: string,
        throwOnCompilationError?: boolean,
    ): LuauFunction | string
    makeTransaction(value: any): number
    getValue(idx: number): any
    destroy(): void
}

export interface LuaState {
    luaValueCache: Map<number, object>
    jsValueCache: Map<number, object>
    jsValueReverse: Map<object, number>
    transactionData: object[]
    nextJSRef: number
    nextTXKey: number
    env: LuauEnv
}

export interface InternalLuauWasmModule {
    ccall: (
        ident: any,
        returnType: any,
        argTypes: any,
        args: any,
        opts: any,
    ) => any
    cwrap: (ident: any, returnType: any, argTypes: any, opts: any) => any
    onRuntimeInitialized: (arg: any) => any
    LUA_VALUE: symbol
    JS_VALUE: symbol
    JS_MUTABLE: symbol
    FatalJSError: { new (message?: string): Error }
    LuaError: { new (message?: string): Error }
    GlueError: { new (message?: string): Error }
    RuntimeError: { new (message?: string): Error }
    transactionData: object[]
    states: LuaState[]
    fprint: (...args: any[]) => void
    fprintwarn: (...args: any[]) => void
    fprinterr: (...args: any[]) => void
    securityTransmitList: Map<any, boolean>
    options: Map<
        'LUA_IMPLICIT_ARRAYS_TO_JS_ARRAYS' | 'LUA_NONSTRICT_READONLY',
        boolean
    >
}

export declare const InternalLuauWasmModule: InternalLuauWasmModule
