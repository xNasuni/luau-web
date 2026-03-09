import InternalLuauWasmModule from "./lib/Luau.Web.js";

var Luau = {
  LUA_VALUE: Symbol("LuaValue"),
  JS_VALUE: Symbol("JsValue"),
  JS_MUTABLE: Symbol("JsMutable"),

  securityTransmitList: new Map(),
  states: [],
};

var Initialized = false;
var InitPromise = null;

async function ensureInitialized() {
  if (InitPromise) return InitPromise;
  if (Initialized) return true;

  InitPromise = (async () => {
    const moduleInstance = await InternalLuauWasmModule(Luau);

    Object.assign(Luau, moduleInstance);

    Initialized = true;
    return true;
  })();

  return InitPromise;
}

class CompileError extends Error {
  constructor(message) {
    super(message);
    this.name = "CompileError";
  }
}

function Mutable(object) {
  if (object instanceof Map) {
    object.set(Luau.JS_MUTABLE, true);
    return object;
  } else {
    const map = new Map(Object.entries(object));
    map.set(Luau.JS_MUTABLE, true);
    return new Proxy(map, {
      get(target, prop) {
        if (typeof target[prop] === "function") {
          return target[prop].bind(target);
        }
        if (target.has(prop)) {
          return target.get(prop);
        }
        return target[prop];
      },
      set(target, prop, value) {
        if (typeof prop === "string") {
          target.set(prop, value);
        } else {
          target[prop] = value;
        }
        return true;
      },
    });
  }
}

class LuauState {
  static async createAsync(initialEnv) {
    await ensureInitialized();

    const instance = new LuauState(initialEnv);
    return instance;
  }

  constructor(initialEnv) {
    if (!Initialized) {
      throw new Error(
        "Luau not initialized. Use LuauState.createAsync() instead of new LuauState()",
      );
    }

    Luau.states = Luau.states || [];
    this.stateIdx = Luau.states.length + 1;
    Luau.states[this.stateIdx] = {};
    Luau.states[this.stateIdx].luaValueCache = new Map();
    Luau.states[this.stateIdx].jsValueCache = new Map();
    Luau.states[this.stateIdx].jsValueReverse = new Map();
    Luau.states[this.stateIdx].transactionData = [];
    Luau.states[this.stateIdx].nextJSRef = -1;
    Luau.states[this.stateIdx].nextTXKey = 0;

    this.destroyed = false;
    this.state = Luau.ccall("makeLuaState", "int", ["number"], [this.stateIdx]);

    // replace env ref with actual environment
    this.env = Luau.states[this.stateIdx].env;

    if (initialEnv) {
      for (const [key, value] of Object.entries(initialEnv)) {
        if (!this.env.set(key, value, true)) {
          Luau.fprintwarn(`illegal state: lua globals key ${key} wasn't set`);
        }
      }
    }
  }

  getValue(idx) {
    if (this.destroyed) {
      throw new CompileError("Cannot use destroyed Luau state");
    }

    var transactionId = Luau.ccall(
      "getLuaValue",
      "int",
      ["number", "number"],
      [this.state, idx],
    );
    var luauValue = null;
    try {
      luauValue = JSON.parse(
        Luau.states[this.stateIdx].transactionData[transactionId],
      );
    } catch (e) {}
    return Luau.luauToJsValue(this.stateIdx, this.state, luauValue);
  }

  makeTransaction(value) {
    if (this.destroyed) {
      throw new CompileError("Cannot use destroyed Luau state");
    }

    const idx = Luau.states[this.stateIdx].nextTXKey++;
    Luau.states[this.stateIdx].transactionData[idx] = value;

    return idx;
  }

  loadstring(source, chunkname = "LuauWeb", throwOnCompilationError = false) {
    if (this.destroyed) {
      throw new CompileError("Cannot use destroyed Luau state");
    }

    const loadStatus = Luau.ccall(
      "luauLoad",
      "int",
      ["number", "number", "number"],
      [
        this.state,
        this.makeTransaction(source),
        this.makeTransaction(chunkname),
      ],
    );
    if (loadStatus != 0) {
      const error = this.getValue(-1);
      if (throwOnCompilationError) {
        throw new CompileError(error);
      }
      return error;
    }

    return this.getValue(-1);
  }

  destroy() {
    if (this.destroyed) {
      throw new CompileError("Cannot use destroyed Luau state");
    }

    this.destroyed = true;
    this.env = null;
    Luau.states[this.stateIdx] = null;

    Luau.ccall("luauClose", "void", ["int"], [this.state]);
  }
}

export { Mutable, LuauState, CompileError, Luau as InternalLuauWasmModule };
