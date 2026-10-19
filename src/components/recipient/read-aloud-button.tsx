"use client";

import { useEffect, useState } from "react";
import { IconStop, IconVolume } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { currentSpeechRate } from "~/lib/preferences";
import { cn } from "~/lib/utils";

/**
 * Reads text out loud with the browser's built-in voice (free, no AI).
 * Hidden on browsers without speech support. Speech stops when the text
 * changes (for example on the next lesson step) or the button unmounts.
 */
export function ReadAloudButton({
  text,
  label = "Listen",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: stop speaking whenever the text changes
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setSpeaking(false);
    };
  }, [text]);

  if (!supported || !text.trim()) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Follows the "Reading speed" setting (slightly slow by default).
    utterance.rate = currentSpeechRate();
    utterance.lang = "en-US";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={toggle}
      aria-pressed={speaking}
      className={cn("h-12 gap-2 px-5 text-lg", className)}
    >
      {speaking ? (
        <IconStop className="size-5" />
      ) : (
        <IconVolume className="size-6" />
      )}
      {speaking ? "Stop" : label}
    </Button>
  );
}
