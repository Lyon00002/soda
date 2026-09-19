/**
 * Readiness gate for the opening sequence.
 *
 * The entrance builds to the 3D can, and the heaviest work on the page happens
 * in exactly the window the entrance wants to play in: four GLBs decoding, a
 * 2048px base-colour texture uploading and fourteen model-viewer scenes
 * initialising. Starting the timeline on `fonts.ready` alone means it animates
 * straight through that spike, which is what makes the first impression stutter.
 *
 * So the entrance waits for the product itself, with a timeout so a slow or
 * failed model can never leave the page hidden.
 */

let resolveReady: (() => void) | null = null;

const readyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

/** Called once the can's GLB has loaded and its first frame is rendered. */
export function signalStageReady(): void {
  resolveReady?.();
  resolveReady = null;
}

/**
 * Resolves when the stage is ready, or when `timeoutMs` elapses, whichever
 * comes first. Never rejects: a missing model degrades to the timeout.
 */
export function whenStageReady(timeoutMs: number): Promise<void> {
  return Promise.race([
    readyPromise,
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
