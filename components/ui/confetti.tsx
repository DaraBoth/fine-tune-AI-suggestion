"use client";

import React, {
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
} from "react";
import confetti, {
    GlobalOptions as ConfettiGlobals,
    Options as ConfettiOptions,
} from "canvas-confetti";

type Api = {
    fire: (options?: ConfettiOptions) => void;
};

type Props = React.ComponentPropsWithRef<"canvas"> & {
    options?: ConfettiOptions;
    globalOptions?: ConfettiGlobals;
    manualstart?: boolean;
};

export const Confetti = React.forwardRef<Api, Props>((props, ref) => {
    const {
        options,
        globalOptions,
        manualstart = false,
        ...rest
    } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const instance = useMemo(() => {
        if (typeof window === "undefined") return null;
        return confetti.create(canvasRef.current as HTMLCanvasElement, {
            ...globalOptions,
            resize: true,
        });
    }, [globalOptions]);

    const fire = useCallback(
        (opts = {}) => {
            if (instance) {
                instance({ ...options, ...opts });
            }
        },
        [instance, options],
    );

    useImperativeHandle(ref, () => ({
        fire,
    }));

    useEffect(() => {
        if (!manualstart) {
            fire();
        }
    }, [manualstart, fire]);

    return (
        <canvas
            ref={canvasRef}
            {...rest}
            className={rest.className}
            style={{
                position: "fixed",
                pointerEvents: "none",
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                zIndex: 100,
                ...rest.style,
            }}
        />
    );
});

Confetti.displayName = "Confetti";

export default Confetti;
