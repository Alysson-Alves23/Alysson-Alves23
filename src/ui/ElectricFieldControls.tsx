import { useEffect, useState } from 'react';
import {
    Activity,
    Box,
    ChevronDown,
    ChevronRight,
    Focus,
    Grid2X2,
    Info,
    LocateFixed,
    MoveUpRight,
    Radar,
    Route,
    SlidersHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CartesianCoordinates } from '../core/physics/electrostatics/types';
import { planeAxes } from '../render/field/FieldSampling';
import type { FieldDisplayOptions, FieldViewState } from '../render/types/FieldDisplayOptions';
import type { SimulationThemeConfig } from '../render/types/SimulationTheme';
import type { ChargeSummary } from './simulationTypes';
import './electricField.css';

interface ElectricFieldControlsProps {
    options: FieldDisplayOptions;
    state: FieldViewState | null;
    enabled: boolean;
    charges: ChargeSummary[];
    appearance: SimulationThemeConfig['field'];
    onChange: (options: FieldDisplayOptions) => void;
    onProbePosition: (position: CartesianCoordinates) => void;
    onFrame: () => void;
    onToggleContribution: (chargeId: string) => void;
}

const fieldShortcuts = {
    lines: 'L',
    vectors: 'V',
    probe: 'P',
} as const;

