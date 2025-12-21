import { LuauState, LuauTable } from "../src";

(async () => {
	const state = await LuauState.createAsync({
		add: 5
	});

	state.env?.set("ret", function (a: LuauTable) {
		const buf = a.get("buf");
		for (const [key, value] of a) {
			console.log(String(key), " = ", String(value));
		}
		console.log(state.env?.buffer.readstring(buf, 0, 8))
		return { d: 4, e: 5, f: 6 };
	}, true); // true = bypass readonly

	const code = `
print(add) -- 5
local buf = buffer.create(8)
buffer.writestring(buf, 0, "hellowld")
for key, value in ret({a=1,b=2,c=3,buf=buf}) do
	print("lua", key, value)
end

GLOBAL = "doing something"
`

	const func = state.loadstring(code, "test/index.ts", true);
	console.log(func());

	console.log(state.env?.global.GLOBAL); // "doing something"
})();