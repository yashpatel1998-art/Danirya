'use client';

import * as Select from '@radix-ui/react-select';
import { memo } from 'react';
import styles from './SelectField.module.css';

type SelectFieldProps = {
  id: string;
  label: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  required?: boolean;
  /** `light` matches beige document forms; `dark` is the default luxe panel. */
  variant?: 'dark' | 'light';
};

function ChevronIcon() {
  return (
    <svg
      width="12"
      height="8"
      viewBox="0 0 12 8"
      fill="none"
      aria-hidden
      className={styles.chevron}
    >
      <path
        d="M1 1.5L6 6.5L11 1.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2 6L5 9L10 3"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const SelectField = memo(function SelectField({
  id,
  label,
  name,
  value,
  onValueChange,
  options,
  placeholder = 'Select',
  required,
  variant = 'dark',
}: SelectFieldProps) {
  const tone = variant === 'light' ? styles.light : styles.dark;

  return (
    <div className={`${styles.field} ${tone}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && (
          <>
            {' '}
            <span className={styles.req}>*</span>
          </>
        )}
      </label>

      <Select.Root
        name={name}
        value={value || undefined}
        onValueChange={onValueChange}
        required={required}
      >
        <Select.Trigger
          id={id}
          className={styles.trigger}
          aria-label={label}
          data-cursor="default"
        >
          <Select.Value placeholder={placeholder} />
          <Select.Icon asChild>
            <span className={styles.iconWrap}>
              <ChevronIcon />
            </span>
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className={`${styles.content} ${tone}`}
            position="popper"
            side="bottom"
            sideOffset={6}
            align="start"
            avoidCollisions
            collisionPadding={16}
          >
            <Select.Viewport className={styles.viewport}>
              {options.map((option) => (
                <Select.Item
                  key={option}
                  value={option}
                  className={styles.item}
                  textValue={option}
                >
                  <span className={styles.itemInner}>
                    <Select.ItemIndicator className={styles.indicator}>
                      <CheckIcon />
                    </Select.ItemIndicator>
                    <Select.ItemText>{option}</Select.ItemText>
                  </span>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
});
