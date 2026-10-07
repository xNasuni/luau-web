declare const luauUserdata: unique symbol

export class CompileError extends Error {
    constructor(message: string)
}

export interface LuauTable {
    get(key: any): any
    set(key: any, value: any, bypassReadonly?: boolean): boolean
    keys(): any[]
    [Symbol.iterator](): IterableIterator<[any, any]>
    [key: string]: any
}

export interface LuauUserdata {
    readonly [luauUserdata]: true
}

export type LuauMetatabled = LuauTable | LuauUserdata

export type LuauFunction = (...args: any) => any

export function Mutable<T extends object>(object: T): Map<any, any> & T
export function Indexable<T extends Function>(fn: T): T

export type LuauEnv = LuauTable & {
    istable: (t: any) => boolean
    isfunction: (t: any) => boolean
    isreadonly: (t: LuauTable) => boolean
    setreadonly: (t: LuauTable, readonly: boolean) => void
    getrawmetatable: (t: LuauMetatabled) => LuauTable | null
    setrawmetatable: (t: LuauMetatabled, mt: object) => LuauTable
    newuserdata: () => LuauUserdata
    global: LuauTable
}

export class LuauState {
    destroyed: boolean
    stateIdx: number
    env: LuauEnv

    static createAsync(initialEnv?: Record<string, any>): Promise<LuauState>
    constructor(initialEnv?: Record<string, any>)

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
    pendingCalls: number
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
        | 'LUA_IMPLICIT_ARRAYS_TO_JS_ARRAYS'
        | 'LUA_NONSTRICT_READONLY'
        | 'LUA_INTEROP_CORE_SILENCE_WARNINGS',
        boolean
    >
}

export declare const InternalLuauWasmModule: InternalLuauWasmModule
