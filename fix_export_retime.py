import re

with open("services/exportPolicy.ts", "r", encoding="utf-8") as f:
    content = f.read()

# For a 1 million line file to finish in 5 minutes at x100 speed, the simulation must take massive jumps.
# toPlaybackSpeed previously only capped at ~500. Let's make the math scale aggressively so the "fast path"
# actually runs the simulation blazingly fast when speed slider > 50

old_playback = """function toPlaybackSpeed(speed: number): number {
  if (speed <= 40) {
    return 0.1 + (speed / 40) * 1.9;
  }

  const t = (speed - 40) / 60;
  return 2 + Math.pow(t, 3) * 500;
}"""

new_playback = """function toPlaybackSpeed(speed: number): number {
  if (speed <= 40) {
    return 0.1 + (speed / 40) * 1.9;
  }

  // At high speeds, make it exponentially faster so long files finish instantly
  const t = (speed - 40) / 60; // 0.0 to 1.0
  // Instead of maxing at 500x, let's max at 50000x for speed 100!
  // This means the timeline sampler will leap over thousands of lines per frame.
  return 2 + Math.pow(t, 4) * 50000;
}"""

content = content.replace(old_playback, new_playback)

with open("services/exportPolicy.ts", "w", encoding="utf-8") as f:
    f.write(content)
