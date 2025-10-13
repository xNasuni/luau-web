import { LuauState } from "../src";

//todo: implement actual test suite

(async () => {
	const objref = {};

	const state = await LuauState.createAsync({
		lpool: objref
	});

	const func = state.loadstring(`
lpool.a = true;
`, "test/index.ts", true);
	console.log(func());

	console.log("lua values:", objref)
})();