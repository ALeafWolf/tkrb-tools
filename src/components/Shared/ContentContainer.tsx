import React from "react";
import { cn } from "../../lib/helpers";

type ContentContainerProps = {
    children: React.ReactNode;
    className?: string;
};

export function ContentContainer({ children, className }: ContentContainerProps) {
    return <div className={cn(`bg-container shadow-md p-6 border-black border ${className}`)}>{children}</div>;
}