import { toNum } from '../lib/utils';
import { CALC } from '../lib/calculations';

export default function SetItem(props: any) {
    const quantity = toNum(props?.quantity);
    const price = CALC.calculateItemPrice(props);
    return {
        quantity,
        price
    };
}