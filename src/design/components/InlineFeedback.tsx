import { useState, useRef, useEffect } from 'react';
import { colors } from './tokens';

/**
 * Inline Feedback
 *
 * One-question feedback capture that appears inline after an action.
 * Label always visible, input below, submit appears on focus.
 * Never a popup. Never a box-in-box.
 *
 * Usage:
 *   <InlineFeedback
 *     label="What almost held you back?"
 *     placeholder="e.g. I wasn't sure..."
 *     onSubmit={(value) => trackFeedback(value)}
 *   />
 */
export function InlineFeedback({
  label,
  placeholder,
  onSubmit,
  autoFocus = false,
  thankYouMessage = 'Thanks for your feedback.',
}: {
  label: string;
  placeholder?: string;
  onSubmit?: (value: string) => void;
  autoFocus?: boolean;
  thankYouMessage?: string;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);
  const [submitted, setSubmitted] = useState(false);

  const hasValue = value.trim().length > 0;

  const handleSubmit = () => {
    setSubmitted(true);
    onSubmit?.(value);
  };

  if (submitted) {
    return <p className="text-sm" style={{ color: colors.greenText }}>{thankYouMessage}</p>;
  }

  const borderColor = hasValue ? colors.green : colors.border;

  return (
    <div className="space-y-2">
      {label && <label className="text-sm block" style={{ color: colors.textBody }}>{label}</label>}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-3 text-sm outline-none min-h-[44px] transition-all duration-[50ms]"
        style={{ backgroundColor: colors.inputBg, border: `2px solid ${borderColor}`, color: colors.text }}
      />
      {hasValue && (
        <button
          onClick={handleSubmit}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer min-h-[44px]"
          style={{ backgroundColor: colors.orange, color: '#fff' }}
        >
          Submit
        </button>
      )}
    </div>
  );
}
