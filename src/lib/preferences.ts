// Accessibility preferences. They're saved on the person's profile (see the
// profile_editing_and_preferences migration) and cached on the device so the
// page can apply them before it paints.

export type TextSize = "normal" | "large" | "larger";
export type ReadAloudRate = "slow" | "normal";

export type Preferences = {
  text_size: TextSize;
  high_contrast: boolean;
  read_aloud_rate: ReadAloudRate;
};

export const DEFAULT_PREFERENCES: Preferences = {
  text_size: "normal",
  high_contrast: false,
  read_aloud_rate: "normal",
};

export const PREFERENCES_STORAGE_KEY = "goldenguide:preferences";

/** Speech speed for the Listen buttons. */
export const SPEECH_RATES: Record<ReadAloudRate, number> = {
  slow: 0.75,
  normal: 0.9,
};

export function normalizePreferences(value: unknown): Preferences {
  const v = (value ?? {}) as Partial<Preferences>;
  return {
    text_size:
      v.text_size === "large" || v.text_size === "larger"
        ? v.text_size
        : "normal",
    high_contrast: v.high_contrast === true,
    read_aloud_rate: v.read_aloud_rate === "slow" ? "slow" : "normal",
  };
}

/** Applies preferences to the page and remembers them on this device. */
export function applyPreferences(prefs: Preferences) {
  const root = document.documentElement;
  root.dataset.textSize = prefs.text_size;
  root.dataset.readAloudRate = prefs.read_aloud_rate;
  root.classList.toggle("high-contrast", prefs.high_contrast);
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be blocked; the preferences still apply for this visit.
  }
}

/** Back to defaults, used after signing out so the next person starts fresh. */
export function resetPreferences() {
  applyPreferences(DEFAULT_PREFERENCES);
  try {
    window.localStorage.removeItem(PREFERENCES_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function currentSpeechRate() {
  const rate = document.documentElement.dataset.readAloudRate;
  return SPEECH_RATES[rate === "slow" ? "slow" : "normal"];
}

/**
 * Runs before the page paints (inlined in the root layout) so a saved large
 * text size doesn't flash small first.
 */
export const PREFERENCES_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("${PREFERENCES_STORAGE_KEY}")||"null");if(p){var r=document.documentElement;if(p.text_size==="large"||p.text_size==="larger")r.dataset.textSize=p.text_size;if(p.read_aloud_rate==="slow")r.dataset.readAloudRate="slow";if(p.high_contrast===true)r.classList.add("high-contrast")}}catch(e){}`;
