import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"

export default [{
	input: "src/luauweb.js",
	output: {
		file: "dist/luauweb.min.js",
		format: "umd",
		name: "LuauWeb",
		sourcemap: false
	},
	plugins: [{
		name: "stub-fs",
		resolveId(id) {
			if (id === "fs") return id
			return null
		},
		load(id) {
			if (id === "fs") {
				return "export default {}"
			}
			return null
		}
	},
	resolve({ browser: true, preferBuiltins: false }),
	commonjs()
	]
},
{
	input: "src/luauweb.js",
	output: {
		file: "dist/luauweb.cjs",
		format: "cjs",
		sourcemap: false
	},
	external: ["fs", "path", "crypto"],
	plugins: [
		resolve({ preferBuiltins: true }),
		commonjs()
	]
}
]