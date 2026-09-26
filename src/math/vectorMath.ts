export type Vector3 = [number, number, number];
export type Vector3Tuple = readonly [number, number, number];
export const magnitude = (v: Vector3Tuple): number => Math.hypot(...v);
export const add = (a: Vector3Tuple, b: Vector3Tuple): Vector3 =>
    [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const subtract = (a: Vector3Tuple, b: Vector3Tuple): Vector3 =>
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (v: Vector3Tuple, factor: number): Vector3 =>
    [v[0] * factor, v[1] * factor, v[2] * factor];
export const normalize = (v: Vector3Tuple): Vector3 => {
    const length = magnitude(v);
    return length > 0 && Number.isFinite(length) ? scale(v, 1 / length) : [0, 0, 0];
};
