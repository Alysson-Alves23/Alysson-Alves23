import type { SimulationThemeConfig } from '../../render/types/SimulationTheme';

export const defaultSimulationTheme: SimulationThemeConfig = {
    background: '#fff',
    grid: {
        centerLine: '#b4bec9',
        gridLines: '#e4e8ec',
        size: 20,
        divisions: 20,
    },
    axes: {
        size: 3,
    },
    lighting: {
        ambientColor: '#ffffff',
        ambientIntensity: 1.8,
        keyLightColor: '#ffffff',
        keyLightIntensity: 2.5,
        keyLightPosition: {
            x: 4,
            y: 8,
            z: 6,
        },
    },
    charge: {
        positiveColor: '#ff3b30',
        negativeColor: '#3478f6',
        bodyRadius: 0.1,
        bodyWidthSegments: 32,
        bodyHeightSegments: 16,
        bodyRoughness: 0.45,
        bodyMetalness: 0.1,
    },
    field: {
        lineColor: '#293746',
        magnitudeColors: ['#2856aa', '#139eaf', '#c58b18', '#bc2945'],
        resultColor: '#a46a00',
        probeColor: '#7c3aed',
        guideColor: '#65758a',
        arrowWidth: 0.012,
        probeRadius: 0.075,
    },
};
