/** Static stand-in behind the hero until the crystal's first frame. No WebGL. */
export function SceneBackdrop() {
  return (
    <div
      id="scene-backdrop"
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-full w-full bg-gradient-to-b from-[#B8A9C9] via-[#E8C4A0] to-[#F3EDE4] dark:from-[#211B19] dark:via-[#29211E] dark:to-[#171514]"
    />
  );
}
