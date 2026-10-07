import { test } from '../../util.ts'
import { Indexable } from '../../../src/index.js'

test('Lua JS class', async ({ state, run }) => {
    class Counter {
        #a = 0

        static getNumber() {
            return 42
        }

        setA(value: number) {
            this.#a = value
        }

        getA() {
            return this.#a
        }
    }

    state.env.set('Counter', Indexable(Counter), true)

    await run(`
        expect(42, Counter.getNumber())

		local ctr = Counter()
		expect(0, ctr.getA())
		ctr.setA(5)

		expect(5, ctr.getA())
		expect(nil, ctr.getNumber)
    `)
})
