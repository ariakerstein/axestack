import { colors } from './tokens';

/**
 * Radio Button Group
 *
 * Use when 2-5 static options need to be visible at once.
 * Prefer over dropdown when options are short labels.
 *
 * States:
 * - Required + nothing selected: blue outline on all options
 * - Selected: green border + green bg on selected, gray on rest
 * - Optional + nothing selected: gray outline on all
 */
export function RadioButtonGroup({
  options,
  selected,
  onChange,
  required = false,
  columns,
}: {
  options: string[];
  selected: string | null;
  onChange: (value: string) => void;
  required?: boolean;
  columns?: number;
}) {
  return (
    <div
      className="flex flex-wrap gap-2"
      style={columns ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '8px' } : undefined}
    >
      {options.map((option) => {
        const isSelected = selected === option;
        const borderColor = isSelected
          ? colors.green
          : required && !selected
            ? colors.blue
            : colors.border;
        const bgColor = isSelected ? colors.greenLight : colors.surface;
        const textColor = isSelected ? colors.greenText : colors.textBody;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className="flex items-center justify-center px-4 py-2.5 rounded-lg cursor-pointer min-h-[44px] transition-all duration-[50ms] text-base"
            style={{
              border: `2px solid ${borderColor}`,
              backgroundColor: bgColor,
              color: textColor,
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
