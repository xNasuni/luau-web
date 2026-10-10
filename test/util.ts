import {
    InternalLuauWasmModule,
    type LuauFunction,
    LuauState,
} from '../src/index.js'

export interface Context {
    state: LuauState

    run(code: string, args?: any[]): Promise<any[]>
}

export type TestFn = (ctx: Context) => void | Promise<void>

export const registry: {
    name: string
    fn: TestFn
    raw?: boolean
    jspi?: boolean
}[] = []

export const counter = { passed: 0 }

export const hasJspi = 'Suspending' in WebAssembly && 'promising' in WebAssembly

export function test(name: string, fn: TestFn): void
export function test(name: string, jspi: boolean | null, fn: TestFn): void
export function test(
    name: string,
    jspiOrFn: boolean | null | TestFn,
    maybeFn?: TestFn,
) {
    const jspi = typeof jspiOrFn === 'function' ? false : !!jspiOrFn
    const fn = typeof jspiOrFn === 'function' ? jspiOrFn : maybeFn!
    registry.push({ name, fn, jspi })
}

export function rawTest(name: string, fn: () => void | Promise<void>) {
    registry.push({ name, fn: fn as TestFn, raw: true })
}

const show = (v: unknown) =>
    typeof v === 'string' ? JSON.stringify(v) : String(v)

export function expect(expected: unknown, actual: unknown, msg?: string) {
    if (!Object.is(actual, expected)) {
        throw new Error(
            `${msg ? msg + ': ' : ''}expected ${show(expected)}, got ${show(actual)}`,
        )
    }
    counter.passed++
}

export function expectLossy(
    expected: number,
    actual: number,
    threshold: number,
    msg?: string,
) {
    if (!(Math.abs(actual - expected) <= threshold)) {
        throw new Error(
            `${msg ? msg + ': ' : ''}expected ≈ ${show(expected)} (±${threshold}), got ${show(actual)}`,
        )
    }
    counter.passed++
}

export async function expectCompute(
    actual: unknown,
    expectedGenerator: (value: unknown) => unknown,
    msg?: string,
) {
    const expected = await expectedGenerator(actual)
    if (!Object.is(actual, expected)) {
        throw new Error(
            `${msg ? msg + ': ' : ''}expected ${show(expected)}, got ${show(actual)}`,
        )
    }
    counter.passed++
}

export async function expectThrows(fn: () => unknown, msg = 'expected throw') {
    try {
        await fn()
    } catch (e) {
        if (e instanceof InternalLuauWasmModule.GlueError) {
            throw e
        }
        counter.passed++
        return
    }
    throw new Error(msg)
}

export async function expectRejects(
    fn: () => Promise<unknown>,
    msg = 'expected rejection',
) {
    try {
        await fn()
    } catch {
        counter.passed++
        return
    }
    throw new Error(msg)
}

export async function makeContext(): Promise<Context> {
    const state = await LuauState.createAsync({})

    state.env.set(
        'expect',
        (expected: unknown, actual: unknown, msg?: string) =>
            expect(expected, actual, msg),
        true,
    )

    state.env.set(
        'expectThrows',
        async (func: LuauFunction, msg?: string) =>
            await expectThrows(func, msg),
        true,
    )

    return {
        state,
        run: async (code, args = []) => {
            const site = new Error().stack
            try {
                return await state.loadstring(code, 'test', true)(...args)
            } catch (err) {
                if (err instanceof Error) (err as any).callSite = site
                console.log(err)
                throw err
            }
        },
    }
}
