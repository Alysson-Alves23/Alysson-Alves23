import { generateFieldGeometry } from './FieldGeometry';
import type { FieldCalculationRequest, FieldCalculationResponse } from './fieldCalculationTypes';

const workerScope = self as unknown as {
    onmessage: ((event: MessageEvent<FieldCalculationRequest>) => void) | null;
    postMessage: (response: FieldCalculationResponse) => void;
};
let latestRevision = 0;
workerScope.onmessage = async ({ data }) => {
    latestRevision = data.revision;
    const calculation = generateFieldGeometry(data);
    try {
        while (latestRevision === data.revision) {
            const deadline = performance.now() + 8;
            do {
                const step = calculation.next();
                if (step.done) {
                    workerScope.postMessage({ revision: data.revision, geometry: step.value });
                    return;
                }
            } while (performance.now() < deadline);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    } catch {
        if (latestRevision === data.revision) {
            workerScope.postMessage({ revision: data.revision, error: 'Não foi possível calcular o campo. Reduza a densidade ou reveja os valores.' });
        }
    }
};
