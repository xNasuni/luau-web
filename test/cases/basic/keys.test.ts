import { test, expect } from '../../util.ts'
import { Mutable } from '../../../src/index.js'

test('JS Lua keys', async ({ state, run }) => {
    await run(`
        buf1 = buffer.create(32)
        buf2 = buffer.create(32)
        t = {}

        t[buf1] = buf2
        
        for k in t do
            local v = t[k]
            expect(k, buf1)
            expect(v, buf2)
        end
    `)

    expect(
        state.env.global.get('buf2'),
        state.env.global.get('t').get(state.env.global.get('buf1')),
        'buf2 === t[buf1]',
    )
})

test('Lua JS keys', async ({ state, run }) => {
    const t = Mutable({})
    const obj1 = Object.create(null)
    const obj2 = Object.create(null)

    t.set(obj1, obj2)
    state.env.global.set('t', t)

    for (const [k, v] of t) {
        expect(k, obj1)
        expect(v, obj2)
    }

    state.env.global.set('get1', () => obj1)
    state.env.global.set('get2', () => obj2)

    await run(`
        expect(get2(), t[get1()], "t[obj1] != obj2")
    `)
})
