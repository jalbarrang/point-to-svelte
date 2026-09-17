<script lang="ts">
  import { onMount } from "svelte";
  import { getGlobalApi, registerPlugin } from "point-to-svelte";
  import { getElementContext } from "point-to-svelte/primitives";

  const TARGETS = [
    { selector: '[data-testid="submit-status"]', label: "status span (page component)" },
    { selector: '[data-testid="todo-row"] .todo-text', label: "todo text (list item component)" },
    { selector: '[data-testid="panel-title"]', label: "panel title (snippet child)" },
  ];

  // The panel is built imperatively and attached to <body>, deliberately outside
  // the element SvelteKit hydrates. Two reasons: a state write or a DOM write
  // inside the app root while hydration is still in flight is reported as
  // `hydration_mismatch`, and diagnostics are exactly the kind of work that runs
  // that early. Rendering nothing here keeps the component hydration-neutral.
  let mountedPanel: HTMLElement | null = null;
  const createText = <Tag extends keyof HTMLElementTagNameMap>(
    tag: Tag,
    className: string,
    text: string,
  ): HTMLElementTagNameMap[Tag] => {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  };

  onMount(() => {
    const panel = document.createElement("section");
    panel.className = "sg-report";

    panel.append(
      createText("h2", "sg-report-heading", "Source resolution report"),
      createText(
        "p",
        "sg-report-note",
        "Produced by getElementContext() from point-to-svelte/primitives against live DOM nodes, so it proves the dev-only __svelte_meta lookup and the copied context format.",
      ),
    );

    const reportList = document.createElement("ul");
    reportList.className = "sg-report-list";
    panel.append(reportList);

    panel.append(
      createText("h2", "sg-report-heading", "Grab the real thing"),
      createText(
        "p",
        "sg-report-note",
        "Activating the overlay normally needs a key hold or the toolbar toggle, both of which live inside the overlay's shadow root. These buttons drive the public API and dispatch synthetic pointer events instead; the copied context is captured through the onCopySuccess plugin hook.",
      ),
    );

    const stateLine = createText("p", "sg-report-mono", "");
    const traceLine = createText("p", "sg-report-mono", "");
    const hoverLine = createText("p", "sg-report-mono", "");

    const copiedBlock = document.createElement("div");
    copiedBlock.className = "sg-report-copied";
    copiedBlock.hidden = true;
    const copiedLabel = createText("div", "sg-report-copied-label", "");
    const copiedPre = document.createElement("pre");
    copiedPre.className = "sg-report-pre";
    copiedPre.dataset.testid = "copied-context";
    copiedBlock.append(copiedLabel, copiedPre);

    const writeState = () => {
      const api = getGlobalApi();
      if (!api) {
        stateLine.textContent = "no global api";
        return;
      }
      const overlayHosts = document.querySelectorAll("[data-point-to-svelte]").length;
      stateLine.textContent = `enabled=${api.isEnabled()} active=${api.isActive()} hosts=${overlayHosts} plugins=${api
        .getPlugins()
        .join("|")}`;
    };

    const writeTrace = (message: string) => {
      traceLine.textContent = message;
    };

    const writeCopied = (content: string) => {
      copiedPre.textContent = content;
      copiedLabel.textContent = `Last copied context (${new Date().toLocaleTimeString()})`;
      copiedBlock.hidden = false;
    };

    const describeElement = (element: Element): string =>
      `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).split(" ")[0]}` : ""}`;

    const dispatchGrab = (selector: string) => {
      const target = document.querySelector(selector);
      if (!target) {
        writeTrace(`target not found: ${selector}`);
        return;
      }

      const api = getGlobalApi();
      if (!api) {
        writeTrace("no global api");
        return;
      }

      target.scrollIntoView({ block: "center" });
      api.activate();

      const rect = target.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;

      // A synthetic pointermove reaches the same window-level listener and
      // `document.elementsFromPoint` hit test a real mouse would. The copy
      // itself is committed on pointerup, so down/up are dispatched too.
      const dispatchPointerEvent = (type: string, buttons: number) => {
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            isPrimary: true,
            pointerId: 1,
            pointerType: "mouse",
            button: 0,
            buttons,
            clientX,
            clientY,
          }),
        );
      };

      setTimeout(() => dispatchPointerEvent("pointermove", 0), 250);
      setTimeout(() => dispatchPointerEvent("pointermove", 0), 400);
      setTimeout(() => {
        dispatchPointerEvent("pointermove", 0);
        dispatchPointerEvent("pointerdown", 1);
        writeTrace(`pointerdown on ${selector}`);
      }, 550);
      setTimeout(() => {
        dispatchPointerEvent("pointerup", 0);
        writeTrace(`grabbed ${selector} at ${Math.round(clientX)},${Math.round(clientY)}`);
      }, 700);
    };

    const actions = document.createElement("div");
    actions.className = "sg-report-actions";
    const addAction = (label: string, onClick: () => void) => {
      const button = createText("button", "sg-report-button", label);
      button.type = "button";
      button.addEventListener("click", onClick);
      actions.append(button);
    };
    addAction("Activate overlay", () => {
      getGlobalApi()?.activate();
      writeTrace("activate() called");
    });
    addAction("Deactivate", () => {
      getGlobalApi()?.deactivate();
      writeTrace("deactivate() called");
    });
    addAction('Grab "Sign in" button', () => dispatchGrab("button.submit-button"));
    addAction("Grab first todo text", () => dispatchGrab('[data-testid="todo-row"] .todo-text'));
    panel.append(actions, stateLine, traceLine, hoverLine, copiedBlock);

    registerPlugin({
      name: "playground-copy-capture",
      hooks: {
        onElementHover: (element) => {
          hoverLine.textContent = `hover: ${describeElement(element)}`;
        },
        onElementSelect: (element) => {
          hoverLine.textContent = `select: ${describeElement(element)}`;
        },
        onCopySuccess: (_elements, content) => writeCopied(content),
        onCopyError: (error) => writeCopied(`copy failed: ${error.message}`),
      },
    });

    const renderReports = async () => {
      reportList.replaceChildren();
      for (const target of TARGETS) {
        const element = document.querySelector(target.selector);
        if (!element) continue;
        const context = await getElementContext(element);

        const item = document.createElement("li");
        item.className = "sg-report-item";
        item.append(createText("div", "sg-report-target", target.label));

        const meta = document.createElement("div");
        meta.className = "sg-report-meta";
        for (const [key, value] of [
          ["component", context.componentName ?? "—"],
          ["file", context.filePath ?? "—"],
          ["line", context.lineNumber ?? "—"],
          ["column", context.columnNumber ?? "—"],
        ] as const) {
          const chip = document.createElement("span");
          const label = document.createElement("strong");
          label.textContent = key;
          chip.append(label, ` ${value}`);
          meta.append(chip);
        }

        const snippet = document.createElement("pre");
        snippet.className = "sg-report-pre";
        snippet.textContent = context.snippet;
        item.append(meta, snippet);
        reportList.append(item);
      }
    };

    document.body.append(panel);
    mountedPanel = panel;

    const stateInterval = setInterval(writeState, 400);
    writeState();
    void renderReports();

    return () => {
      clearInterval(stateInterval);
      panel.remove();
      mountedPanel = null;
    };
  });
</script>