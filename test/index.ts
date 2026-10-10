import { registry, makeContext, counter, hasJspi } from './util.ts'
import { InternalLuauWasmModule } from '../src/index.js'

const isNode = typeof process !== 'undefined' && !!process.versions?.node

const green = (s: string) => `\x1b[38;2;152;214;168m${s}\x1b[0m`
const red = (s: string) => `\x1b[38;2;232;106;106m${s}\x1b[0m`
const softRed = (s: string) => `\x1b[38;2;240;160;160m${s}\x1b[0m`

const filter = isNode
    ? process.argv[2]
    : (new URLSearchParams(location.search).get('filter') ?? undefined)

const loaders = new Map<string, () => Promise<unknown>>()
let locate = (_err: unknown, file: string) => `test/cases/${file}`
if (isNode) {
    const [fs, path, url] = await Promise.all(
        ['node:fs', 'node:path', 'node:url'].map(
            m => import(/* @vite-ignore */ m),
        ),
    )
    const here = path.dirname(url.fileURLToPath(import.meta.url))
    const root = path.join(here, 'cases')
    for (const f of fs.readdirSync(root, { recursive: true }) as string[]) {
        loaders.set(
            f,
            () =>
                import(
                    /* @vite-ignore */ url.pathToFileURL(path.join(root, f))
                        .href
                ),
        )
    }
    locate = (err, file) => {
        const stacks = [(err as Error)?.stack, (err as any)?.callSite]
        for (const stack of stacks) {
            const frame = String(stack ?? '')
                .split('\n')
                .find(l => l.includes('/cases/') || l.includes('\\cases\\'))
            const m = frame?.match(/\(?(?:file:\/\/)?([^()\s]+):(\d+):\d+\)?$/)
            if (m) return `${path.relative(path.dirname(here), m[1])}:${m[2]}`
        }
        return path.join('test', 'cases', file)
    }
} else {
    const modules = (import.meta as any).glob('./cases/**/*.test.ts') as Record<
        string,
        () => Promise<unknown>
    >
    for (const [p, load] of Object.entries(modules)) {
        loaders.set(p.slice('./cases/'.length), load)
    }
}

const files = [...loaders.keys()]
    .filter(f => f.endsWith('.test.ts') && (!filter || f.includes(filter)))
    .sort()

export const categories = new Map<
    string,
    { total: number; skipped: number; asserts: number; errors: string[] }
>()

for (const file of files) {
    const category = file.split(/[\\/]/)[0]
    const stat = categories.get(category) ?? {
        total: 0,
        skipped: 0,
        asserts: 0,
        errors: [],
    }
    categories.set(category, stat)

    registry.length = 0
    await loaders.get(file)!()
    for (const { name, fn, raw, jspi } of [...registry]) {
        if (jspi && !hasJspi) {
            stat.skipped++
            continue
        }

        stat.total++
        counter.passed = 0
        try {
            const oldCounter = counter.passed

            if (raw) {
                await (fn as () => void | Promise<void>)()
                counter.passed = oldCounter

                await (fn as () => void | Promise<void>)()

                stat.asserts += counter.passed
                continue
            }

            const ctx = await makeContext()

            await fn(ctx)
            counter.passed = oldCounter

            await fn(ctx)

            const pending =
                InternalLuauWasmModule.states[ctx.state.stateIdx]
                    ?.pendingCalls ?? 0
            if (pending > 0) {
                throw new Error(
                    `test returned with ${pending} lua call${pending != 1 ? 's' : ''} still running, did you forget to await a call?`,
                )
            }
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err)
            stat.errors.push(`${locate(err, file)}: ${name} failed (${reason})`)
        }
        stat.asserts += counter.passed
    }
}

export const failed = [...categories.values()].some(c => c.errors.length > 0)

if (isNode) {
    for (const [category, { total, skipped, asserts, errors }] of categories) {
        errors.forEach(e => console.log(softRed(e)))
        const note = skipped ? `, ${skipped} skipped` : ''
        const label = `[${asserts}, ${total - errors.length}/${total}] ${category[0].toUpperCase() + category.slice(1)} tests passed${note}`
        console.log(errors.length ? red(label) : green(label))
    }
    process.exit(failed ? 1 : 0)
}
