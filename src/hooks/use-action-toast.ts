"use client";

import { useEffect, useRef } from "react";
import { toastError, toastSuccess } from "@/lib/toast";

type ActionToastState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function firstFieldError(fieldErrors?: Record<string, string[]>) {
  if (!fieldErrors) return undefined;
  for (const messages of Object.values(fieldErrors)) {
    const message = messages[0];
    if (message) return message;
  }
  return undefined;
}

export function useActionToast(
  state: ActionToastState,
  {
    successMessage,
    onSuccess,
  }: {
    successMessage?: string;
    onSuccess?: () => void;
  } = {},
) {
  const handledSuccess = useRef(false);
  const lastError = useRef<string | undefined>(undefined);
  const lastFieldError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.success && successMessage && !handledSuccess.current) {
      handledSuccess.current = true;
      toastSuccess(successMessage);
      onSuccess?.();
    }

    if (!state.success) {
      handledSuccess.current = false;
    }
  }, [state.success, successMessage, onSuccess]);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      lastError.current = state.error;
      toastError(state.error);
    }

    if (!state.error) {
      lastError.current = undefined;
    }
  }, [state.error]);

  useEffect(() => {
    const message = firstFieldError(state.fieldErrors);
    if (message && message !== lastFieldError.current) {
      lastFieldError.current = message;
      toastError(message);
    }

    if (!message) {
      lastFieldError.current = undefined;
    }
  }, [state.fieldErrors]);
}
