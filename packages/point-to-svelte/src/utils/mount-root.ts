import { MOUNT_ROOT_RECHECK_DELAY_MS, Z_INDEX_OVERLAY } from "../constants.js";
import { detectCspNonce } from "./detect-csp-nonce.js";
import { hideFromThirdParties } from "./hide-from-third-parties.js";
import { SVELTE_GRAB_ATTRIBUTE_NAME } from "./svelte-grab-attribute-name.js";

// Mounting into <body> (not <html>) keeps the host out of the document element
// the app hydrates. Svelte does not validate DOM structure during hydration the
// way React does, but a stray overlay node under <html> is still invalid markup
// and can confuse layout and devtools.
const attachHostToBody = (host: HTMLElement): void => {
  if (!document.body) return;
  // If the app replaces or clones <body>, a shadowless clone of our host can
  // end up in the new body. Purge those so queries targeting the real host
  // (which owns the shadow DOM) aren't shadowed by the zombie.
  const candidateHosts = document.querySelectorAll<HTMLElement>(`[${SVELTE_GRAB_ATTRIBUTE_NAME}]`);
  for (const candidate of candidateHosts) {
    if (candidate === host) continue;
    if (candidate.parentNode === host) continue;
    if (!candidate.shadowRoot) {
      candidate.remove();
    }
  }
  document.body.appendChild(host);
};

// During parsing (readyState === "loading") <body> may not exist yet, and
// attaching to <html> as a fallback is what triggers the hydration error
// above. Create the host detached and attach once <body> is parsed.
const scheduleHostAttachment = (host: HTMLElement): (() => void) => {
  if (document.body) {
    attachHostToBody(host);
    return () => {};
  }

  const onReady = () => {
    document.removeEventListener("DOMContentLoaded", onReady);
    attachHostToBody(host);
  };
  document.addEventListener("DOMContentLoaded", onReady, { once: true });
  return () => document.removeEventListener("DOMContentLoaded", onReady);
};

const scheduleHostRecheck = (host: HTMLElement): (() => void) => {
  const recheckTimeoutId = window.setTimeout(() => {
    attachHostToBody(host);
  }, MOUNT_ROOT_RECHECK_DELAY_MS);
  const bodyObserver = new MutationObserver(() => {
    if (host.parentNode !== document.body) {
      attachHostToBody(host);
    }
  });
  bodyObserver.observe(document.documentElement, { childList: true });
  return () => {
    window.clearTimeout(recheckTimeoutId);
    bodyObserver.disconnect();
  };
};

interface MountRootResult {
  root: HTMLDivElement;
  host: HTMLElement;
  cancelPendingAttachment: () => void;
}

export const mountRoot = (cssText?: string): MountRootResult => {
  const mountedHosts = document.querySelectorAll<HTMLElement>(`[${SVELTE_GRAB_ATTRIBUTE_NAME}]`);
  for (const mountedHost of mountedHosts) {
    const mountedRoot = mountedHost.shadowRoot?.querySelector(`[${SVELTE_GRAB_ATTRIBUTE_NAME}]`);
    if (mountedRoot instanceof HTMLDivElement) {
      return {
        root: mountedRoot,
        host: mountedHost,
        cancelPendingAttachment: scheduleHostRecheck(mountedHost),
      };
    }
    mountedHost.remove();
  }

  const host = document.createElement("div");

  host.setAttribute(SVELTE_GRAB_ATTRIBUTE_NAME, "true");
  hideFromThirdParties(host);
  host.style.zIndex = String(Z_INDEX_OVERLAY);
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.pointerEvents = "none";
  host.style.contain = "strict";
  const shadowRoot = host.attachShadow({ mode: "open" });

  const styleElement = document.createElement("style");
  const nonce = detectCspNonce();
  if (nonce) styleElement.nonce = nonce;
  styleElement.textContent = cssText ?? "";
  shadowRoot.appendChild(styleElement);

  const root = document.createElement("div");

  root.setAttribute(SVELTE_GRAB_ATTRIBUTE_NAME, "true");

  shadowRoot.appendChild(root);

  const cancelReadyAttachment = scheduleHostAttachment(host);
  // Re-appending after a delay handles two cases: framework hydration
  // (SvelteKit route swaps, HMR) may blow away the DOM and remove our host, and
  // another tool (e.g. svelte-scan) may have appended at the same z-index where
  // last DOM child wins the stacking tiebreaker. Moving an already-attached node
  // via appendChild is atomic with no flash or reflow.
  const cancelHostRecheck = scheduleHostRecheck(host);

  return {
    root,
    host,
    cancelPendingAttachment: () => {
      cancelReadyAttachment();
      cancelHostRecheck();
    },
  };
};
