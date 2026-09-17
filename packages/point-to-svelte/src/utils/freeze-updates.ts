import { RecoverableError } from "../errors.js";
import { reportRecoverableError } from "./report-recoverable-error.js";

// React Grab pauses the host app's renders while picking by patching React's
// internal dispatcher. Svelte 5 has no equivalent public API, and reaching into
// `svelte/internal/client` would patch a different copy of the runtime than the
// one the app bundled, so app state updates are deliberately NOT paused here.
//
// What still holds the page still during a grab: pointer events are blocked by
// the hit-test shield, CSS/JS animations are paused, animation-frame loops are
// frozen, and pseudo-states are preserved. Apps that need stronger guarantees
// can stop their own timers/subscriptions in the onActivate plugin hook.
export const freezeUpdates = (): (() => void) => () => {};

export const freezeUpdatesOrThrow = (): (() => void) => {
  try {
    return freezeUpdates();
  } catch (error) {
    reportRecoverableError(new RecoverableError("Pausing app updates failed", error));
    return () => {};
  }
};
