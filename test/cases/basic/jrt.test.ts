import { test, expect } from '../../util.ts'

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
