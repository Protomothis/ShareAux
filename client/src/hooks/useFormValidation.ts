'use client';

import { useCallback, useState } from 'react';

type ValidationRules<T> = { [K in keyof T]?: (value: T[K], values: T) => string | false };

interface UseFormValidationReturn<T> {
  errors: Partial<Record<keyof T, string>>;
  validate: (values: T) => boolean;
  setError: (field: keyof T, message: string) => void;
  clearError: (field: keyof T) => void;
  clearAll: () => void;
}

export function useFormValidation<T extends object>(rules: ValidationRules<T>): UseFormValidationReturn<T> {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validate = useCallback(
    (values: T): boolean => {
      const next: Partial<Record<keyof T, string>> = {};
      for (const key of Object.keys(rules) as (keyof T)[]) {
        const rule = rules[key];
        if (!rule) continue;
        const result = rule(values[key], values);
        if (result) next[key] = result;
      }
      setErrors(next);
      return Object.keys(next).length === 0;
    },
    [rules],
  );

  const setError = useCallback((field: keyof T, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setErrors({});
  }, []);

  return { errors, validate, setError, clearError, clearAll };
}
