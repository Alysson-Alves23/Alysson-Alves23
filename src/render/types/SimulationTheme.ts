export type SimulationColor = string | number;

export interface ChargeAppearance {
    positiveColor: SimulationColor;
    negativeColor: SimulationColor;
    bodyRadius: number;
    bodyWidthSegments: number;
    bodyHeightSegments: number;
    bodyRoughness: number;
    bodyMetalness: number;
}

export interface SimulationThemeConfig {
    background: SimulationColor;
    grid: {
        centerLine: SimulationColor;
        gridLines: SimulationColor;
        size: number;
        divisions: number;
    };
    axes: {
        size: number;
    };
    lighting: {
        ambientColor: SimulationColor;
        ambientIntensity: number;
        keyLightColor: SimulationColor;
        keyLightIntensity: number;
        keyLightPosition: {
            x: number;
            y: number;
            z: number;
        };
    };
    charge: ChargeAppearance;
}
