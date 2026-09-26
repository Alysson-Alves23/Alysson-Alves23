import { useEffect, useRef, type CSSProperties } from 'react';
import { Canva3D } from '../render/Canva3d';
import type { SimulationThemeConfig } from '../render/types/SimulationTheme';
import { defaultSimulationTheme } from './theme/SimulationTheme';

export interface Canva3dProps {
    className?: string;
    style?: CSSProperties;
    theme?: SimulationThemeConfig;
}

export default function Canva3d({
    className,
    style,
    theme = defaultSimulationTheme,
}: Canva3dProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return undefined;
        }

        const canva3D = new Canva3D(container, theme);

        return () => {
            canva3D.dispose();
        };
    }, [theme]);

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
