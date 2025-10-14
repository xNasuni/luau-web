import { LuauState, Mutable } from "../src";

//todo: implement actual test suite

(async () => {
	const state = await LuauState.createAsync({
		lpool: Mutable({ a: { b: 1 } }),
		test: function (arg: any) {
			return state.env?.lpool.get(arg);
		}
	});

	const func = state.loadstring(`
local lbuf = buffer.create(32)
print(lpool.a.b)
lpool[lbuf] = {4,5,6}
lpool.a = 1000
print(test(lbuf))
`, "test/index.ts", true);
	console.log(func());

	console.log(state.env?.lpool['a'])
	console.log("lua values:", state.env?.lpool)
})();