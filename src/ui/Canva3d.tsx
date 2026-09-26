import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from 'react';
import { Canva3D } from '../render/Canva3d';
import { Charge } from '../render/objects/Charge';
import type { SimulationThemeConfig } from '../render/types/SimulationTheme';
import { defaultSimulationTheme } from './theme/SimulationTheme';
import {
    SimulationControls,
} from './SimulationControls';
import {
    SimulationToolbar,
    type SimulationTool,
} from './SimulationToolbar';
import { defaultChargeVisibility } from './simulationTypes';
import type {
    ChargeDraft,
    ChargeDraftField,
    ChargeSummary,
    ChargeVisibility,
    VisualizationLayer,
} from './simulationTypes';

export interface Canva3dProps {
    className?: string;
    style?: CSSProperties;
    theme?: SimulationThemeConfig;
}

const initialDraft: ChargeDraft = {
    value: '1',
    x: '0',
    y: '0',
    z: '0',
    color: String(defaultSimulationTheme.charge.positiveColor),
};

function readDraftPosition(draft: ChargeDraft): {
    value: number;
    x: number;
    y: number;
    z: number;
    color: string;
} | null {
    const value = Number(draft.value);
    const x = Number(draft.x);
    const y = Number(draft.y);
    const z = Number(draft.z);

    if (![value, x, y, z].every(Number.isFinite) || !draft.color) {
        return null;
    }

    return { value, x, y, z, color: draft.color };
}

function positionOf(charge: Charge): [number, number, number] {
    return [charge.position.x, charge.position.y, charge.position.z];
}

function isEditableTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable);
}

