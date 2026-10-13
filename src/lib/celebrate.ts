// Pop & burst (spec §4.7): a small confetti burst and a haptic tap when a habit is logged.
import type { Options } from 'canvas-confetti';

type Fire = (options: Options) => unknown;

/**
 * A small confetti burst from `origin` (0–1 of the viewport), or nothing under reduced motion.
 * canvas-confetti is loaded on first use, so it never runs on the server.
 */
export async function burst(
	origin: { x: number; y: number },
	reducedMotion: boolean,
	fire?: Fire
): Promise<void> {
	if (reducedMotion) return;
	const confetti = fire ?? (await import('canvas-confetti')).default;
	confetti({
		origin,
		particleCount: 24,
		spread: 70,
		startVelocity: 24,
		ticks: 90,
		scalar: 0.8,
		disableForReducedMotion: true
	});
}

/** A short haptic tap where the browser supports it (Android; iOS Safari has no web haptics). */
export function tap(): void {
	globalThis.navigator?.vibrate?.(10);
}
