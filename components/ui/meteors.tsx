"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

interface MeteorsProps {
    number?: number;
    className?: string;
}

export const Meteors = ({ number = 20, className }: MeteorsProps) => {
    const [meteorStyles, setMeteorStyles] = useState<React.CSSProperties[]>([]);

    useEffect(() => {
        const styles = [...new Array(number)].map(() => ({
            top: -5,
            left: Math.floor(Math.random() * 100) + "%",
            animationDelay: Math.random() * 0.6 + 0.2 + "s",
            animationDuration: Math.floor(Math.random() * 10 + 2) + "s",
        }));
        setMeteorStyles(styles);
    }, [number]);

    return (
        <>
            {[...new Array(number)].map((el, idx) => (
                <span
                    key={"meteor" + idx}
                    className={cn(
                        "animate-meteor absolute top-1/2 left-1/2 h-0.5 w-0.5 rounded-[9999px] bg-slate-500 shadow-[0_0_0_1px_#ffffff10] rotate-[215deg]",
                        "before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-[#64748b] before:to-transparent",
                        className,
                    )}
                    style={meteorStyles[idx]}
                ></span>
            ))}
        </>
    );
};
