import type { CartesianCoordinates } from './types';

export type Vector3 = [number, number, number];
export const magnitude = (v: CartesianCoordinates): number => Math.hypot(...v);
export const add = (a: CartesianCoordinates, b: CartesianCoordinates): Vector3 =>
    [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const subtract = (a: CartesianCoordinates, b: CartesianCoordinates): Vector3 =>
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (v: CartesianCoordinates, factor: number): Vector3 =>
    [v[0] * factor, v[1] * factor, v[2] * factor];
export const normalize = (v: CartesianCoordinates): Vector3 => {
    const length = magnitude(v);
    return length > 0 && Number.isFinite(length) ? scale(v, 1 / length) : [0, 0, 0];
};
