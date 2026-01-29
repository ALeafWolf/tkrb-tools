import React from "react";
import { cn } from "../../lib/helpers";

type Option = { value: string; label: string };

type SelectProps = {
    id?: string;
    label: string; // visible label for a11y
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
    placeholder?: string; // shows when value is empty
};

export function Select({
    id,
    label,
    value,
    options,
    onChange,
    disabled = false,
    className = "",
    placeholder,
}: SelectProps) {
    const uid = React.useId();
    const baseId = id ?? `select-${uid}`;
    const listboxId = `${baseId}-listbox`;

    const rootRef = React.useRef<HTMLDivElement>(null);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    const selectedIndex = Math.max(
        0,
        options.findIndex((o) => o.value === value)
    );

    const [open, setOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(selectedIndex);

    // Keep active option aligned to current value when opening
    React.useEffect(() => {
        if (open) setActiveIndex(selectedIndex);
    }, [open, selectedIndex]);

    // Click outside to close
    React.useEffect(() => {
        if (!open) return;
        const onDocMouseDown = (e: MouseEvent) => {
            const el = rootRef.current;
            if (!el) return;
            if (!el.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, [open]);

    const commit = (index: number) => {
        const opt = options[index];
        if (!opt) return;
        onChange(opt.value);
        setOpen(false);
        buttonRef.current?.focus();
    };

    const onButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;

        switch (e.key) {
            case "ArrowDown":
            case "ArrowUp": {
                e.preventDefault();
                if (!open) setOpen(true);
                const dir = e.key === "ArrowDown" ? 1 : -1;
                setActiveIndex((i) => {
                    const next = (i + dir + options.length) % options.length;
                    return next;
                });
                break;
            }
            case "Enter":
            case " ": {
                e.preventDefault();
                if (!open) {
                    setOpen(true);
                } else {
                    commit(activeIndex);
                }
                break;
            }
            case "Escape": {
                if (open) {
                    e.preventDefault();
                    setOpen(false);
                }
                break;
            }
            case "Home": {
                if (open) {
                    e.preventDefault();
                    setActiveIndex(0);
                }
                break;
            }
            case "End": {
                if (open) {
                    e.preventDefault();
                    setActiveIndex(options.length - 1);
                }
                break;
            }
        }
    };

    const selected = options.find((o) => o.value === value) ?? options[0];
    const activeId = `${baseId}-opt-${activeIndex}`;

    // Determine display text: show placeholder if value is empty and placeholder exists
    const displayText = value === "" && placeholder
        ? placeholder
        : (selected?.label ?? "");
    const isPlaceholder = value === "" && placeholder;

    return (
        <div ref={rootRef} className={cn("w-full relative", className)}>
            {/* Visible label */}
            <label htmlFor={`${baseId}-button`} className="block mb-1 text-sm text-fg">
                {label}
            </label>

            <button
                id={`${baseId}-button`}
                ref={buttonRef}
                type="button"
                disabled={disabled}
                className={cn(
                    "relative w-full inline-flex items-center justify-between px-3 py-2 border border-black bg-transparent",
                    "focus:outline-none",
                    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                )}
                role="combobox"
                aria-haspopup="listbox"
                aria-controls={listboxId}
                aria-expanded={open}
                aria-activedescendant={open ? activeId : undefined}
                onClick={() => !disabled && setOpen((v) => !v)}
                onKeyDown={onButtonKeyDown}
            >
                <span className={cn("truncate", isPlaceholder && "opacity-60")}>
                    {displayText}
                </span>

                {/* simple chevron */}
                <span className="ml-2 opacity-80">▾</span>
            </button>

            {open && (
                <ul
                    id={listboxId}
                    role="listbox"
                    aria-label={label}
                    className={[
                        "mt-1 w-full max-h-60 overflow-auto absolute top-full left-0 right-0 z-10",
                        "bg-panel shadow-sm",
                    ].join(" ")}
                >
                    {options.map((opt, idx) => {
                        const isSelected = opt.value === value;
                        const isActive = idx === activeIndex;
                        const isPlaceholder = opt.value === "";

                        return (
                            <li
                                id={`${baseId}-opt-${idx}`}
                                key={opt.value}
                                role="option"
                                aria-selected={isSelected}
                                className={cn(
                                    "px-3 py-2 select-none cursor-pointer border border-black not-last:border-b-0 relative",
                                    !isPlaceholder && "hover:bg-danger-soft hover:after:content-['✓']",
                                    "after:absolute after:right-2 after:top-1/2 after:-translate-y-1/2 after:text-danger after:font-semibold",
                                    isActive && !isPlaceholder && "bg-danger-soft after:content-['✓']",
                                    isSelected && !isPlaceholder && "bg-danger-soft after:content-['✓']",
                                )}
                                onMouseEnter={() => setActiveIndex(idx)}
                                onMouseDown={(e) => {
                                    // prevents button losing focus before click
                                    e.preventDefault();
                                }}
                                onClick={() => commit(idx)}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate">{opt.label}</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
