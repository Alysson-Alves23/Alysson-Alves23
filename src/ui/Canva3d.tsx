import { useEffect, useRef, type CSSProperties } from 'react';
import {
    createCanva3D,
    type Canva3DViewport,
} from '../render/Canva3d';

export interface Canva3dProps {
    className?: string;
    style?: CSSProperties;
    onReady?: (viewport: Canva3DViewport) => void;
}

export default function Canva3d({
    className,
    style,
    onReady,
}: Canva3dProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return undefined;
        }

        const viewport = createCanva3D(container);
        onReadyRef.current?.(viewport);

        return () => {
            viewport.dispose();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                width: '100%',
                height: '100%',
                minHeight: 360,
                overflow: 'hidden',
                ...style,
            }}
            aria-label="Área tridimensional do simulador"
        />
    );
}
