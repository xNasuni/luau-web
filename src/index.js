let InternalLuauWasmModule

if ('Suspending' in WebAssembly && 'promising' in WebAssembly) {
    InternalLuauWasmModule = (await import('./lib/Luau.Web.JSPI.js')).default
} else {
    InternalLuauWasmModule = (await import('./lib/Luau.Web.Asyncify.js'))
        .default
}

var Luau = {
    LUA_VALUE: Symbol('LuaValue'),
    JS_VALUE: Symbol('JsValue'),
    JS_MUTABLE: Symbol('JsMutable'),

    securityTransmitList: new Map(),
    options: new Map([['LUA_IMPLICIT_ARRAYS_TO_JS_ARRAYS', true]]),
    states: [],
}

var Initialized = false
var InitPromise = null

async function ensureInitialized() {
    if (InitPromise) return InitPromise
    if (Initialized) return true

    InitPromise = (async () => {
        const moduleInstance = await InternalLuauWasmModule(Luau)

        Object.assign(Luau, moduleInstance)

        Initialized = true
        return true
    })()

    return InitPromise
}

class CompileError extends Error {
    constructor(message) {
        super(message)
        this.name = 'CompileError'
    }
}

function Mutable(object) {
    const map = object instanceof Map ? object : new Map(Object.entries(object))
    map.set(Luau.JS_MUTABLE, true)

    const proxy = new Proxy(map, {
        get(target, prop, receiver) {
            const val = Reflect.get(target, prop, receiver)
            if (typeof val === 'function') return val.bind(target)
            if (target.has(prop)) return target.get(prop)
            return val
        },
        set(target, prop, value) {
            target.set(prop, value)
            return true
        },
        getPrototypeOf() {
            return Map.prototype
        },
    })

    return proxy
}

class LuauState {
    static async createAsync(initialEnv) {
        await ensureInitialized()

        const instance = new LuauState()
        instance.state = await Luau._makeLuaState(instance.stateIdx)
        instance.env = Luau.states[instance.stateIdx].env

        if (initialEnv) {
            for (const [key, value] of Object.entries(initialEnv)) {
                if (!instance.env.set(key, value, true)) {
                    Luau.fprintwarn(
                        `illegal state: lua globals key ${key} wasn't set`,
                    )
                }
            }
        }

        return instance
    }

    constructor() {
        if (!Initialized) {
            throw new Error(
                'Luau not initialized. Use LuauState.createAsync() instead of new LuauState()',
            )
        }

        Luau.states = Luau.states || []
        this.stateIdx = Luau.states.length + 1
        Luau.states[this.stateIdx] = {}
        Luau.states[this.stateIdx].luaValueCache = new Map()
        Luau.states[this.stateIdx].jsValueCache = new Map()
        Luau.states[this.stateIdx].jsValueReverse = new Map()
        Luau.states[this.stateIdx].transactionData = []
        Luau.states[this.stateIdx].nextJSRef = -1
        Luau.states[this.stateIdx].nextTXKey = 0

        this.destroyed = false
        this.state = null
        this.env = null
    }

    getValue(idx) {
        if (this.destroyed) {
            throw new Luau.GlueError('Cannot use destroyed Luau state')
        }

        var transactionId = Luau._getLuaValue(this.state, idx)
        var luauValue = null
        try {
            luauValue = JSON.parse(
                Luau.states[this.stateIdx].transactionData[transactionId],
            )
        } catch (e) {}
        return Luau.luauToJsValue(this.stateIdx, this.state, luauValue)
    }

    makeTransaction(value) {
        if (this.destroyed) {
            throw new Luau.GlueError('Cannot use destroyed Luau state')
        }

        const idx = Luau.states[this.stateIdx].nextTXKey++
        Luau.states[this.stateIdx].transactionData[idx] = value

        return idx
    }

    loadstring(source, chunkname = 'LuauWeb', throwOnCompilationError = false) {
        if (this.destroyed) {
            throw new Luau.GlueError('Cannot use destroyed Luau state')
        }

        const loadStatus = Luau._luauLoad(
            this.state,
            this.makeTransaction(source),
            this.makeTransaction(chunkname),
        )

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
        if (this.destroyed) {
            throw new Luau.GlueError('Cannot use destroyed Luau state')
        }

        this.destroyed = true
        this.env = null
        Luau.states[this.stateIdx] = null

        Luau._luauClose(this.state)
    }
}

export { Mutable, LuauState, CompileError, Luau as InternalLuauWasmModule }
