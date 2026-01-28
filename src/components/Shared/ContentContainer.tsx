import React from "react";

type ContentContainerProps = {
    children: React.ReactNode;
    className?: string;
};

export function ContentContainer({ children, className }: ContentContainerProps) {
    return <div className={`bg-container shadow-md p-6 border-black border ${className}`}>{children}</div>;
}