import { PRICING, WALLPAPER_SPECS, SQM_TO_SQYD } from './config';
import { toNum } from './utils';
import type { Item, SetItemData, AreaBasedItemData, WallpaperItemData } from '../types';

class Calculator {
    calculateItemPrice(item: Item): number {
        if (!item || item.is_suspended) return 0;

        switch (item.type) {
            case 'set':
                return this.calculateSetPrice(item as Item & SetItemData);
            case 'area':
                return this.calculateAreaPrice(item as Item & AreaBasedItemData);
            case 'wallpaper':
                return this.calculateWallpaperPrice(item as Item & WallpaperItemData);
            default:
                return 0;
        }
    }

    private calculateSetPrice(item: Item & SetItemData): number {
        const quantity = toNum((item as any).quantity);
        const pricePerUnit = toNum((item as any).price_per_unit);
        const basePrice = quantity * pricePerUnit;
        return Math.max(basePrice, PRICING.MIN_CHARGE);
    }

    private calculateAreaPrice(item: Item & AreaBasedItemData): number {
        const area = toNum((item as any).area);
        const pricePerSqm = toNum((item as any).price_per_sqm);
        const laborRate = toNum((item as any).labor_rate) || PRICING.DEFAULT_LABOR_RATE;

        const materialCost = area * pricePerSqm;
        const laborCost = area * laborRate;

        return materialCost + laborCost + PRICING.SETUP_FEE;
    }

    private calculateWallpaperPrice(item: Item & WallpaperItemData): number {
        const width = toNum((item as any).width);
        const height = toNum((item as any).height);
        const pricePerRoll = toNum((item as any).price_per_roll);

        if (width === 0 || height === 0 || pricePerRoll === 0) return 0;

        const area = width * height;
        const rollsNeeded = Math.ceil(
            (area * WALLPAPER_SPECS.waste_allowance) / WALLPAPER_SPECS.roll_sqm
        );

        return rollsNeeded * pricePerRoll;
    }

    calculateTotalWithTax(subtotal: number): number {
        return subtotal * (1 + PRICING.TAX_RATE);
    }

    calculateDiscount(total: number): number {
        let discountRate = 0;
        for (const { threshold, rate } of PRICING.VOLUME_DISCOUNTS) {
            if (total >= threshold) discountRate = rate;
        }
        return total * discountRate;
    }
}

export const CALC = new Calculator();