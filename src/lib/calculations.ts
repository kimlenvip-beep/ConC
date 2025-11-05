// src/lib/config.ts
import type { ShopConfig, ItemConfig, PricingConfig } from '../types';

export const APP_VERSION = "vite-ts/7.0.1";
export const WEBHOOK_URL = "https://your-make-webhook-url.com/your-unique-path";
export const STORAGE_KEY = "marnthara.input.v7.0.1";
export const PDF_EXPORT_DELAY_MS = 500;
export const SQM_TO_SQYD = 1.196;

// Add missing PRICING export
export const PRICING = {
    DEFAULT_LABOR_RATE: 100,
    MIN_CHARGE: 500,
    SETUP_FEE: 250,
    TAX_RATE: 0.07,
    VOLUME_DISCOUNTS: [
        { threshold: 50000, rate: 0.05 },
        { threshold: 100000, rate: 0.10 },
        { threshold: 200000, rate: 0.15 }
    ]
} as const;

export const WALLPAPER_SPECS = {
    roll_width_m: 0.53,
    roll_length_m: 10.0,
    roll_sqm: 5.0,
    waste_allowance: 1.15
} as const;

export const SELECTORS = {
    // ... (previous selectors remain unchanged)
} as const;

// Ensure all constants are immutable
Object.freeze(PRICING);
Object.freeze(WALLPAPER_SPECS);
Object.freeze(SELECTORS);
=======
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
>>>>>>> cb8a02287ec00b14740ece1ee9dc00b3aa13a238
