import {
    Activity,
    ArrowUpRight,
    CircleDot,
    Layers,
    Plus,
    Ruler,
    SlidersHorizontal,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { ComponentColorField } from './ComponentColorField';
import type {
    ChargeDraft,
    ChargeDraftField,
    ChargeSummary,
    VisualizationLayer,
} from './simulationTypes';

export interface SimulationControlsProps {
    charges: ChargeSummary[];
    selectedChargeId: string | null;
    draft: ChargeDraft;
    onDraftChange: (field: ChargeDraftField, value: string) => void;
    onAddCharge: () => void;
    onSelectCharge: (chargeId: string) => void;
    onRemoveCharge: () => void;
    onToggleChargeLayer: (layer: VisualizationLayer) => void;
}

type OpenPanel = 'objects' | 'properties' | null;
type AddableComponentType = 'charge';

function isEditableTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable);
}

const shellStyle: CSSProperties = {
    position: 'absolute',
    top: 72,
    right: 12,
    bottom: 12,
    zIndex: 2,
    display: 'flex',
    alignItems: 'stretch',
    gap: 8,
    color: '#dce5f0',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};

const railStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 7,
    width: 48,
    padding: '9px 7px',
    boxSizing: 'border-box',
    background: 'rgba(20, 25, 32, 0.94)',
    border: '1px solid #303946',
    borderRadius: 9,
    boxShadow: '0 12px 30px rgba(5, 8, 12, 0.2)',
    backdropFilter: 'blur(14px)',
};

const panelStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: 238,
    padding: 14,
    boxSizing: 'border-box',
    overflowY: 'auto',
    background: 'rgba(20, 25, 32, 0.94)',
    border: '1px solid #303946',
    borderRadius: 9,
    boxShadow: '0 12px 30px rgba(5, 8, 12, 0.2)',
    backdropFilter: 'blur(14px)',
};

const iconButtonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    padding: 0,
    color: '#9ba9bb',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 6,
    cursor: 'pointer',
};

const inputStyle: CSSProperties = {
    width: '100%',
    height: 32,
    padding: '0 8px',
    boxSizing: 'border-box',
    color: '#edf3fa',
    background: '#171d25',
    border: '1px solid #3a4655',
    borderRadius: 5,
    outline: 'none',
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
};

const subtleTextStyle: CSSProperties = {
    color: '#8190a2',
    fontSize: 11,
    lineHeight: 1.45,
};

function panelButtonStyle(isActive: boolean): CSSProperties {
    return {
        ...iconButtonStyle,
        color: isActive ? '#f5f8fc' : '#9ba9bb',
        background: isActive ? '#2c5f93' : 'transparent',
        borderColor: isActive ? '#3e83c4' : 'transparent',
    };
}

function visibilityButtonStyle(isVisible: boolean): CSSProperties {
    return {
        ...iconButtonStyle,
        color: isVisible ? '#f5f8fc' : '#78879a',
        background: isVisible ? '#2c5f93' : 'transparent',
        borderColor: isVisible ? '#3e83c4' : '#303946',
    };
}

