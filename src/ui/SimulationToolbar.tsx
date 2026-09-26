import {
    Check,
    ChevronDown,
    CircleDot,
    MousePointer2,
    Move,
    Plus,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import type { ChargeDraft, ChargeDraftField } from './simulationTypes';

export type SimulationTool = 'select' | 'move';

export interface SimulationToolbarProps {
    activeTool: SimulationTool;
    chargesCount: number;
    draft: ChargeDraft;
    hasSelectedCharge: boolean;
    onAddCharge: () => void;
    onApplyPosition: () => void;
    onDraftChange: (field: ChargeDraftField, value: string) => void;
    onToolChange: (tool: SimulationTool) => void;
}

const toolbarStyle: CSSProperties = {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    padding: '7px 9px',
    boxSizing: 'border-box',
    overflowX: 'auto',
    color: '#d9e2ef',
    background: 'rgba(20, 25, 32, 0.94)',
    border: '1px solid #303946',
    borderRadius: 10,
    boxShadow: '0 12px 30px rgba(5, 8, 12, 0.22)',
    backdropFilter: 'blur(14px)',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};

const toolbarGroupStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
};

const separatorStyle: CSSProperties = {
    width: 1,
    height: 25,
    flexShrink: 0,
    background: '#303946',
};

const toolButtonBaseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 32,
    padding: '0 9px',
    color: '#9ba9bb',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 650,
    whiteSpace: 'nowrap',
};

const compactInputStyle: CSSProperties = {
    width: 58,
    height: 29,
    padding: '0 7px',
    boxSizing: 'border-box',
    color: '#e7edf6',
    background: '#171d25',
    border: '1px solid #3a4655',
    borderRadius: 5,
    outline: 'none',
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
};

function toolButtonStyle(isActive: boolean): CSSProperties {
    return {
        ...toolButtonBaseStyle,
        color: isActive ? '#f5f8fc' : '#9ba9bb',
        background: isActive ? '#2c5f93' : 'transparent',
        borderColor: isActive ? '#3e83c4' : 'transparent',
        boxShadow: isActive ? 'inset 0 0 0 1px rgba(255,255,255,0.05)' : 'none',
    };
}

function AxisField({
    axis,
    value,
    onChange,
}: {
    axis: 'x' | 'y' | 'z';
    value: string;
    onChange: (field: ChargeDraftField, value: string) => void;
}) {
    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: '#8391a3', fontSize: 11, fontWeight: 700 }}>{axis.toUpperCase()}</span>
            <input
                aria-label={`Coordenada ${axis.toUpperCase()}`}
                style={compactInputStyle}
                type="number"
                step="any"
                value={value}
                onChange={(event) => onChange(axis, event.target.value)}
            />
        </label>
    );
}

export function SimulationToolbar({
    activeTool,
    chargesCount,
    draft,
    hasSelectedCharge,
    onAddCharge,
    onApplyPosition,
    onDraftChange,
    onToolChange,
}: SimulationToolbarProps) {
    return (
        <header style={toolbarStyle} aria-label="Barra de ferramentas da simulação">
            <div style={toolbarGroupStyle} aria-label="Ferramentas">
                <button
                    style={toolButtonStyle(activeTool === 'select')}
                    type="button"
                    title="Selecionar carga"
                    aria-label="Selecionar carga"
                    aria-pressed={activeTool === 'select'}
                    onClick={() => onToolChange('select')}
                >
                    <MousePointer2 size={16} strokeWidth={1.9} />
                    <span>Selecionar</span>
                </button>
                <button
                    style={toolButtonStyle(activeTool === 'move')}
                    type="button"
                    title="Mover carga"
                    aria-label="Mover carga"
                    aria-pressed={activeTool === 'move'}
                    onClick={() => onToolChange('move')}
                >
                    <Move size={16} strokeWidth={1.9} />
                    <span>Mover</span>
                </button>
                <button
                    style={toolButtonBaseStyle}
                    type="button"
                    title="Adicionar carga"
                    aria-label="Adicionar carga"
                    onClick={onAddCharge}
                >
                    <Plus size={16} strokeWidth={2} />
                    <span>Adicionar</span>
                </button>
            </div>

            <div style={separatorStyle} />

            <div style={{ ...toolbarGroupStyle, gap: 8 }}>
                <span style={{ color: '#78879a', fontSize: 10, fontWeight: 750, letterSpacing: '0.1em' }}>
                    POSIÇÃO
                </span>
                <AxisField axis="x" value={draft.x} onChange={onDraftChange} />
                <AxisField axis="y" value={draft.y} onChange={onDraftChange} />
                <AxisField axis="z" value={draft.z} onChange={onDraftChange} />
                <button
                    style={{
                        ...toolButtonBaseStyle,
                        width: 31,
                        padding: 0,
                        color: hasSelectedCharge ? '#c7e8d3' : '#657487',
                        cursor: hasSelectedCharge ? 'pointer' : 'not-allowed',
                    }}
                    type="button"
                    title="Aplicar posição"
                    aria-label="Aplicar posição"
                    disabled={!hasSelectedCharge}
                    onClick={onApplyPosition}
                >
                    <Check size={16} strokeWidth={2} />
                </button>
            </div>

            <div style={{ flex: 1, minWidth: 12 }} />

            <div style={{ ...toolbarGroupStyle, color: '#8190a2', fontSize: 11, whiteSpace: 'nowrap' }}>
                <CircleDot size={14} strokeWidth={1.8} />
                <span>{chargesCount} {chargesCount === 1 ? 'carga' : 'cargas'}</span>
                <ChevronDown size={14} strokeWidth={1.8} />
            </div>
        </header>
    );
}
