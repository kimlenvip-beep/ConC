import { CALC } from '../lib/calculations';
import { fmt } from '../lib/utils';

export default function WallpaperItem(props: any) {
    const price = CALC.calculateItemPrice(props);
    return {
        price,
        priceDisplay: fmt(price)
    };
}