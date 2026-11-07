'use client';

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
}

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ value, onChange, className = '', minRows = 1, rows = 1, style, onInput, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    const adjustHeight = () => {
      const textarea = internalRef.current;
      if (!textarea) return;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 38)}px`;
    };

    useEffect(() => {
      adjustHeight();
    }, [value]);

    return (
      <textarea
        ref={internalRef}
        value={value}
        onChange={onChange}
        rows={minRows || rows}
        onInput={(e) => {
          adjustHeight();
          if (onInput) onInput(e);
        }}
        style={{
          ...style,
          resize: 'none',
          overflow: 'hidden',
        }}
        className={`w-full transition-[height] duration-75 field-sizing-content ${className}`}
        {...props}
      />
    );
  }
);

AutoResizeTextarea.displayName = 'AutoResizeTextarea';
export default AutoResizeTextarea;
