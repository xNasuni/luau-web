import { InternalLuauWasmModule, Mutable } from '../../../src/index.js'
import { test, rawTest, expect, makeContext } from '../../util.ts'

test('JS runtime', async ({ state, run }) => {
    state.env.set('Uint8Array', Uint8Array, true)

    const bufs = await run(`
        local buf1 = Uint8Array(4)
        buf1.set({72, 105}, 0)
        buf1.set({256, -1}, 2)

        expect(72, buf1.at(0))
        expect(105, buf1.at(1))
        expect(0, buf1.at(2))
        expect(255, buf1.at(3))

        local buf2 = Uint8Array({0x6c, 0x75, 0x61, 0x75, 0x2d, 0x77, 0x65, 0x62})
        expect(108, buf2.at(0))
        expect(117, buf2.at(1))
        expect(97, buf2.at(2))
        expect(117, buf2.at(3))
        expect(45, buf2.at(4))
        expect(119, buf2.at(5))
        expect(101, buf2.at(6))
        expect(98, buf2.at(7))

        return buf1, buf2
    `)

    const buf1 = bufs[0]
    const buf2 = bufs[1]

    expect(72, buf1.at(0))
    expect(105, buf1.at(1))
    expect(0, buf1.at(2))
    expect(255, buf1.at(3))
    expect('luau-web', new TextDecoder().decode(buf2))
})

rawTest('multret contamination', async () => {
    const expected: number[][] = []
    const actual: unknown[][] = []

    for (let i = 0; i < 1000; i++) {
        const { state, run } = await makeContext()
        try {
            state.env.set('index', () => i, true)
            expected.push([i])
            actual.push(await run('return index()'))
        } finally {
            state.destroy()
        }
    }

    expect(JSON.stringify(expected), JSON.stringify(actual))
})

test('released refs not served from stale wrappers', async ({ run }) => {
    const N = 16

    const olds: any[] = []
    for (let i = 0; i < N; i++) {
        olds.push((await run(`return function() return ${i} end`))[0])
    }

    for (const f of olds) {
        f[InternalLuauWasmModule.LUA_VALUE].release()
    }

    for (let i = 0; i < N; i++) {
        const [g] = await run(`return function() return ${100 + i} end`)
        const r = await g()
        if (r[0] !== 100 + i) {
            throw new Error(`function ${i}: expected ${100 + i}, got ${r[0]}`)
        }
    }
})

test('strings survive wasm boundary', async ({ run }) => {
    const encoder = new TextEncoder()

    const strings = {
        ascii: 'luau-web',
        emoji: '❤️🥀😭✅🙏',
        chinese: '你好，夏威夷派對',
        nulls: '🕊🪦\0\0🕊🪦\0after nulls',
    }

    for (const [name, str] of Object.entries(strings)) {
        const [lstr, llen] = await run('return (...), #(...)', [str])
        expect(encoder.encode(str).length, llen, name)
        expect(str, lstr, name)
    }

    const keys = Object.values(strings)
    const map = Mutable({})
    keys.forEach((str, i) => {
        map.set(str, i + 1)
        map.set(i + 1, str)
    })

    await run(
        `
        local map, keys, total = ...

        local n = 0
        for _, key in keys do
            n += 1
            expect(n, map[key], "map[str] at " .. n)
            expect(key, map[n], "map[index] at " .. n)
        end
        expect(total, n, "key count")

        local count = 0
        for k, v in map do
            count += 1
            local desc = type(k) .. " " .. tostring(k) .. " -> " .. type(v) .. " " .. tostring(v)
            if type(k) == "string" then
                expect("number", type(v), "string key value type: " .. desc)
                expect(k, map[v], "iterated string key: " .. desc)
            else
                expect("string", type(v), "number key value type: " .. desc)
                expect(k, map[v], "iterated number key: " .. desc)
            end
        end
        expect(total * 2, count, "entry count")
    `,
        [map, keys, keys.length],
    )

    const tricky = ['null', '\0', 'nil', 'undefined', 'true']
    const ring = Mutable({})
    tricky.forEach((str, i) => {
        ring.set(str, tricky[(i + 1) % tricky.length])
    })

    await run(
        `
        local ring = ...

        expect("\\0", ring["null"], "ring null")
        expect("nil", ring["\\0"], "ring null byte")
        expect("undefined", ring["nil"], "ring nil")
        expect("true", ring["undefined"], "ring undefined")
        expect("null", ring["true"], "ring true")

        expect(nil, ring[""], "empty string key")
        expect(nil, ring["nul"], "prefix key")
        expect(nil, ring["\\0null"], "null byte prefixed key")
    `,
        [ring],
    )

    const [luaRing] = await run(`
        return {
            ["null"] = "\\0",
            ["\\0"] = "nil",
            ["nil"] = "undefined",
            ["undefined"] = "true",
            ["true"] = "null",
        }
    `)

    for (const str of tricky) {
        expect(
            ring.get(str),
            luaRing.get(str),
            `lua ring ${JSON.stringify(str)}`,
        )
    }
    expect(null, luaRing.get(''), 'lua ring empty string key')
    expect(null, luaRing.get('nul'), 'lua ring prefix key')
})

test('security transmist list', async ({ state, run }) => {
    state.env.set('list', [10, function () {}.constructor, 20], true)

    await run(`
        for k, v in list do
            expect(false, k==1)

            if k == 0 then
                expect(10, v)
                continue
            end
            if k == 2 then
                expect(20, v)
                continue
            end

            expect(nil, k)
        end
    `)
})

test('iteration getter amount', async ({ state, run }) => {
    let aCount = 0
    let bCount = 0

    state.env.set(
        'object',
        {
            get a() {
                aCount++
                return 10
            },

            get b() {
                bCount++
                return 20
            },
        },
        true,
    )

    await run(`
        for k, v in object do
            if k == "a" then
                expect(10, v)
                continue
            end
            if k == "b" then
                expect(20, v)
                continue
            end
            
            expect(nil, k)
        end
    `)

    expect(1, aCount)
    expect(1, bCount)
})
