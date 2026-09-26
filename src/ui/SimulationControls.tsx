import { Plus } from 'lucide-react';
import type { CSSProperties } from 'react';
import { ComponentColorField } from './ComponentColorField';
import type { ChargeDraft, ChargeDraftField, ChargeSummary } from './simulationTypes';

export interface SimulationControlsProps {
    charges: ChargeSummary[];
    selectedChargeId: string | null;
    draft: ChargeDraft;
    onDraftChange: (field: ChargeDraftField, value: string) => void;
    onAddCharge: () => void;
    onSelectCharge: (chargeId: string) => void;
    onApplyProperties: () => void;
    onRemoveCharge: () => void;
}

const panelStyle: CSSProperties = {
    position: 'absolute',
    top: 72,
    right: 12,
    bottom: 12,
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    width: 236,
    padding: 14,
    boxSizing: 'border-box',
    overflowY: 'auto',
    color: '#dce5f0',
    background: 'rgba(20, 25, 32, 0.92)',
    border: '1px solid #303946',
    borderRadius: 10,
    boxShadow: '0 12px 30px rgba(5, 8, 12, 0.2)',
    backdropFilter: 'blur(14px)',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};

const inputStyle: CSSProperties = {
    width: '100%',
    height: 31,
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

export function SimulationControls({
    charges,
    selectedChargeId,
    draft,
    onDraftChange,
    onAddCharge,
    onSelectCharge,
    onApplyProperties,
    onRemoveCharge,
}: SimulationControlsProps) {
    return (
        <aside style={panelStyle} aria-label="Inspector da simulação">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div>
                    <span style={{ color: '#7f91a7', fontSize: 10, fontWeight: 750, letterSpacing: '0.12em' }}>
                        CENA
                    </span>
                    <h1 style={{ margin: '4px 0 0', color: '#f1f5fa', fontSize: 16, fontWeight: 700 }}>
                        Cargas
                    </h1>
                </div>
                <button
                    type="button"
                    title="Adicionar carga"
                    aria-label="Adicionar carga"
                    onClick={onAddCharge}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 29,
                        height: 29,
                        color: '#d9edff',
                        background: '#2c5f93',
                        border: '1px solid #3e83c4',
                        borderRadius: 6,
                        cursor: 'pointer',
                    }}
                >
                    <Plus size={16} strokeWidth={2} />
                </button>
            </div>

            <div style={{ height: 1, margin: '13px 0 11px', background: '#303946' }} />

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
                    const chargeColor = charge.value >= 0 ? '#f38b9b' : '#78b5ed';

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
                                    background: chargeColor,
                                    borderRadius: '50%',
                                    boxShadow: `0 0 8px ${chargeColor}`,
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

            <div style={{ height: 1, margin: '15px 0 13px', background: '#303946' }} />

            <div>
                <span style={{ color: '#8d9bad', fontSize: 11 }}>PROPRIEDADES</span>
                <label style={{ display: 'grid', gap: 6, marginTop: 9, color: '#9aa8b9', fontSize: 11 }}>
                    Valor da carga
                    <input
                        style={inputStyle}
                        type="number"
                        step="any"
                        value={draft.value}
                        onChange={(event) => onDraftChange('value', event.target.value)}
                    />
                </label>
                <div style={{ marginTop: 12 }}>
                    <ComponentColorField
                        label="Cor do componente"
                        value={draft.color}
                        onChange={(color) => onDraftChange('color', color)}
                    />
                </div>
                <p style={{ ...subtleTextStyle, margin: '10px 0 0' }}>
                    {selectedChargeId
                        ? 'Use os eixos no canvas ou edite a posição na barra superior.'
                        : 'Defina o valor e use a barra superior para criar uma carga.'}
                </p>
                {selectedChargeId ? (
                    <div style={{ display: 'grid', gap: 6, marginTop: 13 }}>
                        <button
                            type="button"
                            onClick={onApplyProperties}
                            style={{
                                height: 31,
                                color: '#e7f2ff',
                                background: '#2c5f93',
                                border: '1px solid #3e83c4',
                                borderRadius: 5,
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: 700,
                            }}
                        >
                            Aplicar alterações
                        </button>
                        <button
                            type="button"
                            onClick={onRemoveCharge}
                            style={{
                                height: 30,
                                color: '#eaa8ae',
                                background: 'transparent',
                                border: '1px solid #604047',
                                borderRadius: 5,
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: 650,
                            }}
                        >
                            Remover carga
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onAddCharge}
                        style={{
                            width: '100%',
                            height: 31,
                            marginTop: 13,
                            color: '#e7f2ff',
                            background: '#2c5f93',
                            border: '1px solid #3e83c4',
                            borderRadius: 5,
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 700,
                        }}
                    >
                        Adicionar carga
                    </button>
                )}
            </div>
        </aside>
    );
}
