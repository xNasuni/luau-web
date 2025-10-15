import InternalLuauWasmModule from "./lib/Luau.Web.js"

var Luau = {
    LUA_VALUE: Symbol("LuaValue"),
    JS_VALUE: Symbol("JsValue"),
    JS_MUTABLE: Symbol("JsMutable"),

    luaValueCache: new Map(),
    jsValueCache: new Map(),
    jsValueReverse: new Map(),

    transactionData: [],
    environments: [],

    nextJSRef: -1,
    nextTXKey: 0
}

var Initialized = false

async function ensureInitialized() {
    if (!Initialized) {
        await InternalLuauWasmModule(Luau)
        Initialized = true
    }

    return Initialized
}

ensureInitialized()

class CompileError extends Error {
    constructor(message) {
        super(message)
        this.name = "CompileError"
    }
}

function Mutable(object) {
    if (object instanceof Map) {
        object.set(Luau.JS_MUTABLE, true)
        return object
    } else {
        const map = new Map(Object.entries(object))
        map.set(Luau.JS_MUTABLE, true)
        return new Proxy(map, {
            get(target, prop) {
                if (typeof target[prop] === "function") {
                    return target[prop].bind(target)
                }
                if (target.has(prop)) {
                    return target.get(prop)
                }
                return target[prop]
            },
            set(target, prop, value) {
                if (typeof prop === "string") {
                    target.set(prop, value)
                } else {
                    target[prop] = value
                }
                return true
            }
        })
    }
}

class LuauState {
    static async createAsync(env) {
        await ensureInitialized()

        const instance = new LuauState(env)
        return instance
    }

    constructor(env) {
        if (!Initialized) {
            throw new Error("Luau not initialized. Use LuauState.createAsync() instead of new LuauState()")
        }

        if (env) {
            this.env = env
            Luau.environments = Luau.environments || []
            this.envIdx = Luau.environments.length + 1
            Luau.environments[this.envIdx] = this.env
        } else {
            this.envIdx = 0
        }

        this.state = Luau.ccall('makeLuaState', 'int', ['number'], [this.envIdx])
    }

    setEnvironment(env) {
        Luau.environments[this.envIdx] = env
    }

    getValue(idx) {
        var transactionId = Luau.ccall('getLuaValue', 'int', ['number', 'number'], [this.state, idx])
        var luauValue = null
        try {
            luauValue = JSON.parse(Luau.transactionData[transactionId])
        } catch (e) { }
        return Luau.luauToJsValue(this.state, luauValue)
    }

    makeTransaction(value) {
        const idx = Luau.nextTXKey++
        Luau.transactionData[idx] = value

        return idx
    }

    loadstring(source, chunkname = "LuauWeb", throwOnCompilationError = false) {
        const loadStatus = Luau.ccall('luauLoad', 'int', ['number', 'number', 'number'], [this.state, this.makeTransaction(source), this.makeTransaction(chunkname)])
        if (loadStatus != 0) {
            const error = this.getValue(-1)
            if (throwOnCompilationError) {
                throw new CompileError(error)
            }
            return error
        }

        return this.getValue(-1)
    }

    destroy() {
        Luau.ccall('luauClose', 'void', ['int'], [this.state])
    }
}

export { Mutable, LuauState, CompileError, Luau as InternalLuauWasmModule }