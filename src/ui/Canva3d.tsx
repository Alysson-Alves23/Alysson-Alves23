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
import type {
    ChargeDraft,
    ChargeDraftField,
    ChargeSummary,
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
    color: '#ff3b30',
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

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return undefined;
        }

        const canva3D = new Canva3D(container, initialThemeRef.current);
        canvaRef.current = canva3D;
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
        });
        charge.position.set(parsedDraft.x, parsedDraft.y, parsedDraft.z);
        chargesRef.current.set(id, charge);
        canva3D.selectCharge(charge);
        selectedChargeIdRef.current = id;
        setSelectedChargeId(id);
        setCharges((currentCharges) => [
            ...currentCharges,
            {
                id,
                value: parsedDraft.value,
                color: parsedDraft.color,
                position: positionOf(charge),
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

    const handleApplyPosition = (): void => {
        const chargeId = selectedChargeIdRef.current;
        const charge = chargeId ? chargesRef.current.get(chargeId) : undefined;
        const parsedDraft = readDraftPosition(draft);

        if (!charge || !parsedDraft) {
            return;
        }

        charge.position.set(parsedDraft.x, parsedDraft.y, parsedDraft.z);
        setCharges((currentCharges) => currentCharges.map((currentCharge) => (
            currentCharge.id === charge.chargeId
                ? { ...currentCharge, position: positionOf(charge) }
                : currentCharge
        )));
    };

    const handleApplyProperties = (): void => {
        const chargeId = selectedChargeIdRef.current;
        const charge = chargeId ? chargesRef.current.get(chargeId) : undefined;
        const parsedDraft = readDraftPosition(draft);

        if (!charge || !parsedDraft) {
            return;
        }

        charge.setValue(parsedDraft.value);
        charge.setColor(parsedDraft.color);
        setCharges((currentCharges) => currentCharges.map((currentCharge) => (
            currentCharge.id === charge.chargeId
                ? {
                    ...currentCharge,
                    value: charge.getValue(),
                    color: charge.getColor(),
                }
                : currentCharge
        )));
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

    const handleToolChange = (tool: SimulationTool): void => {
        setActiveTool(tool);
    };

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
                hasSelectedCharge={Boolean(selectedChargeId)}
                onAddCharge={handleAddCharge}
                onApplyPosition={handleApplyPosition}
                onDraftChange={handleDraftChange}
                onToolChange={handleToolChange}
            />
            <SimulationControls
                charges={charges}
                selectedChargeId={selectedChargeId}
                draft={draft}
                onDraftChange={handleDraftChange}
                onAddCharge={handleAddCharge}
                onSelectCharge={handleSelectCharge}
                onApplyProperties={handleApplyProperties}
                onRemoveCharge={handleRemoveCharge}
            />
        </div>
    );
}
