import { toNum, fmtDimension } from '../lib/utils';
import { CALC } from '../lib/calculations';

/**
 * Minimal AreaBasedItem helper used by the app.
 * Keep it simple so TypeScript type checks and runtime imports succeed.
 */
export default function AreaBasedItem(props: any) {
    const area = toNum(props?.area);
    const price = CALC.calculateItemPrice(props);
    return {
        areaDisplay: fmtDimension(area),
        price
    };
}