import type { CSSProperties } from 'react';

export interface ComponentColorFieldProps {
    label: string;
    value: string;
    onChange: (color: string) => void;
    compact?: boolean;
}

const fieldStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    color: '#9aa8b9',
    fontSize: 11,
};

export function ComponentColorField({
    label,
    value,
    onChange,
    compact = false,
}: ComponentColorFieldProps) {
    if (compact) {
        return (
            <label title={label} style={{ display: 'inline-flex', cursor: 'pointer' }}>
                <input
                    aria-label={label}
                    type="color"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    style={{
                        width: 28,
                        height: 28,
                        padding: 2,
                        background: '#171d25',
                        border: '1px solid #3a4655',
                        borderRadius: 6,
                        cursor: 'pointer',
                    }}
                />
            </label>
        );
    }

    return (
        <label style={fieldStyle}>
            <span>{label}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ color: '#718198', fontSize: 10, textTransform: 'uppercase' }}>
                    {value}
                </span>
                <input
                    aria-label={label}
                    type="color"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    style={{
                        width: 28,
                        height: 24,
                        padding: 2,
                        background: '#171d25',
                        border: '1px solid #3a4655',
                        borderRadius: 5,
                        cursor: 'pointer',
                    }}
                />
            </span>
        </label>
    );
}
