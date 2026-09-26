import type { SimulationThemeConfig } from '../../render/types/SimulationTheme';

export const defaultSimulationTheme: SimulationThemeConfig = {
    background: '#b8b5b5',
    grid: {
        centerLine: '#405070',
        gridLines: '#1e2a42',
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
};
