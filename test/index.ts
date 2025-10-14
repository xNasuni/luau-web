import { LuauState, Mutable } from "../src";

//todo: implement actual test suite

(async () => {
	const state = await LuauState.createAsync({
		lpool: Mutable({ a: { b: 1 } }),
		test: function (arg: any) {
			console.log(arg, arg.toString())
			return state.env?.lpool.get(arg);
		}
	});

	const func = state.loadstring(`
local lbuf = {7,8,9}
print("a.b", lpool.a.b)
lpool[lbuf] = {4,5,6}
lpool.a = 1000
print("test", test(lbuf))
print("a.", lpool.a)
`, "test/index.ts", true);
	console.log(func());

	console.log("lpool.a", state.env?.lpool['a'])
	console.log("lpool", state.env?.lpool)
})();