function physicalNumber(value: number): string {
    if (!Number.isFinite(value)) return '—';
    return value !== 0 && (Math.abs(value) < 0.001 || Math.abs(value) >= 1e5)
        ? value.toExponential(3).replace('.', ',')
        : value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

function IconToggle({ icon: Icon, label, pressed, shortcut, disabled, onClick }: {
    icon: LucideIcon;
    label: string;
    pressed: boolean;
    shortcut?: string;
    disabled?: boolean;
    onClick: () => void;
}) {
    const title = shortcut ? `${label} (${shortcut})` : label;

    return (
        <button
            type="button"
            className="field-icon-button"
            title={title}
            aria-label={title}
            aria-pressed={pressed}
            aria-keyshortcuts={shortcut}
            disabled={disabled}
            onClick={onClick}
        >
            <Icon size={17} strokeWidth={1.9} />
        </button>
    );
}

function CoordinateInput({ label, value, disabled, onChange }: {
    label: string;
    value: number;
    disabled?: boolean;
    onChange: (value: number) => void;
}) {
    const [text, setText] = useState(String(value));

    useEffect(() => setText(String(Math.round(value * 100000) / 100000)), [value]);

    return (
        <input
            aria-label={label}
            title={label}
            disabled={disabled}
            inputMode="decimal"
            value={text}
            onBlur={() => setText(String(value))}
            onChange={event => {
                setText(event.target.value);
                const number = Number(event.target.value.replace(',', '.'));
                if (event.target.value.trim() && Number.isFinite(number)) onChange(number);
            }}
        />
    );
}

export function ElectricFieldControls({ options, state, enabled, charges, appearance,
    onChange, onProbePosition, onFrame, onToggleContribution }: ElectricFieldControlsProps) {
    const [open, setOpen] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [probePositionOpen, setProbePositionOpen] = useState(false);
    const [componentsOpen, setComponentsOpen] = useState(false);
    const [contributionsOpen, setContributionsOpen] = useState(false);
    const change = (patch: Partial<FieldDisplayOptions>) => onChange({ ...options, ...patch });
    const reading = state?.reading;
    const normal = planeAxes(options.plane)[2];
    const position = state?.probePosition ?? [0, 0, 1];

    if (!enabled) return null;

    return (
        <aside className="field-panel" aria-label="Ferramentas do campo elétrico">
            <button
                className="field-panel-heading"
                aria-expanded={open}
                aria-label={`${open ? 'Recolher' : 'Expandir'} ferramentas do campo elétrico`}
                title={`${open ? 'Recolher' : 'Expandir'} ferramentas do campo elétrico`}
                onClick={() => setOpen(!open)}
            >
                <span className="field-panel-title">
                    <Activity size={16} />
                    <strong>Campo elétrico</strong>
                </span>
                <ChevronDown size={17} className={open ? 'field-chevron-open' : ''} />
            </button>

            {open && (
                <div className="field-panel-body">
                    <div className="field-tool-groups" aria-label="Ferramentas do campo">
                        <div className="field-tool-group" aria-label="Dimensão do campo">
                            <IconToggle
                                icon={Grid2X2}
                                label="Campo em plano"
                                pressed={options.space === 'plane'}
                                onClick={() => change({ space: 'plane' })}
                            />
                            <IconToggle
                                icon={Box}
                                label="Campo em volume 3D"
                                pressed={options.space === 'volume'}
                                onClick={() => change({ space: 'volume' })}
                            />
                        </div>
                        <span className="field-tool-separator" />
                        <div className="field-tool-group" aria-label="Representação do campo">
                            <IconToggle
                                icon={Route}
                                label="Linhas de campo"
                                shortcut={fieldShortcuts.lines}
                                pressed={options.lines}
                                onClick={() => change({ lines: !options.lines })}
                            />
                            <IconToggle
                                icon={MoveUpRight}
                                label="Vetores do campo"
                                shortcut={fieldShortcuts.vectors}
                                pressed={options.vectors}
                                onClick={() => change({ vectors: !options.vectors })}
                            />
                        </div>
                        <span className="field-tool-separator" />
                        <div className="field-tool-group" aria-label="Análise do campo">
                            <IconToggle
                                icon={Radar}
                                label="Ativar sonda"
                                shortcut={fieldShortcuts.probe}
                                pressed={options.probe}
                                disabled={charges.length === 0}
                                onClick={() => change({ probe: !options.probe })}
                            />
                        </div>
                    </div>

                    <div className="field-action-row" aria-label="Ajustes e enquadramento">
                        <button
                            type="button"
                            className={`field-icon-button${settingsOpen ? ' is-active' : ''}`}
                            title="Configurações do campo"
                            aria-label="Configurações do campo"
                            aria-expanded={settingsOpen}
                            onClick={() => setSettingsOpen(!settingsOpen)}
                        >
                            <SlidersHorizontal size={16} />
                        </button>
                        <button
                            type="button"
                            className="field-icon-button"
                            title="Enquadrar campo"
                            aria-label="Enquadrar campo"
                            disabled={charges.length === 0}
                            onClick={onFrame}
                        >
                            <Focus size={16} />
                        </button>
                        {state?.projected && (
                            <span
                                className="field-context-info"
                                title="As linhas seguem o campo 3D. A grade mostra a componente no corte; a sonda mede o vetor completo."
                                aria-label="O campo 3D está projetado na vista plana"
                            >
                                <Info size={15} />
                            </span>
                        )}
                    </div>

                    {settingsOpen && (
                        <section className="field-settings" aria-label="Configurações do campo">
                            {options.space === 'plane' && (
                                <>
                                    <label>
                                        Plano de corte
                                        <select
                                            aria-label="Plano de corte"
                                            value={options.plane}
                                            onChange={event => change({ plane: event.target.value as FieldDisplayOptions['plane'] })}
                                        >
                                            <option value="xz">XZ</option>
                                            <option value="xy">XY</option>
                                            <option value="yz">YZ</option>
                                        </select>
                                    </label>
                                    <label>
                                        Corte {'XYZ'[normal]} (m)
                                        <CoordinateInput
                                            label="Posição do plano (m)"
                                            value={options.offset}
                                            onChange={offset => change({ offset })}
                                        />
                                    </label>
                                </>
                            )}
                            <label>
                                Densidade
                                <select
                                    aria-label="Densidade do campo"
                                    value={options.density}
                                    onChange={event => change({ density: event.target.value as FieldDisplayOptions['density'] })}
                                >
                                    <option value="low">Baixa</option>
                                    <option value="medium">Média</option>
                                    <option value="high">Alta</option>
                                </select>
                            </label>
                            <label>
                                Coloração
                                <select
                                    aria-label="Coloração do campo"
                                    value={options.colorMode}
                                    onChange={event => change({ colorMode: event.target.value as FieldDisplayOptions['colorMode'] })}
                                >
                                    <option value="classic">Clássica</option>
                                    <option value="magnitude">Intensidade</option>
                                </select>
                            </label>
                            {options.vectors && (
                                <label>
                                    Comprimento dos vetores
                                    <select
                                        aria-label="Comprimento dos vetores"
                                        value={options.arrowLength}
                                        onChange={event => change({ arrowLength: event.target.value as FieldDisplayOptions['arrowLength'] })}
                                    >
                                        <option value="logarithmic">Intensidade · escala logarítmica</option>
                                        <option value="uniform">Uniforme · somente direção</option>
                                    </select>
                                </label>
                            )}
                            {options.colorMode === 'magnitude' && (
                                <div className="field-legend" aria-label="Escala de intensidade em N/C">
                                    <div style={{ background: `linear-gradient(90deg, ${appearance.magnitudeColors.join(',')})` }} />
                                    <span>0<span>≥ {physicalNumber(state?.colorMaximum ?? 1)} N/C</span></span>
                                </div>
                            )}
                        </section>
                    )}

                    {state?.error ? (
                        <p className="field-error" role="alert">{state.error}</p>
                    ) : state?.busy ? (
                        <p className="field-status" role="status">Calculando campo…</p>
                    ) : charges.length === 0 ? (
                        <p className="field-status" role="status">Adicione uma carga para calcular o campo.</p>
                    ) : null}

                    {options.probe && (
                        <section className="field-probe" aria-label="Leitura da sonda">
                            <div className="field-probe-heading">
                                <span><Radar size={15} /><strong>Sonda</strong></span>
                                <button
                                    type="button"
                                    className={`field-icon-button${probePositionOpen ? ' is-active' : ''}`}
                                    title="Editar posição da sonda"
                                    aria-label="Editar posição da sonda"
                                    aria-expanded={probePositionOpen}
                                    onClick={() => setProbePositionOpen(!probePositionOpen)}
                                >
                                    <LocateFixed size={15} />
                                </button>
                            </div>
                            {probePositionOpen && (
                                <div className="field-coordinates">
                                    {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                                        <label key={axis}>
                                            {axis}
                                            <CoordinateInput
                                                label={`Sonda ${axis} (m)`}
                                                value={position[index]}
                                                disabled={options.space === 'plane' && index === normal}
                                                onChange={value => {
                                                    const next: [number, number, number] = [...position];
                                                    next[index] = value;
                                                    onProbePosition(next);
                                                }}
                                            />
                                        </label>
                                    ))}
                                </div>
                            )}
                            {reading?.status === 'excluded' ? (
                                <p className="field-error">Sonda muito próxima de {reading.excludedChargeIds.join(', ')}.</p>
                            ) : reading?.status === 'invalid' ? (
                                <p className="field-error">Leitura fora da precisão numérica.</p>
                            ) : reading && (
                                <>
                                    <div className="field-result">
                                        <span>|E|</span>
                                        <strong>{physicalNumber(reading.fieldStrengthNewtonsPerCoulomb)} <small>N/C</small></strong>
                                    </div>
                                    <details className="field-details" open={componentsOpen} onToggle={event => setComponentsOpen(event.currentTarget.open)}>
                                        <summary>
                                            <ChevronRight size={14} />
                                            Componentes
                                        </summary>
                                        <div className="field-components" aria-label="Componentes do campo em N/C">
                                            {['Ex', 'Ey', 'Ez'].map((label, index) => (
                                                <span key={label}>{label}<b>{physicalNumber(reading.electricFieldVector[index])}</b></span>
                                            ))}
                                        </div>
                                    </details>
                                    {reading.contributions.length > 0 && (
                                        <details className="field-details" open={contributionsOpen} onToggle={event => setContributionsOpen(event.currentTarget.open)}>
                                            <summary title="A resultante considera todas as cargas">
                                                <ChevronRight size={14} />
                                                Contribuições
                                            </summary>
                                            <div className="field-contributions">
                                                {reading.contributions.map(item => {
                                                    const charge = charges.find(candidate => candidate.id === item.chargeId);
                                                    return (
                                                        <div key={item.chargeId}>
                                                            <button
                                                                type="button"
                                                                onClick={() => onToggleContribution(item.chargeId)}
                                                                aria-pressed={charge?.visibility.electricField ?? true}
                                                                aria-label={`Contribuição de ${item.chargeId}`}
                                                                title="Mostrar ou ocultar o vetor desta carga"
                                                            >
                                                                <i style={{ background: charge?.color }} />
                                                                {item.chargeId}
                                                            </button>
                                                            <span title={`(${item.electricFieldVector.map(physicalNumber).join('; ')}) N/C`}>
                                                                {physicalNumber(item.fieldStrengthNewtonsPerCoulomb)} N/C
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </details>
                                    )}
                                </>
                            )}
                        </section>
                    )}
                </div>
            )}
        </aside>
    );
}
