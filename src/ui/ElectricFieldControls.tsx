import { useEffect, useState } from 'react';
import { ChevronDown, Focus, MoveUpRight, Radar, Route } from 'lucide-react';
import type { CartesianCoordinates } from '../core/physics/types';
import { planeAxes } from '../core/physics/FieldSampling';
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
    onEnable: () => void;
    onToggleContribution: (chargeId: string) => void;
}

function physicalNumber(value: number): string {
    if (!Number.isFinite(value)) return '—';
    return value !== 0 && (Math.abs(value) < 0.001 || Math.abs(value) >= 1e5)
        ? value.toExponential(3).replace('.', ',')
        : value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

function CoordinateInput({ label, value, disabled, onChange }: {
    label: string; value: number; disabled?: boolean; onChange: (value: number) => void;
}) {
    const [text, setText] = useState(String(value));
    useEffect(() => setText(String(Math.round(value * 100000) / 100000)), [value]);
    return <input aria-label={label} title={label} disabled={disabled} inputMode="decimal" value={text}
        onBlur={() => setText(String(value))}
        onChange={event => {
            setText(event.target.value);
            const number = Number(event.target.value.replace(',', '.'));
            if (event.target.value.trim() && Number.isFinite(number)) onChange(number);
        }} />;
}

export function ElectricFieldControls({ options, state, enabled, charges, appearance,
    onChange, onProbePosition, onFrame, onEnable, onToggleContribution }: ElectricFieldControlsProps) {
    const [open, setOpen] = useState(true);
    const change = (patch: Partial<FieldDisplayOptions>) => onChange({ ...options, ...patch });
    const reading = state?.reading;
    const normal = planeAxes(options.plane)[2];
    const projectionLabel = state?.projected ? 'Projeção tangencial no plano' : 'Campo resultante';
    return <aside className="field-panel" aria-label="Visualização do campo elétrico">
        <button className="field-panel-heading" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span><span className="field-eyebrow">ELETROSTÁTICA</span><strong>Campo elétrico</strong></span>
            <ChevronDown size={17} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
        </button>
        {open && <div className="field-panel-body">
            <div className="field-segments" aria-label="Dimensão do campo">
                <button aria-pressed={options.space === 'plane'} onClick={() => change({ space: 'plane' })}>Plano</button>
                <button aria-pressed={options.space === 'volume'} onClick={() => change({ space: 'volume' })}>Volume 3D</button>
            </div>
            <div className="field-layers" aria-label="Representações do campo">
                <button aria-pressed={options.lines} onClick={() => change({ lines: !options.lines })}><Route size={17} />Linhas</button>
                <button aria-pressed={options.vectors} onClick={() => change({ vectors: !options.vectors })}><MoveUpRight size={17} />Vetores</button>
                <button aria-pressed={options.probe} onClick={() => change({ probe: !options.probe })}><Radar size={17} />Sonda</button>
            </div>
            {!enabled && <button className="field-enable" onClick={onEnable}>Mostrar campo (E)</button>}
            {options.space === 'plane' && <div className="field-two-columns">
                <label>Plano de corte<select aria-label="Plano de corte" value={options.plane}
                    onChange={event => change({ plane: event.target.value as FieldDisplayOptions['plane'] })}>
                    <option value="xz">XZ</option><option value="xy">XY</option><option value="yz">YZ</option>
                </select></label>
                <label>Corte {'XYZ'[normal]} (m)<CoordinateInput label="Posição do plano (m)" value={options.offset} onChange={offset => change({ offset })} /></label>
            </div>}
            <div className="field-two-columns">
                <label>Densidade<select aria-label="Densidade do campo" value={options.density}
                    onChange={event => change({ density: event.target.value as FieldDisplayOptions['density'] })}>
                    <option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option>
                </select></label>
                <label>Coloração<select aria-label="Coloração do campo" value={options.colorMode}
                    onChange={event => change({ colorMode: event.target.value as FieldDisplayOptions['colorMode'] })}>
                    <option value="classic">Clássica</option><option value="magnitude">Intensidade</option>
                </select></label>
            </div>
            {options.vectors && <label>Comprimento dos vetores<select aria-label="Comprimento dos vetores" value={options.arrowLength}
                onChange={event => change({ arrowLength: event.target.value as FieldDisplayOptions['arrowLength'] })}>
                <option value="logarithmic">Intensidade · escala logarítmica</option><option value="uniform">Uniforme · somente direção</option>
            </select></label>}
            <button className="field-frame" onClick={onFrame}><Focus size={15} />Enquadrar campo</button>
            <div className="field-caption" role="status">
                {state?.error ? <span className="field-error">{state.error}</span>
                    : state?.busy ? 'Atualizando campo…'
                    : !charges.length ? 'Adicione cargas pelo botão +. Valores opostos formam um dipolo.'
                    : <>{projectionLabel}<span>{state?.lineCount ?? 0} linhas · {state?.vectorCount ?? 0} vetores</span></>}
            </div>
            {state?.projected && <p className="field-note">O corte mostra a componente no plano. A sonda mede também a componente perpendicular.</p>}
            {options.colorMode === 'magnitude' && <div className="field-legend" aria-label="Escala de intensidade em N/C">
                <div style={{ background: `linear-gradient(90deg, ${appearance.magnitudeColors.join(',')})` }} />
                <span>0<span>≥ {physicalNumber(state?.colorMaximum ?? 1)} N/C</span></span>
                <small>Escala logarítmica automática · saturação no percentil 95</small>
            </div>}
            {options.probe && <section className="field-probe" aria-label="Leitura da sonda">
                <div className="field-section-title"><strong>Sonda P</strong><span>posição em m</span></div>
                <div className="field-coordinates">{['X', 'Y', 'Z'].map((axis, index) => <label key={axis}>{axis}
                    <CoordinateInput label={`Sonda ${axis} (m)`} value={state?.probePosition[index] ?? 0}
                        disabled={options.space === 'plane' && index === normal} onChange={value => {
                            const position: [number, number, number] = [...(state?.probePosition ?? [0, 0, 1])];
                            position[index] = value; onProbePosition(position);
                        }} />
                </label>)}</div>
                <p className="field-note">Arraste o ponto violeta. Todas as setas da sonda usam a mesma escala linear.</p>
                {reading?.status === 'excluded' ? <p className="field-error">Dentro do raio de corte de {reading.excludedChargeIds.join(', ')}. Mova a sonda para medir.</p>
                    : reading?.status === 'invalid' ? <p className="field-error">A leitura excede a precisão numérica. Reveja as coordenadas e cargas.</p>
                    : reading && <>
                        <div className="field-result"><span>Resultante |E|</span><strong>{physicalNumber(reading.magnitude)} <small>N/C</small></strong></div>
                        <div className="field-components" aria-label="Componentes do campo em N/C">{['Ex', 'Ey', 'Ez'].map((label, index) => <span key={label}>{label} (N/C)<b>{physicalNumber(reading.vector[index])}</b></span>)}</div>
                        <div className="field-contributions">{reading.contributions.map(item => {
                            const charge = charges.find(charge => charge.id === item.chargeId);
                            return <div key={item.chargeId}>
                                <button onClick={() => onToggleContribution(item.chargeId)} aria-pressed={charge?.visibility.electricField ?? true}
                                    aria-label={`Contribuição de ${item.chargeId}`} title="Mostrar ou ocultar o vetor individual; a resultante inclui todas as cargas">
                                    <i style={{ background: charge?.color }} />{item.chargeId}
                                </button><span title={`(${item.vector.map(physicalNumber).join('; ')}) N/C`}>{physicalNumber(item.magnitude)} N/C</span>
                            </div>;
                        })}</div>
                        <p className="field-note">A resultante inclui todas as cargas, mesmo com contribuições individuais ocultas.</p>
                    </>}
            </section>}
        </div>}
    </aside>;
}
