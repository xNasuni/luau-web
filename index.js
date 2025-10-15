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

		const log = (text) => {
			console.log(text, text.length);
			const model = output.getModel();
			const current = model.getValue();
			model.setValue(current + (current ? "\n" : "") + text);
			if (storedScrollOnPrint) {
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
					exec();
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
