import {
    Activity,
    ArrowUpRight,
    Ruler,
    Sigma,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import type {
    ChargeDraft,
    ChargeDraftField,
    ChargeVisibility,
    VisualizationLayer,
} from './simulationTypes';

export interface SimulationToolbarProps {
    selectedChargeId: string | null;
    draft: ChargeDraft;
    globalVisibility: ChargeVisibility;
    showMeasurementLabels: boolean;
    onDraftChange: (field: ChargeDraftField, value: string) => void;
    onToggleGlobalLayer: (layer: VisualizationLayer) => void;
    onToggleMeasurementLabels: () => void;
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

function VisibilityToggle({
    icon: Icon,
    label,
    shortcut,
    visible,
    onClick,
}: {
    icon: LucideIcon;
    label: string;
    shortcut: string;
    visible: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={`${label} (${shortcut})`}
            aria-label={`${label}: ${visible ? 'visível' : 'oculto'}`}
            aria-pressed={visible}
            onClick={onClick}
            style={{
                ...toolButtonBaseStyle,
                width: 32,
                padding: 0,
                color: visible ? '#f5f8fc' : '#78879a',
                background: visible ? '#2c5f93' : 'transparent',
                borderColor: visible ? '#3e83c4' : 'transparent',
            }}
        >
            <Icon size={16} strokeWidth={1.9} />
        </button>
    );
}

function AxisField({
    axis,
    value,
    disabled,
    onChange,
}: {
    axis: 'x' | 'y' | 'z';
    value: string;
    disabled: boolean;
    onChange: (field: ChargeDraftField, value: string) => void;
}) {
    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: '#8391a3', fontSize: 11, fontWeight: 700 }}>{axis.toUpperCase()}</span>
            <input
                aria-label={`Coordenada ${axis.toUpperCase()}`}
                style={{
                    ...compactInputStyle,
                    color: disabled ? '#647286' : '#e7edf6',
                    background: disabled ? '#12171e' : '#171d25',
                    cursor: disabled ? 'not-allowed' : 'text',
                }}
                type="text"
                inputMode="decimal"
                placeholder="—"
                disabled={disabled}
                value={value}
                onChange={(event) => onChange(axis, event.target.value)}
            />
        </label>
    );
}

export function SimulationToolbar({
    selectedChargeId,
    draft,
    globalVisibility,
    showMeasurementLabels,
    onDraftChange,
    onToggleGlobalLayer,
    onToggleMeasurementLabels,
}: SimulationToolbarProps) {
    return (
        <header style={toolbarStyle} aria-label="Barra de ferramentas da simulação">
            <span
                title="Clique seleciona. Shift + clique adiciona ou remove da seleção. Ctrl + arraste move a carga; se ela estiver selecionada, move a seleção."
                aria-label="Clique seleciona; Shift mais clique altera a seleção; Control mais arraste move a carga ou a seleção da carga arrastada."
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    flexShrink: 0,
                    color: '#9ba9bb',
                    border: '1px solid #303946',
                    borderRadius: 6,
                }}
            >
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.02em' }}>Ctrl</span>
            </span>

            <div style={separatorStyle} />

            <div style={toolbarGroupStyle} aria-label="Camadas visuais">
                <VisibilityToggle
                    icon={Activity}
                    label="Campo elétrico"
                    shortcut="E"
                    visible={globalVisibility.electricField}
                    onClick={() => onToggleGlobalLayer('electricField')}
                />
                <VisibilityToggle
                    icon={ArrowUpRight}
                    label="Vetores de força (N) · escala linear automática"
                    shortcut="F"
                    visible={globalVisibility.forceVectors}
                    onClick={() => onToggleGlobalLayer('forceVectors')}
                />
                <VisibilityToggle
                    icon={Ruler}
                    label="Distância e linha de ação"
                    shortcut="R"
                    visible={globalVisibility.distanceGuide}
                    onClick={() => onToggleGlobalLayer('distanceGuide')}
                />
            </div>

            <div style={separatorStyle} />

            <div style={toolbarGroupStyle} aria-label="Valores e unidades">
                <VisibilityToggle
                    icon={Sigma}
                    label="Exibir valores e unidades"
                    shortcut="M"
                    visible={showMeasurementLabels}
                    onClick={onToggleMeasurementLabels}
                />
            </div>

            <div style={separatorStyle} />

            <div style={{ ...toolbarGroupStyle, gap: 8 }}>
                <span style={{ color: '#78879a', fontSize: 10, fontWeight: 750, letterSpacing: '0.1em' }}>
                POSIÇÃO (m)
                </span>
                <AxisField axis="x" value={draft.x} disabled={!selectedChargeId} onChange={onDraftChange} />
                <AxisField axis="y" value={draft.y} disabled={!selectedChargeId} onChange={onDraftChange} />
                <AxisField axis="z" value={draft.z} disabled={!selectedChargeId} onChange={onDraftChange} />
            </div>
        </header>
    );
}
