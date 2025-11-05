import { PRICING, WALLPAPER_SPECS } from './config';
import { toNum } from './utils';
import type { Item } from '../types';

class Calculator {
    calculateItemPrice(item: Item | any): number {
        if (!item || item.is_suspended) return 0;
        const t = (item.type || '').toString();
        if (t === 'set') return this.calculateSetPrice(item);
        if (t === 'area') return this.calculateAreaPrice(item);
        if (t === 'wallpaper') return this.calculateWallpaperPrice(item);
        return 0;
    }

    private calculateSetPrice(item: any): number {
        const quantity = toNum(item.quantity);
        const pricePerUnit = toNum(item.price_per_unit);
        const basePrice = quantity * pricePerUnit;
        if (basePrice <= 0) return 0;
        return Math.max(basePrice, PRICING.MIN_CHARGE);
    }

    private calculateAreaPrice(item: any): number {
        const area = toNum(item.area);
        if (area <= 0) return 0;
        const pricePerSqm = toNum(item.price_per_sqm);
        const laborRate = toNum(item.labor_rate) || PRICING.DEFAULT_LABOR_RATE;
        const materialCost = area * pricePerSqm;
        const laborCost = area * laborRate;
        return materialCost + laborCost + PRICING.SETUP_FEE;
    }

    private calculateWallpaperPrice(item: any): number {
        const width = toNum(item.width);
        const height = toNum(item.height);
        const pricePerRoll = toNum(item.price_per_roll);
        if (width <= 0 || height <= 0 || pricePerRoll <= 0) return 0;
        const area = width * height;
        const rollsNeeded = Math.max(1, Math.ceil((area * WALLPAPER_SPECS.waste_allowance) / WALLPAPER_SPECS.roll_sqm));
        return rollsNeeded * pricePerRoll;
    }

    calculateTotalWithTax(subtotal: number): number {
        const s = toNum(subtotal);
        return s * (1 + (PRICING.TAX_RATE || 0));
    }

    calculateDiscount(total: number): number {
        const t = toNum(total);
        let discountRate = 0;
        for (const d of PRICING.VOLUME_DISCOUNTS) {
            if (t >= d.threshold) discountRate = d.rate;
        }
        return t * discountRate;
    }
}

export const CALC = new Calculator();