export function SimulationControls({
    charges,
    selectedChargeId,
    draft,
    onDraftChange,
    onAddCharge,
    onSelectCharge,
    onRemoveCharge,
    onToggleChargeLayer,
}: SimulationControlsProps) {
    const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
    const [selectedComponentType, setSelectedComponentType] = useState<AddableComponentType>('charge');
    const selectedCharge = charges.find((charge) => charge.id === selectedChargeId);

    const togglePanel = (panel: Exclude<OpenPanel, null>): void => {
        setOpenPanel((currentPanel) => currentPanel === panel ? null : panel);
    };

    const handleAddSelectedComponent = (): void => {
        if (selectedComponentType === 'charge') {
            onAddCharge();
        }
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (isEditableTarget(event.target)) {
                return;
            }

            if (event.key === 'Escape') {
                setOpenPanel(null);
                return;
            }

            if (event.key.toLowerCase() === 'n') {
                setOpenPanel('properties');
                return;
            }

            if (event.key.toLowerCase() === 'o') {
                setOpenPanel('objects');
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <div style={shellStyle} aria-label="Ferramentas laterais da simulação">
            {openPanel && (
                <aside style={panelStyle} aria-label="Inspector da simulação">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div>
                            <span style={{ color: '#7f91a7', fontSize: 10, fontWeight: 750, letterSpacing: '0.12em' }}>
                                {openPanel === 'objects' ? 'CENA' : 'INSPECTOR'}
                            </span>
                            <h1 style={{ margin: '4px 0 0', color: '#f1f5fa', fontSize: 16, fontWeight: 700 }}>
                                {openPanel === 'objects' ? 'Cargas' : selectedChargeId ?? 'Novo componente'}
                            </h1>
                        </div>
                        <button
                            type="button"
                            title="Fechar painel"
                            aria-label="Fechar painel"
                            onClick={() => setOpenPanel(null)}
                            style={iconButtonStyle}
                        >
                            <X size={16} strokeWidth={1.9} />
                        </button>
                    </div>

                    <div style={{ height: 1, margin: '13px 0 11px', background: '#303946' }} />

                    {openPanel === 'objects' ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ color: '#8d9bad', fontSize: 11 }}>OBJETOS</span>
                                <span style={{ color: '#718198', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                                    {charges.length}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                                {charges.length === 0 && (
                                    <div style={{ ...subtleTextStyle, padding: '10px 2px' }}>
                                        Nenhuma carga na cena.
                                    </div>
                                )}

                                {charges.map((charge) => {
                                    const isSelected = charge.id === selectedChargeId;

                                    return (
                                        <button
                                            key={charge.id}
                                            type="button"
                                            onClick={() => onSelectCharge(charge.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 9,
                                                width: '100%',
                                                minHeight: 38,
                                                padding: '6px 8px',
                                                boxSizing: 'border-box',
                                                textAlign: 'left',
                                                color: '#e4ebf4',
                                                background: isSelected ? '#263b52' : 'transparent',
                                                border: `1px solid ${isSelected ? '#3e83c4' : 'transparent'}`,
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 7,
                                                    height: 7,
                                                    flexShrink: 0,
                                                    background: charge.color,
                                                    borderRadius: '50%',
                                                    boxShadow: `0 0 8px ${charge.color}`,
                                                }}
                                            />
                                            <span style={{ minWidth: 0 }}>
                                                <strong style={{ display: 'block', overflow: 'hidden', fontSize: 12, fontWeight: 650, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {charge.id}
                                                </strong>
                                                <span style={{ display: 'block', marginTop: 2, color: '#8391a3', fontSize: 10 }}>
                                                    q = {charge.value} · {charge.color}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <>
                            <label style={{ display: 'grid', gap: 6, color: '#9aa8b9', fontSize: 11 }}>
                                Valor da carga
                                <input
                                    style={inputStyle}
                                    type="number"
                                    step="any"
                                    value={draft.value}
                                    onChange={(event) => onDraftChange('value', event.target.value)}
                                />
                            </label>
                            <div style={{ marginTop: 13 }}>
                                <ComponentColorField
                                    label="Cor do componente"
                                    value={draft.color}
                                    onChange={(color) => onDraftChange('color', color)}
                                />
                            </div>
                            <p style={{ ...subtleTextStyle, margin: '11px 0 0' }}>
                                {selectedChargeId
                                    ? 'A cor e o valor são atualizados imediatamente.'
                                    : 'A cor atual será usada no próximo componente.'}
                            </p>
                            {selectedCharge && (
                                <div style={{ marginTop: 17 }}>
                                    <span style={{ color: '#8d9bad', fontSize: 10, letterSpacing: '0.1em' }}>
                                        VISUALIZAÇÃO
                                    </span>
                                    <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
                                        <button
                                            type="button"
                                            title="Campo elétrico da carga"
                                            aria-label="Campo elétrico da carga"
                                            aria-pressed={selectedCharge.visibility.electricField}
                                            onClick={() => onToggleChargeLayer('electricField')}
                                            style={visibilityButtonStyle(selectedCharge.visibility.electricField)}
                                        >
                                            <Activity size={16} strokeWidth={1.9} />
                                        </button>
                                        <button
                                            type="button"
                                            title="Força da carga"
                                            aria-label="Força da carga"
                                            aria-pressed={selectedCharge.visibility.forceVectors}
                                            onClick={() => onToggleChargeLayer('forceVectors')}
                                            style={visibilityButtonStyle(selectedCharge.visibility.forceVectors)}
                                        >
                                            <ArrowUpRight size={16} strokeWidth={1.9} />
                                        </button>
                                        <button
                                            type="button"
                                            title="Distância e linha de ação da carga"
                                            aria-label="Distância e linha de ação da carga"
                                            aria-pressed={selectedCharge.visibility.distanceGuide}
                                            onClick={() => onToggleChargeLayer('distanceGuide')}
                                            style={visibilityButtonStyle(selectedCharge.visibility.distanceGuide)}
                                        >
                                            <Ruler size={16} strokeWidth={1.9} />
                                        </button>
                                    </div>
                                </div>
                            )}
                            {selectedChargeId && (
                                <button
                                    type="button"
                                    title="Remover carga"
                                    aria-label="Remover carga"
                                    onClick={onRemoveCharge}
                                    style={{
                                        ...iconButtonStyle,
                                        width: '100%',
                                        marginTop: 16,
                                        color: '#eaa8ae',
                                        borderColor: '#604047',
                                    }}
                                >
                                    <Trash2 size={16} strokeWidth={1.9} />
                                </button>
                            )}
                        </>
                    )}
                </aside>
            )}

            <nav style={railStyle} aria-label="Toolbar lateral">
                <button
                    type="button"
                    title="Tipo de componente: carga"
                    aria-label="Selecionar carga"
                    aria-pressed={selectedComponentType === 'charge'}
                    onClick={() => setSelectedComponentType('charge')}
                    style={panelButtonStyle(selectedComponentType === 'charge')}
                >
                    <CircleDot size={17} strokeWidth={1.9} />
                </button>
                <button
                    type="button"
                    title="Adicionar carga (Shift+A)"
                    aria-label="Adicionar carga"
                    onClick={handleAddSelectedComponent}
                    style={{
                        ...iconButtonStyle,
                        color: '#d9edff',
                        background: '#2c5f93',
                        borderColor: '#3e83c4',
                    }}
                >
                    <Plus size={17} strokeWidth={2} />
                </button>
                <ComponentColorField
                    label="Cor do componente atual"
                    value={draft.color}
                    onChange={(color) => onDraftChange('color', color)}
                    compact
                />
                <div style={{ width: 25, height: 1, margin: '3px 0', background: '#303946' }} />
                <button
                    type="button"
                    title="Objetos (O)"
                    aria-label="Objetos"
                    aria-pressed={openPanel === 'objects'}
                    onClick={() => togglePanel('objects')}
                    style={panelButtonStyle(openPanel === 'objects')}
                >
                    <Layers size={17} strokeWidth={1.9} />
                </button>
                <button
                    type="button"
                    title="Propriedades (N)"
                    aria-label="Propriedades"
                    aria-pressed={openPanel === 'properties'}
                    onClick={() => togglePanel('properties')}
                    style={panelButtonStyle(openPanel === 'properties')}
                >
                    <SlidersHorizontal size={17} strokeWidth={1.9} />
                </button>
            </nav>
        </div>
    );
}
