import { useState, useEffect, useCallback } from 'react';
import { sessionTimer, ExamSessionState } from '../services/sessionTimerService';

export function useExamSessionTimer() {
  const [sessionState, setSessionState] = useState<ExamSessionState>(sessionTimer.getState());
  const [formattedTime, setFormattedTime] = useState<string>(sessionTimer.getFormattedTime());

  useEffect(() => {
    const unsubscribe = sessionTimer.subscribe((state, formatted) => {
      setSessionState(state);
      setFormattedTime(formatted);
    });
    return unsubscribe;
  }, []);

  const startTimer = useCallback(() => sessionTimer.start(), []);
  const pauseTimer = useCallback(() => sessionTimer.pause(), []);
  const resetTimer = useCallback(() => sessionTimer.reset(), []);
  const startNewSession = useCallback(
    (customId?: string, customName?: string) => sessionTimer.newSession(customId, customName),
    []
  );

  return {
    sessionState,
    formattedTime,
    isRunning: sessionState.isRunning,
    sessionId: sessionState.sessionId,
    sessionName: sessionState.sessionName,
    startTimer,
    pauseTimer,
    resetTimer,
    startNewSession,
  };
}