export default function Canva3d({
    className,
    style,
    theme = defaultSimulationTheme,
}: Canva3dProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvaRef = useRef<Canva3D | null>(null);
    const chargesRef = useRef(new Map<string, Charge>());
    const selectedChargeIdRef = useRef<string | null>(null);
    const nextChargeIdRef = useRef(1);
    const initialThemeRef = useRef(theme);
    const [charges, setCharges] = useState<ChargeSummary[]>([]);
    const [selectedChargeId, setSelectedChargeId] = useState<string | null>(null);
    const [draft, setDraft] = useState<ChargeDraft>(initialDraft);
    const [activeTool, setActiveTool] = useState<SimulationTool>('select');
    const [globalVisibility, setGlobalVisibility] = useState<ChargeVisibility>({
        electricField: false,
        forceVectors: false,
        distanceGuide: false,
    });

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return undefined;
        }

        const canva3D = new Canva3D(container, initialThemeRef.current);
        canvaRef.current = canva3D;
        canva3D.setMoveToolActive(false);
        const unsubscribeFromSelection = canva3D.onChargeSelected((charge) => {
            if (!charge) {
                selectedChargeIdRef.current = null;
                setSelectedChargeId(null);
                return;
            }

            const position = positionOf(charge);
            selectedChargeIdRef.current = charge.chargeId;
            setSelectedChargeId(charge.chargeId);
            setDraft((currentDraft) => ({
                ...currentDraft,
                value: String(charge.getValue()),
                x: String(position[0]),
                y: String(position[1]),
                z: String(position[2]),
                color: charge.getColor(),
            }));
        });
        const unsubscribeFromMovement = canva3D.onChargeMoved((charge) => {
            const position = positionOf(charge);

            setCharges((currentCharges) => currentCharges.map((currentCharge) => (
                currentCharge.id === charge.chargeId
                    ? { ...currentCharge, position }
                    : currentCharge
            )));

            if (selectedChargeIdRef.current === charge.chargeId) {
                setDraft((currentDraft) => ({
                    ...currentDraft,
                    x: String(position[0]),
                    y: String(position[1]),
                    z: String(position[2]),
                }));
            }
        });

        return () => {
            unsubscribeFromSelection();
            unsubscribeFromMovement();
            canva3D.dispose();
            canvaRef.current = null;
            chargesRef.current.clear();
            selectedChargeIdRef.current = null;
        };
    }, []);

    const handleDraftChange = (field: ChargeDraftField, value: string): void => {
        setDraft((currentDraft) => ({
            ...currentDraft,
            [field]: value,
        }));

        const chargeId = selectedChargeIdRef.current;
        const charge = chargeId ? chargesRef.current.get(chargeId) : undefined;

        if (!charge) {
            return;
        }

        if (field === 'color') {
            charge.setColor(value);
            setCharges((currentCharges) => currentCharges.map((currentCharge) => (
                currentCharge.id === charge.chargeId
                    ? { ...currentCharge, color: charge.getColor() }
                    : currentCharge
            )));
        }

        if (field === 'value') {
            const parsedValue = Number(value);

            if (value.trim() !== '' && Number.isFinite(parsedValue)) {
                charge.setValue(parsedValue);
                setCharges((currentCharges) => currentCharges.map((currentCharge) => (
                    currentCharge.id === charge.chargeId
                        ? { ...currentCharge, value: charge.getValue() }
                        : currentCharge
                )));
            }
        }

        if (field === 'x' || field === 'y' || field === 'z') {
            const coordinate = Number(value);

            if (value.trim() === '' || !Number.isFinite(coordinate)) {
                return;
            }

            if (field === 'x') {
                charge.position.x = coordinate;
            } else if (field === 'y') {
                charge.position.y = coordinate;
            } else {
                charge.position.z = coordinate;
            }

            setCharges((currentCharges) => currentCharges.map((currentCharge) => (
                currentCharge.id === charge.chargeId
                    ? { ...currentCharge, position: positionOf(charge) }
                    : currentCharge
            )));
        }
    };

    const handleAddCharge = (): void => {
        const canva3D = canvaRef.current;
        const parsedDraft = readDraftPosition(draft);

        if (!canva3D || !parsedDraft) {
            return;
        }

        const id = `charge-${nextChargeIdRef.current}`;
        nextChargeIdRef.current += 1;

        const charge = canva3D.createCharge({
            id,
            value: parsedDraft.value,
            color: parsedDraft.color,
            visibility: { ...defaultChargeVisibility },
        });
        charge.position.set(parsedDraft.x, parsedDraft.y, parsedDraft.z);
        chargesRef.current.set(id, charge);
        canva3D.setMoveToolActive(true);
        canva3D.selectCharge(charge);
        selectedChargeIdRef.current = id;
        setSelectedChargeId(id);
        setActiveTool('move');
        setCharges((currentCharges) => [
            ...currentCharges,
            {
                id,
                value: parsedDraft.value,
                color: parsedDraft.color,
                position: positionOf(charge),
                visibility: { ...defaultChargeVisibility },
            },
        ]);
    };

    const handleSelectCharge = (chargeId: string): void => {
        const canva3D = canvaRef.current;
        const charge = chargesRef.current.get(chargeId);

        if (!canva3D || !charge) {
            return;
        }

        canva3D.selectCharge(charge);
        selectedChargeIdRef.current = chargeId;
        setSelectedChargeId(chargeId);
        setDraft((currentDraft) => ({
            ...currentDraft,
            value: String(charges.find((item) => item.id === chargeId)?.value ?? currentDraft.value),
            x: String(charge.position.x),
            y: String(charge.position.y),
            z: String(charge.position.z),
            color: charge.getColor(),
        }));
    };

    const handleRemoveCharge = (): void => {
        const chargeId = selectedChargeIdRef.current;
        const charge = chargeId ? chargesRef.current.get(chargeId) : undefined;

        if (!canvaRef.current || !charge) {
            return;
        }

        canvaRef.current.removeCharge(charge);
        chargesRef.current.delete(charge.chargeId);
        selectedChargeIdRef.current = null;
        setSelectedChargeId(null);
        setCharges((currentCharges) => currentCharges.filter(
            (currentCharge) => currentCharge.id !== charge.chargeId,
        ));
    };

    const handleClearSelection = (): void => {
        const canva3D = canvaRef.current;

        if (canva3D) {
            canva3D.selectCharge(null);
        }

        selectedChargeIdRef.current = null;
        setSelectedChargeId(null);
        setActiveTool('select');
    };

    const handleToolChange = (tool: SimulationTool): void => {
        setActiveTool(tool);
        canvaRef.current?.setMoveToolActive(tool === 'move');
    };

    const handleToggleGlobalLayer = (layer: VisualizationLayer): void => {
        setGlobalVisibility((currentVisibility) => {
            const nextVisibility = {
                ...currentVisibility,
                [layer]: !currentVisibility[layer],
            };
            canvaRef.current?.setGlobalVisualizationVisibility(nextVisibility);
            return nextVisibility;
        });
    };

    const handleToggleChargeLayer = (layer: VisualizationLayer): void => {
        const chargeId = selectedChargeIdRef.current;
        const charge = chargeId ? chargesRef.current.get(chargeId) : undefined;

        if (!chargeId || !charge) {
            return;
        }

        const nextVisibility = {
            ...charge.getVisibility(),
            [layer]: !charge.getVisibility()[layer],
        };
        charge.setVisibility(nextVisibility);

        setCharges((currentCharges) => currentCharges.map((charge) => (
            charge.id === chargeId
                ? {
                    ...charge,
                    visibility: nextVisibility,
                }
                : charge
        )));
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (isEditableTarget(event.target)) {
                return;
            }

            const key = event.key.toLowerCase();

            if (event.key === 'Delete' || event.key === 'Backspace') {
                if (selectedChargeIdRef.current) {
                    event.preventDefault();
                    handleRemoveCharge();
                }
                return;
            }

            if (event.key === 'Escape') {
                handleClearSelection();
                return;
            }

            if (key === 'v') {
                handleToolChange('select');
                return;
            }

            if (key === 'g') {
                handleToolChange('move');
                return;
            }

            if (key === 'e') {
                handleToggleGlobalLayer('electricField');
                return;
            }

            if (key === 'f') {
                handleToggleGlobalLayer('forceVectors');
                return;
            }

            if (key === 'r') {
                handleToggleGlobalLayer('distanceGuide');
                return;
            }

            if (event.shiftKey && key === 'a') {
                event.preventDefault();
                handleAddCharge();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [draft, globalVisibility, selectedChargeId]);

    return (
        <div
            className={className}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: 360,
                overflow: 'hidden',
                background: '#10141a',
                ...style,
            }}
            aria-label="Área tridimensional do simulador"
        >
            <div
                ref={containerRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    minWidth: 0,
                    minHeight: 360,
                    overflow: 'hidden',
                }}
                aria-label="Viewport tridimensional"
            />
            <SimulationToolbar
                activeTool={activeTool}
                chargesCount={charges.length}
                draft={draft}
                globalVisibility={globalVisibility}
                onDraftChange={handleDraftChange}
                onToggleGlobalLayer={handleToggleGlobalLayer}
                onToolChange={handleToolChange}
            />
            <SimulationControls
                charges={charges}
                selectedChargeId={selectedChargeId}
                draft={draft}
                onDraftChange={handleDraftChange}
                onAddCharge={handleAddCharge}
                onSelectCharge={handleSelectCharge}
                onRemoveCharge={handleRemoveCharge}
                onToggleChargeLayer={handleToggleChargeLayer}
            />
        </div>
    );
}
