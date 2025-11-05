// src/lib/calculations.ts
// (ตามข้อ 8) แปลงเป็น .ts
// (ตามข้อ 6) ใช้-Types-ที่เข้มงวดสำหรับการคำนวณ

import { PRICING, SQM_TO_SQYD, WALLPAPER_SPECS } from './config';
import { toNum } from './utils';
import type { Item, SetItemData, WallpaperItemData, AreaBasedItemData } from '../types';

/**
 * A collection of centralized calculation functions.
 * (QoL: Single source of truth for pricing)
 */
export const CALC = {

    // --- SET (CURTAIN) HELPERS ---
    stylePlus: (s: string): number => PRICING.style_surcharge[s] ?? 0,
    
    heightPlus: (h: number): number => {
        const sorted = [...PRICING.height].sort((a, b) => b.threshold - a.threshold);
        for (const entry of sorted) {
            if (h > entry.threshold) return entry.surcharge;
        }
        return 0;
    },
    
    railPrice: (w: number, type: string): number => {
        const railCost = PRICING.rail[type] ?? PRICING.rail["มาตรฐาน"];
        return Math.ceil(w) * railCost * PRICING.rail_surcharge_percent;
    },
    
    installPrice: (w: number, type: string): number => {
        const installCost = PRICING.installation[type] ?? PRICING.installation["มาตรฐาน"];
        return Math.ceil(w) * installCost;
    },

    // --- CORE ITEM CALCULATORS ---

    /**
     * Calculates price for SetItemData (Curtains).
     */
    calculateSetPrice: (item: SetItemData): { total: number; material: number; rail: number; install: number; } => {
        if (item.is_suspended) return { total: 0, material: 0, rail: 0, install: 0 };
        
        const w = toNum(item.width_m);
        const h = toNum(item.height_m);
        if (w <= 0 || h <= 0) return { total: 0, material: 0, rail: 0, install: 0 };

        let material = 0;
        let rail = 0;
        let install = 0;

        const styleSurcharge = CALC.stylePlus(item.set_style);
        const heightSurcharge = CALC.heightPlus(h);

        // Calculate material price
        if (item.fabric_variant === 'ทึบ' || item.fabric_variant === 'ทึบ & โปร่ง') {
            const fabricPrice = toNum(item.price_per_m_raw);
            if (fabricPrice > 0) {
                material += (w * 3) * (fabricPrice + heightSurcharge);
            }
        }
        if (item.fabric_variant === 'โปร่ง' || item.fabric_variant === 'ทึบ & โปร่ง') {
            const sheerPrice = toNum(item.sheer_price_per_m);
            if (sheerPrice > 0) {
                material += (w * 2.5) * (sheerPrice + heightSurcharge);
            }
        }

        // Calculate rail and install
        if (item.set_style === 'ม่านพับ') {
            rail = (w * h * SQM_TO_SQYD) * PRICING.folding_curtain_accessory;
            install = 0; // (รวมในค่าอุปกรณ์แล้ว-ตาม-logic-เดิม)
        } else if (item.set_style === 'หลุยส์') {
            const louisPrice = toNum(item.louis_price_per_m);
            material += (w * louisPrice);
            // (Logic-เดิม-หลุยส์ใช้รางและติดตั้งเหมือนม่านปกติ)
            rail = CALC.railPrice(w, "มาตรฐาน");
            install = CALC.installPrice(w, "มาตรฐาน");
        } else {
            rail = CALC.railPrice(w, "มาตรฐาน");
            install = CALC.installPrice(w, "มาตรฐาน");
        }
        
        // Add style-specific costs
        material += (w * styleSurcharge);

        const total = material + rail + install;
        return { total, material, rail, install };
    },

    /**
     * Calculates price for WallpaperItemData.
     */
    calculateWallpaperPrice: (wp: WallpaperItemData): { total: number; material: number; install: number; rolls: number; sqm: number; } => {
        if (wp.is_suspended) return { total: 0, material: 0, install: 0, rolls: 0, sqm: 0 };
        
        const totalWidth = wp.widths?.reduce((sum, w) => sum + toNum(w), 0) || 0;
        const height = toNum(wp.height_m);
        if (totalWidth <= 0 || height <= 0) return { total: 0, material: 0, install: 0, rolls: 0, sqm: 0 };

        const sqm = totalWidth * height;
        const rolls = Math.ceil((sqm * WALLPAPER_SPECS.waste_allowance) / WALLPAPER_SPECS.roll_sqm);
        const materialPrice = rolls * toNum(wp.price_per_roll);

        // (QoL) เคารพค่าแรง-0-บาท-ถ้าผู้ใช้ป้อน-0
        let installCostPerRoll = PRICING.wallpaper_install_cost_per_roll; // Default
        const savedInstallCost = wp.install_cost_per_roll; // (นี่คือ-number-จาก-storage)

        if (savedInstallCost === 0) {
            installCostPerRoll = 0;
        } else if (savedInstallCost > 0) {
            installCostPerRoll = savedInstallCost;
        }
        
        const installPrice = rolls * installCostPerRoll;
        const total = materialPrice + installPrice;
        
        return { total, material: materialPrice, install: installPrice, rolls, sqm };
    },

    /**
     * Calculates price for AreaBasedItemData (Blinds, etc.).
     */
    calculateAreaBasedPrice: (item: AreaBasedItemData): { total: number; sqm: number; sqyd: number; } => {
        if (item.is_suspended) return { total: 0, sqm: 0, sqyd: 0 };

        const w = toNum(item.width_m);
        const h = toNum(item.height_m);
        if (w <= 0 || h <= 0) return { total: 0, sqm: 0, sqyd: 0 };
        
        // (QoL) ปัดเศษขั้นต่ำตาม-logic-เดิม
        const widthCalc = Math.max(1, Math.ceil(w * 2) / 2);
        const heightCalc = Math.max(1, Math.ceil(h * 2) / 2);

        const sqm = widthCalc * heightCalc;
        const sqyd = sqm * SQM_TO_SQYD;
        const sqydRounded = Math.ceil(sqyd); // ปัดหลาขึ้นเสมอ
        
        const total = sqydRounded * toNum(item.price_sqyd);
        
        return { total, sqm, sqyd };
    },
    
    /**
     * Calculates the total price for any item type.
     * @param item - The item object (Set, Wallpaper, or AreaBased).
     * @returns The total price for the item.
     */
    calculateItemPrice: (item: Item): number => {
        if (item.is_suspended) return 0;

        switch (item.type) {
            case 'set':
                return CALC.calculateSetPrice(item as SetItemData).total;
            case 'wallpaper':
                return CALC.calculateWallpaperPrice(item as WallpaperItemData).total;
            case 'placeholder':
                return 0; // Placeholder-ไม่มีราคา
            default:
                // (TS) ตรวจสอบว่าเป็น-AreaBased-หรือไม่
                if (ITEM_CONFIG[item.type]) {
                    return CALC.calculateAreaBasedPrice(item as AreaBasedItemData).total;
                }
                return 0;
        }
    }
};
