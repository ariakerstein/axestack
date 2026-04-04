import { useState, useCallback } from 'react';
import { colors } from './tokens';

type FieldState = 'idle' | 'focused' | 'valid' | 'error';

/**
 * Hook for form field state management.
 *
 * Manages focus/blur/validation and returns:
 * - borderStyle: inline CSS for the correct border color
 * - state: current state name (for debug display)
 * - inputProps: spread onto <input>/<textarea>/<select>
 *
 * Border states:
 * - Focused (any): green border + glow
 * - Unfocused + valid: green border
 * - Unfocused + error: red border
 * - Unfocused + empty + required: blue border
 * - Unfocused + empty + optional: gray border
 */
export function useFieldState(required: boolean, validate?: (value: string) => boolean) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);

  const getState = useCallback((): FieldState => {
    if (focused) return 'focused';
    if (!touched) return 'idle';
    if (value && validate && !validate(value)) return 'error';
    if (value) return 'valid';
    return 'idle';
  }, [focused, touched, value, validate]);

  const getBorderStyle = useCallback((): React.CSSProperties => {
    const state = getState();
    const base: React.CSSProperties = { borderWidth: '2px', borderStyle: 'solid' };
    switch (state) {
      case 'focused':
        return { ...base, borderColor: colors.greenFocus, boxShadow: `0 0 0 3px ${colors.greenGlow}` };
      case 'valid':
        return { ...base, borderColor: colors.green };
      case 'error':
        return { ...base, borderColor: colors.red };
      case 'idle':
      default:
        if (required && !value) return { ...base, borderColor: colors.blue };
        return { borderWidth: '1px', borderStyle: 'solid', borderColor: colors.border };
    }
  }, [getState, required, value]);

  return {
    value,
    state: getState(),
    borderStyle: getBorderStyle(),
    inputProps: {
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setValue(e.target.value);
        setTouched(true);
      },
      onFocus: () => setFocused(true),
      onBlur: () => {
        setFocused(false);
        setTouched(true);
      },
    },
  };
}

// Common validators
export const validators = {
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v: string) => /^\+?[\d\s\-()]{7,}$/.test(v),
  url: (v: string) => /^(https?:\/\/)?.+\..+/.test(v),
};
