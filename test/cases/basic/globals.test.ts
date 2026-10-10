import { test, expect } from '../../util.ts'
import { Mutable } from '../../../src/index.js'

test('Lua JS globals', async ({ state, run }) => {
    state.env.set('aconst', 100, true)
    state.env.set('getmultret', () => [300, 200, 100], true)

    await run(`
        expect(100, aconst)

        local a, b, c = getmultret()
        expect(300, a)
        expect(200, b)
        expect(100, c)

        aconst = 500
    `)

    state.env.global.set('aconst', null)
    expect(100, state.env.get('aconst'))
})

test('JS Lua globals', async ({ state, run }) => {
    await run(`
        aconst = 500

        function get200()
            return 200
        end

        function getmultret()
            return 300, 200, 100
        end
    `)

    expect(500, state.env.global.get('aconst'))

    expect(true, !!state.env.global.get('get200'))
    expect(200, (await state.env.global.get('get200')())[0])

    expect(true, !!state.env.global.get('getmultret'))
    expect(300, (await state.env.global.get('getmultret')())[0])
    expect(200, (await state.env.global.get('getmultret')())[1])
    expect(100, (await state.env.global.get('getmultret')())[2])
})

test('JS Immutable reference', async ({ state, run }) => {
    state.env.set('immutable', { a: 10, b: 20 }, true)

    await run(`
        expect(10, immutable.a, "10 == immutable.a")
        expect(20, immutable.b, "20 == immutable.b")

        expectThrows(function()
            immutable.a = 30
        end, "immutable.a = 30 should fail")
    `)

    expect(10, state.env.get('immutable').a, '10 != immutable.a')
    expect(20, state.env.get('immutable').b, '20 != immutable.b')
})

test('JS Mutable reference', async ({ state, run }) => {
    state.env.set('mutable', Mutable({ a: 10, b: 20 }), true)

    expect(10, state.env.get('mutable').a, '10 === mutable.a')
    expect(20, state.env.get('mutable').b, '20 === mutable.b')

    await run(`
        expect(10, mutable.a, "10 == mutable.a")
        expect(20, mutable.b, "20 == mutable.b")

        mutable.a = 30
        mutable.b = 40

        expect(30, mutable.a, "30 == mutable.a")
        expect(40, mutable.b, "40 == mutable.b")
    `)

    expect(30, state.env.get('mutable').a, '30 === mutable.a')
    expect(40, state.env.get('mutable').b, '40 === mutable.b')
})
