import { useEffect, useRef, type CSSProperties } from 'react';
import { Canva3D } from '../render/Canva3d';

export interface Canva3dProps {
    className?: string;
    style?: CSSProperties;
}

export default function Canva3d({
    className,
    style,
}: Canva3dProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return undefined;
        }

        const canva3D = new Canva3D(container);

        return () => {
            canva3D.dispose();
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
