const InternalLuauWasmModule = require("./lib/Luau.Web")
const Luau = InternalLuauWasmModule

class CompileError extends Error {
    constructor(message) {
        super(message);
        this.name = "CompileError";
    }
}

class LuauState {
    static async createAsync(env) {
        if (!Luau.calledRun) {
            await new Promise(resolve => {
                Luau.onRuntimeInitialized = resolve;
            });
        }

        const instance = new LuauState(env);
        return instance;
    }

    constructor(env) {
        if (env) {
            this.env = env
            Luau.environments = Luau.environments || []
            this.envIdx = Luau.environments.length + 1
            Luau.environments[this.envIdx] = this.env
        } else {
            this.envIdx = 0;
        }

        this.state = Luau.ccall('makeLuaState', 'int', ['number'], [this.envIdx])
    }

    setEnvironment(env) {
        Luau.environments[this.envIdx] = env
    }

    getValue(idx) {
        var transactionId = Luau.ccall('getLuaValue', 'int', ['number', 'number'], [this.state, idx])
        var luauValue = null;
        try {
            luauValue = JSON.parse(Luau.transactionData[transactionId])
        } catch (e) { }
        return Luau.luauToJsValue(this.state, luauValue)
    }

    makeTransaction(value) {
        const idx = Luau.transactionData.length
        Luau.transactionData[idx] = value;

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

module.exports = {
    LuauState,
    CompileError,
    InternalLuauWasmModule
};