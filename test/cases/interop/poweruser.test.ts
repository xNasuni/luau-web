import {
    Indexable,
    type LuauFunction,
    type LuauTable,
} from '../../../src/index.js'
import { test } from '../../util.ts'

test('JS poweruser methods', true, async ({ state, run }) => {
    state.env.set(
        'test',
        (t: LuauTable) => {
            t.set('a', 1000000000n)
        },
        true,
    )

    state.env.set(
        'test2',
        (t: LuauTable) => {
            t.set('a', 1000000000n, true)
        },
        true,
    )

    state.env.set(
        'test3',
        (t: LuauTable) => {
            return state.env.isreadonly(t)
        },
        true,
    )

    state.env.set(
        'test4',
        (t: LuauFunction) => {
            return state.env.isfunction(t)
        },
        true,
    )

    state.env.set(
        'test5',
        (t: LuauTable) => {
            state.env.setreadonly(t, false)
        },
        true,
    )

    await run(`
        local t = {a = 5000000000i, b = 10}
        test(t)

        -----
        expect(1000000000i, t.a)

        t.a = 5000000000i
        table.freeze(t)

        -----
        expectThrows(function()
            test(t)
        end, "immutable modification should error")

        -----
        test2(t)
        expect(1000000000i, t.a)

        -----
        expectThrows(function()
            t.a = 1000000000i
        end, "immutable modification should error")

        -----
        expect(true, test3(t))

        -----
        expect(true, test4(function()end))

        -----
        test5(t)
        t.a = 1000000000i

        expect(1000000000i, t.a)
    `)

    const ud = state.env.newuserdata()
    state.env.setrawmetatable(ud, {
        __index: function () {
            return -1
        },
        __call: function () {
            return -2
        },
        __concat: function () {
            return -3
        },
        __unm: function () {
            return -4
        },
        __add: function () {
            return -5
        },
        __sub: function () {
            return -6
        },
        __mul: function () {
            return -7
        },
        __div: function () {
            return -8
        },
        __idiv: function () {
            return -9
        },
        __mod: function () {
            return -10
        },
        __pow: function () {
            return -11
        },
        __tostring: function () {
            return -12
        },
        __eq: function () {
            return false
        },
        __lt: function () {
            return false
        },
        __le: function () {
            return false
        },
        __len: function () {
            return -16
        },
        __iter: function () {
            const items = [{ id: 1 }, { id: 2 }, { id: 3 }]
            let i = 0
            return function () {
                if (i >= items.length) return undefined
                i++
                return [i, items[i - 1]]
            }
        },
        __type: 'Example',
    })

    state.env.set('ud', ud, true)
    await run(`
		expect(-1, ud.index)
		expect(-2, ud())
		expect(-3, ud .. ud)
		expect(-4, -ud)
		expect(-5, ud + ud)
		expect(-6, ud - ud)
		expect(-7, ud * ud)
		expect(-8, ud / ud)
		expect(-9, ud // ud)
		expect(-10, ud % ud)
		expect(-11, ud ^ ud)
		expect("-12", tostring(ud))
		expect(false, ud == ud)
		expect(false, ud < ud)
		expect(false, ud <= ud)
		expect(-16, #ud)

		local count = 0
		for i, item in ud do
			count += 1
			expect(count, i)
			expect(count, item.id)
		end
		expect(3, count)

		expect(type(ud), "userdata")
		expect(typeof(ud), "Example")

        expect(getmetatable(ud), "The metatable is locked")

        expectThrows(function()
            setmetatable(ud, {})
        end, "setmetatable didn't error on javascript userdata")
	`)
})

test('JS indexable', async ({ state, run }) => {
    state.env.set('Uint8Array', Indexable(Uint8Array), true)

    await run(`
        expect(1, Uint8Array.BYTES_PER_ELEMENT)
    `)
})
