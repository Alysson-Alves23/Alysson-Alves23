import { describe, expect, it } from 'vitest';
import { limitForceVectorDisplayLength } from './ForceVectorDisplay';

describe('force vector display length', () => {
    it('keeps opposing interaction arrows within their charge separation', () => {
        expect(limitForceVectorDisplayLength(1.5, 0.8)).toBeCloseTo(0.32);
    });

    it('preserves the force scale when the vector already fits', () => {
        expect(limitForceVectorDisplayLength(0.25, 1)).toBe(0.25);
    });
});
