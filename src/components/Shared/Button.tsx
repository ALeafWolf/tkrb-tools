import React from "react";

type ButtonProps = {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    disabled?: boolean;
    className?: string;
    cornerClassName?: string;
};

export function Button({
    children,
    onClick,
    disabled = false,
    className = "",
    cornerClassName = "",
}: ButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`relative inline-flex items-center justify-center px-4 py-2 font-semibold text-white bg-btn-black shadow-lg select-none ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className} `}
        >
            {children}
            {/* bottom-right corner accent */}
            <span
                className={`pointer-events-none absolute right-0 bottom-0 h-0 w-0 border-b-16 border-l-16 border-b-btn-black-corner border-l-transparent ${cornerClassName}`}
            />
        </button>
    );
}
