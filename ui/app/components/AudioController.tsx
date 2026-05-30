"use client";

import { useEffect } from "react";
import { playKeystroke, playClick } from "@/app/hooks/useAudio";

// Global audio controller, mounted once in the root layout. Two sounds, both
// synthesized and both respecting the mute toggle:
//   1. keypad tick   — on each keystroke in a text field
//   2. sci-fi chunk  — on any button / link / control activation (delegated)

const TEXT_INPUT_TYPES = new Set([
  "text",
  "password",
  "search",
  "email",
  "url",
  "tel",
  "number",
  "",
]);

function isTextField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(el.type);
  return false;
}

const SILENT_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "Tab",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

// Does this element (or an ancestor) count as a clickable control?
function isControl(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  return !!el.closest(
    'button, a, [role="button"], summary, label, select, input[type="checkbox"], input[type="radio"]',
  );
}

export default function AudioController() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (SILENT_KEYS.has(e.key)) return;
      if (!isTextField(e.target)) return;
      playKeystroke();
    }

    // Use pointerdown (fires before click, feels immediate). Capture phase so
    // we still hear it even if a handler stops propagation.
    function onPointerDown(e: PointerEvent) {
      if (isControl(e.target)) playClick();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      });
    };
  }, []);

  return null;
}
