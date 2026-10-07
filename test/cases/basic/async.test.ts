import { test, expectLossy } from '../../util.ts'

test('Lua JS wait', async ({ state, run }) => {
    state.env.set(
        'wait',
        async function (n: number) {
            return new Promise(resolve => setTimeout(resolve, n * 1000))
        },
        true,
    )

    const timeTestSrc = `
        local start = os.clock()
        wait(0.5)
        return os.clock() - start
    `

    const runtimeSecs = (await run(timeTestSrc))[0]

    expectLossy(0.5, runtimeSecs, 0.1, 'runtime seconds')
})
