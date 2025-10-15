(async () => {
	while (typeof require === "undefined") {
		await new Promise((r) => setTimeout(r, 10));
	}

	require.config({
		paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs" },
	});

	require(["vs/editor/editor.main"], async () => {
		var storedScript =
			localStorage.getItem("script") || "-- welcome to luau web playground";
		var storedOutput = localStorage.getItem("output") || "";
		var storedClearOnExecute = localStorage.getItem("clear_on_exec") === "true";
		var storedScrollOnPrint =
			(localStorage.getItem("scroll_on_print") ?? "true") === "true";
		var storedPaneWidth = localStorage.getItem("pane_width") || "60";

		var executeButton = document.getElementById("execute");
		var clearButton = document.getElementById("clear");
		var clearOnExecToggle = document.getElementById("clearonexec");
		var scrollOnPrintToggle = document.getElementById("scrollonprint");
		var leftPane = document.getElementById("leftPane");
		var resizer = document.getElementById("resizer");

		clearOnExecToggle.checked = storedClearOnExecute;
		scrollOnPrintToggle.checked = storedScrollOnPrint;
		leftPane.style.flex = `0 0 ${storedPaneWidth}%`;

		const editor = monaco.editor.create(document.getElementById("editor"), {
			value: storedScript,
			language: "lua",
			theme: "vs-dark",
			automaticLayout: true,
		});

		const output = monaco.editor.create(document.getElementById("output"), {
			value: storedOutput,
			language: "text",
			readOnly: true,
			minimap: { enabled: false },
			wordWrap: "on",
			automaticLayout: true,
		});

		editor.focus();

		(() => {
			const luaGlobals = {
				_VERSION: "F",
				_G: "F",
				assert: "M",
				error: "M",
				gcinfo: "M",
				getfenv: "M",
				getmetatable: "M",
				next: "M",
				newproxy: "M",
				print: "M",
				rawequal: "M",
				rawget: "M",
				rawlen: "M",
				rawset: "M",
				select: "M",
				setfenv: "M",
				setmetatable: "M",
				tonumber: "M",
				tostring: "M",
				type: "M",
				typeof: "M",
				ipairs: "M",
				pairs: "M",
				pcall: "M",
				xpcall: "M",
				unpack: "M",
				math: [
					"abs",
					"acos",
					"asin",
					"atan2",
					"atan",
					"ceil",
					"cosh",
					"cos",
					"deg",
					"exp",
					"floor",
					"fmod",
					"frexp",
					"ldexp",
					"lerp",
					"map",
					"log10",
					"log",
					"max",
					"min",
					"modf",
					"pow",
					"rad",
					"random",
					"randomseed",
					"sinh",
					"sin",
					"sqrt",
					"tanh",
					"tan",
					"noise",
					"clamp",
					"sign",
					"round",
				],
				table: [
					"concat",
					"foreach",
					"foreachi",
					"getn",
					"maxn",
					"insert",
					"remove",
					"sort",
					"pack",
					"unpack",
					"move",
					"create",
					"find",
					"clear",
					"freeze",
					"isfrozen",
					"clone",
				],
				string: [
					"byte",
					"char",
					"find",
					"format",
					"gmatch",
					"gsub",
					"len",
					"lower",
					"match",
					"rep",
					"reverse",
					"sub",
					"upper",
					"split",
					"pack",
					"packsize",
					"unpack",
				],
				coroutine: [
					"create",
					"running",
					"status",
					"wrap",
					"yield",
					"isyieldable",
					"resume",
					"close",
				],
				bit32: [
					"arshift",
					"band",
					"bnot",
					"bor",
					"bxor",
					"btest",
					"extract",
					"lrotate",
					"lshift",
					"replace",
					"rrotate",
					"rshift",
					"countlz",
					"countrz",
					"byteswap",
				],
				utf8: ["offset", "codepoint", "char", "len", "codes"],
				os: ["clock", "date", "difftime", "time"],
				debug: ["info", "traceback"],
				buffer: [
					"create",
					"fromstring",
					"tostring",
					"len",
					"readi8",
					"readu8",
					"readi16",
					"readu16",
					"readi32",
					"readu32",
					"readf32",
					"readf64",
					"writei8",
					"writeu8",
					"writei16",
					"writeu16",
					"writei32",
					"writeu32",
					"writef32",
					"writef64",
					"readstring",
					"writestring",
					"readbits",
					"writebits",
					"copy",
					"fill",
				],
				vector: [
					"Fzero",
					"Fone",
					"create",
					"magnitude",
					"normalize",
					"cross",
					"dot",
					"angle",
					"floor",
					"ceil",
					"abs",
					"sign",
					"clamp",
					"max",
					"min",
				],
			};

			function generateTopLevelCompletionItems(obj) {
				const items = [];
				for (const key in obj) {
					items.push({
						label: key,
						kind: Array.isArray(obj[key])
							? monaco.languages.CompletionItemKind.Module
							: obj[key] === "F"
								? monaco.languages.CompletionItemKind.Field
								: monaco.languages.CompletionItemKind.Function,
						insertText: key,
					});
				}
				return items;
			}

			function generateNestedCompletionItems(obj, parent) {
				if (!obj[parent] || !Array.isArray(obj[parent])) return [];
				return obj[parent].map((fn) => ({
					label: fn.substr(0, 1) === "F" ? fn.substr(1) : fn,
					kind:
						fn.substr(0, 1) === "F"
							? monaco.languages.CompletionItemKind.Field
							: monaco.languages.CompletionItemKind.Function,
					insertText: fn.substr(0, 1) === "F" ? fn.substr(1) : fn,
					filterText: `${parent}.${fn.substr(0, 1) === "F" ? fn.substr(1) : fn}`,
				}));
			}

			monaco.languages.registerCompletionItemProvider("lua", {
				triggerCharacters: ["."],
				provideCompletionItems: (model, position) => {
					const textUntilPosition = model.getValueInRange({
						startLineNumber: position.lineNumber,
						startColumn: 1,
						endLineNumber: position.lineNumber,
						endColumn: position.column,
					});

					const match = textUntilPosition.match(/(\w+)\.$/);
					if (match) {
						const parent = match[1];
						return {
							suggestions: generateNestedCompletionItems(luaGlobals, parent),
						};
					}

					return { suggestions: generateTopLevelCompletionItems(luaGlobals) };
				},
			});
		})();

		const log = (...args) => {
			const text = args.map((v) => v?.toString() ?? String(v)).join(" ");
			const model = output.getModel();
			const current = model.getValue();
			model.setValue(current + (current ? "\n" : "") + text);
			if (scrollOnPrintToggle.checked) {
				output.revealLine(model.getLineCount());
			}
			localStorage.setItem("output", output.getValue());
		};

		const state = await LuauWeb.LuauState.createAsync({
			print: log,
		});

		function clear() {
			output.getModel().setValue("");
			localStorage.setItem("output", output.getValue());
		}

		function getErrorLine(err) {
			const match = (String(err) ?? "").match(
				/(?:LuaError:\s*)?\[string ".*"\]:(\d+):/,
			);
			if (match) return parseInt(match[1], 10);
			return null;
		}

		let currentErrorDecoration = [];
		let isUpdatingDecorations = false;
		let externalEventListener = null;

		function highlightErrorLine(line) {
			if (isUpdatingDecorations) return;

			isUpdatingDecorations = true;
			currentErrorDecoration = editor.deltaDecorations(currentErrorDecoration, [
				{
					range: new monaco.Range(line, 1, line, 1),
					options: {
						isWholeLine: true,
						className: "errorLineHighlight",
					},
				},
			]);
			isUpdatingDecorations = false;
			externalEventListener = () => {
				if (!isUpdatingDecorations) {
					isUpdatingDecorations = true;
					editor.deltaDecorations(currentErrorDecoration, []);
					currentErrorDecoration = [];
					isUpdatingDecorations = false;
				}

				disposable.dispose();
				externalEventListener = null;
			};

			const disposable = editor.onDidChangeModelContent(externalEventListener);
		}

		function execute() {
			if (externalEventListener != null) {
				externalEventListener();
			}

			function handleError(e) {
				const line = getErrorLine(e);
				if (line != null) {
					highlightErrorLine(line);
				}

				log(e);
			}

			if (clearOnExecToggle.checked) {
				clear();
			}

			const exec = state.loadstring(editor.getModel().getValue());
			if (typeof exec === "function") {
				try {
					const data = exec();
					if (data && Array.isArray(data) && data.length >= 1) {
						log("execution returned data:", ...data);
					}
				} catch (e) {
					handleError(e);
				}
				return;
			}
			handleError(exec);
		}

		executeButton.onclick = execute;
		clearButton.onclick = clear;

		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, execute);
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, clear);
		output.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, clear);

		editor.onDidChangeModelContent(() => {
			localStorage.setItem("script", editor.getValue());
		});

		clearOnExecToggle.addEventListener("change", () => {
			localStorage.setItem("clear_on_exec", clearOnExecToggle.checked);
		});

		scrollOnPrintToggle.addEventListener("change", () => {
			localStorage.setItem("scroll_on_print", scrollOnPrintToggle.checked);
		});

		let isResizing = false;

		resizer.addEventListener("mousedown", (e) => {
			isResizing = true;
			resizer.classList.add("dragging");
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
			e.preventDefault();
		});

		document.addEventListener("mousemove", (e) => {
			if (!isResizing) return;
			e.preventDefault();

			const containerRect = document
				.getElementById("monaco")
				.getBoundingClientRect();
			const newWidth =
				((e.clientX - containerRect.left) / containerRect.width) * 100;

			const clampedWidth = Math.min(80, Math.max(20, newWidth));
			leftPane.style.width = `${clampedWidth}%`;
			leftPane.style.flex = "none";
			localStorage.setItem("pane_width", clampedWidth);
		});

		document.addEventListener("mouseup", () => {
			if (isResizing) {
				isResizing = false;
				resizer.classList.remove("dragging");
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			}
		});
	});
})();
