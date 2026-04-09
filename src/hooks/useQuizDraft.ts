import { useCallback } from 'react';
import { assignmentService } from '../services/assignmentService';

/**
 * The shape of a quiz draft persisted in localStorage.
 * Scoped to a specific assignmentId to prevent cross-quiz contamination.
 */
export interface QuizDraftState {
  assignmentId: number;
  /** Map of questionId → answerRefId (the ID of the chosen answer option). */
  answers: Record<number, number>;
  /** The question index the student was on when the draft was last saved. */
  currentQuestion: number;
  /** Wall-clock time (ms) when this draft was written. */
  savedAt: number;
}

const DRAFT_PREFIX = 'quiz_draft_';

/**
 * Provides draft persistence for a quiz session.
 *
 * - `saveDraft`     — write current state to localStorage (called on every answer select)
 * - `loadDraft`     — read the saved draft (called when entering taking mode)
 * - `clearDraft`    — remove the local draft (called after successful submission)
 * - `syncToServer`  — push the draft to the backend as a DB backup (fire-and-forget)
 * - `deleteDraftFromServer` — remove the server-side draft after submission
 */
export function useQuizDraft(assignmentId: number | undefined) {
  const key = assignmentId != null ? `${DRAFT_PREFIX}${assignmentId}` : null;

  const saveDraft = useCallback(
    (answers: Record<number, number>, currentQuestion: number) => {
      if (!key || assignmentId == null) return;
      const draft: QuizDraftState = {
        assignmentId,
        answers,
        currentQuestion,
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(key, JSON.stringify(draft));
      } catch {
        // localStorage quota exceeded — draft is best-effort, silently ignore
      }
    },
    [key, assignmentId]
  );

  const loadDraft = useCallback((): QuizDraftState | null => {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as QuizDraftState;
    } catch {
      return null;
    }
  }, [key]);

  const clearDraft = useCallback(() => {
    if (key) localStorage.removeItem(key);
  }, [key]);

  /**
   * Sync the current draft state to the server for DB-level backup.
   * Failures are silently swallowed — localStorage is the primary store.
   */
  const syncToServer = useCallback(
    async (answers: Record<number, number>, currentQuestion: number, token: string) => {
      if (assignmentId == null) return;
      try {
        await assignmentService.saveDraft(
          assignmentId,
          {
            answers: Object.entries(answers).map(([qId, aId]) => ({
              questionId: Number(qId),
              answerRefId: aId,
            })),
            currentQuestion,
          },
          token
        );
      } catch {
        // Server sync is best-effort; localStorage is the primary backup
      }
    },
    [assignmentId]
  );

  /**
   * Remove the server-side draft record.
   * Called after a successful submission. Failures are silently ignored
   * because the backend treats submissions with status=SUBMITTED as having
   * no valid draft anyway.
   */
  const deleteDraftFromServer = useCallback(
    async (token: string) => {
      if (assignmentId == null) return;
      try {
        await assignmentService.deleteDraft(assignmentId, token);
      } catch {
        // Ignore — stale draft will be rejected on next GET since the
        // submission status will no longer be IN_PROGRESS
      }
    },
    [assignmentId]
  );

  return { saveDraft, loadDraft, clearDraft, syncToServer, deleteDraftFromServer };
}
