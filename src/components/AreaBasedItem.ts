import { toNum, fmtDimension } from '../lib/utils';
import { CALC } from '../lib/calculations';

export default function AreaBasedItem(props: any) {
    const area = toNum(props?.area);
    const price = CALC.calculateItemPrice(props);
    return {
        areaDisplay: fmtDimension(area),
        price
    };
}