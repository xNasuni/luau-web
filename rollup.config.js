import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"

export default {
	input: "src/index.js",
	output: {
		file: "dist/luauweb.min.js",
		format: "es",
		name: "LuauWeb",
		sourcemap: false,
		inlineDynamicImports: true
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
}