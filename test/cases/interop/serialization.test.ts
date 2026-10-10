import { test, expect, expectCompute } from '../../util.ts'

test('Lua to JS serialization', async ({ state, run }) => {
    var last = null
    state.env.set(
        'callback',
        (a: any) => {
            last = a
            return a
        },
        true,
    )

    expect(-1, (await run('return -1'))[0])
    expect(0, (await run('return 0'))[0])
    expect(1, (await run('return 1'))[0])
    expect(true, (await run('return callback(true)'))[0])
    expect(false, (await run('return callback(false)'))[0])
    expect(Math.E, (await run('return callback(math.e)'))[0])
    expect(Math.PI, (await run('return callback(math.pi)'))[0])
    expect(Math.sin(1), (await run('return callback(math.sin(1))'))[0])

    const vec = (
        await run('return callback(vector.create(1000, 2000, 3000))')
    )[0]
    expect(true, !!vec)
    expect(
        JSON.stringify([1000, 2000, 3000]),
        JSON.stringify([vec.x, vec.y, vec.z]),
    )

    const vec2 = (await run('return callback(vector.create(100, 200, 300))'))[0]
    expect(true, !!vec2)
    expect(
        JSON.stringify([100, 200, 300]),
        JSON.stringify([vec2.x, vec2.y, vec2.z]),
    )

    expect(
        7815259884273231202n,
        (await run('return callback(7815259884273231202i)'))[0],
    )

    expect('hello world', (await run('return callback("hello world")'))[0])

    expect(
        7815259884273231202n,
        (await run('return callback({a = 7815259884273231202i})'))[0].a,
    )

    expect(
        7815259884273231202n,
        (await run('return callback({1, 2, 3, 7815259884273231202i})'))[0][4],
    )

    expect(
        7815259884273231202n,
        (await run('return callback({1, 2, 3, 7815259884273231202i})'))[0]['4'],
    )

    expect(
        7815259884273231202n,
        (await run('return callback({a = 1, 2, 3, 7815259884273231202i})'))[0][
            '3'
        ],
    )

    expect(1, (await run('return callback({["1"] = 1, 2})'))[0].get('1'))
    expect(2, (await run('return callback({["1"] = 1, 2})'))[0].get(1))

    expect(
        1024n,
        (
            await (
                await run('return callback(function() return 1024i end)')
            )[0]()
        )[0],
    )

    await expectCompute(
        (
            await run(
                `return 1024i, callback(function()
                        local ud = newproxy(true)
                        local mt = getmetatable(ud)
                        mt.test = 1024i
                        return ud
                end)`,
            )
        )[0],
        async () => {
            const ud = (await last!!())[0]
            const mt = state.env.getrawmetatable(ud)!!
            return mt.get('test')
        },
    )

    const thread = (
        await run(`
            return coroutine.create(function()
                coroutine.yield(1)
                coroutine.yield(2)
                coroutine.yield(3)
            end)
    `)
    )[0]

    expect(1, (await state.env.coroutine.resume(thread))[1])
    expect(2, (await state.env.coroutine.resume(thread))[1])
    expect(3, (await state.env.coroutine.resume(thread))[1])
    expect(undefined, (await state.env.coroutine.resume(thread))[1])
    expect(false, (await state.env.coroutine.resume(thread))[0])

    const buffer = (
        await run(`
            local buf = buffer.create(24)
            buffer.writestring(buf, 0, "heloworl")
            buffer.writef64(buf, 8, math.pi)
            buffer.writef64(buf, 16, math.e)
            return buf
        `)
    )[0]

    expect('heloworl', (await state.env.buffer.readstring(buffer, 0, 8))[0])
    expect(Math.PI, (await state.env.buffer.readf64(buffer, 8))[0])
    expect(Math.E, (await state.env.buffer.readf64(buffer, 16))[0])

    expect(null, (await run('return callback()'))[0])
    expect(Infinity, (await run('return callback(math.huge)'))[0])
    expect(-Infinity, (await run('return callback(-math.huge)'))[0])
    expect(Infinity, (await run('return callback(1/0)'))[0])
    expect(-Infinity, (await run('return callback(-1/0)'))[0])
    expect(NaN, (await run('return callback(0/0)'))[0])
})

test('JS to Lua serialization', async ({ state, run }) => {
    state.env.set(
        'callback',
        (a: any) => {
            return a
        },
        true,
    )

    expect(null, (await run('return callback(({...})[1])', [null]))[0])
    expect(Infinity, (await run('return callback(({...})[1])', [Infinity]))[0])
    expect(
        -Infinity,
        (await run('return callback(({...})[1])', [-Infinity]))[0],
    )
    expect(NaN, (await run('return callback(({...})[1])', [NaN]))[0])

    expect(-1, (await run('return unpack(callback({...}))', [-1]))[0])
    expect(0, (await run('return unpack(callback({...}))', [0]))[0])
    expect(1, (await run('return unpack(callback({...}))', [1]))[0])
    expect(true, (await run('return unpack(callback({...}))', [true]))[0])
    expect(false, (await run('return unpack(callback({...}))', [false]))[0])
    expect(Math.E, (await run('return unpack(callback({...}))', [Math.E]))[0])
    expect(Math.PI, (await run('return unpack(callback({...}))', [Math.PI]))[0])
    expect(
        Math.sin(1),
        (await run('return unpack(callback({...}))', [Math.sin(1)]))[0],
    )

    expect(
        15,
        (
            await run('t = callback(({...})[1]); return t.a + t.b', [
                { a: 5, b: 10 },
            ])
        )[0],
    )

    expect(
        50000000000000n + 100000000000000n,
        (
            await run(
                't = callback(({...})[1]); return integer.add(t.a, t.b)',
                [{ a: 50000000000000n, b: 100000000000000n }],
            )
        )[0],
    )

    expect(
        4,
        (
            await run('return callback(({...})[1])(1, 2.449489742783179, 3)', [
                Math.hypot,
            ])
        )[0],
    )

    expect(
        5,
        (await run('return callback(#(({...})[1]))', [[1, 2, 3, 4, 5]]))[0],
    )
})
