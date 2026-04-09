/**
 * Tracks whether the student is actively inside a timed quiz/review session.
 *
 * AuthContext reads this flag during the periodic session check. When the
 * access token expires and this guard is active, the system performs a silent
 * refresh instead of immediately triggering a hard logout, protecting progress
 * made during a quiz from being lost mid-session.
 */
let _active = false;

export const quizSessionGuard = {
  enter(): void {
    _active = true;
  },
  leave(): void {
    _active = false;
  },
  isActive(): boolean {
    return _active;
  },
};
