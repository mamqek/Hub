# Repository Instructions

- Do not run tests, builds, or verification commands unless the user explicitly asks for them.
- When modifying code, actively look for newly unused or obsolete code introduced by the change. Delete it if it is clearly unused. If removal is uncertain because it may be disabled, staged, or externally referenced, call it out in the response and ask before removing it.
- Prefer functional fixes over defensive auto-healing. Do not silently normalize, reshape, or mask flawed behavior just to make code keep working. Fix the bug at its source. If validation is needed, fail clearly instead of mutating bad data into a different shape.
