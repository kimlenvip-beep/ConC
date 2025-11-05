// src/components/WallpaperItem.ts
// (ตามข้อ 8) แปลงเป็น .ts
import { fmtTH, toNum, fmtDimension, handleCmToMBlur } from '../lib/utils';
import { SELECTORS, PRICING } from '../lib/config';
import type { WallpaperItemData } from '../types';

/**
 * Creates a single wall input row element.
 */
export function createWall(data: { width?: number } = {}): HTMLElement | null {
    const wallTemplate = document.querySelector<HTMLTemplateElement>(SELECTORS.wallTpl);
    if (!wallTemplate) return null;

    const clone = wallTemplate.content.cloneNode(true) as DocumentFragment;
    const wallEl = clone.firstElementChild as HTMLElement;
    const input = wallEl.querySelector<HTMLInputElement>('input[name="wall_width_m"]');
    
    if (!input) return null;

    input.value = fmtDimension(data.width);

    // (ตามข้อ 15) Accessibility: เชื่อม-Label
    // (FIX 2: ส่วนนี้ทำงานถูกต้องอยู่แล้ว)
    const uniqueId = `wall_width_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    input.id = uniqueId;
    const label = wallEl.querySelector('label');
    if (label) label.setAttribute('for', uniqueId);
    
    // (QoL) ใช้-handleCmToMBlur-สำหรับ-dimensions
    input.addEventListener('blur', handleCmToMBlur);

    return wallEl;
}

/**
 * Creates the main Wallpaper Item card component.
 */
export function createWallpaperItem(data: Partial<WallpaperItemData> = {}): HTMLElement | null {
    const template = document.querySelector<HTMLTemplateElement>(SELECTORS.wallpaperTpl);
    if (!template) {
        console.error('Wallpaper template not found');
        return null;
    }

    const clone = template.content.cloneNode(true) as DocumentFragment;
    const itemEl = clone.firstElementChild as HTMLElement;
    itemEl.dataset.type = 'wallpaper';
    itemEl.id = data.id || `item-${Date.now()}`;

    // [FIX 2] (Accessibility) เพิ่ม Helper Function สำหรับเชื่อม Label/Input
    const linkLabels = (baseId: string): void => {
        // (FIX 2) เลือกเฉพาะ .form-group ที่อยู่ใน .item-grid (ไม่รวม .walls-section)
        itemEl.querySelectorAll<HTMLElement>('.item-grid .form-group').forEach((group, index) => {
            const input = group.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
            const label = group.querySelector<HTMLLabelElement>('label');
            if (input && label) {
                const inputName = input.getAttribute('name') || `input-${index}`;
                const uniqueId = `${baseId}-${inputName}`;
                input.id = uniqueId;
                label.setAttribute('for', uniqueId);
            }
        });
    };
    linkLabels(itemEl.id); // เรียกใช้ Helper

    // --- Element Querying ---
    const wallsContainer = itemEl.querySelector<HTMLElement>('[data-container="walls"]');
    const heightInput = itemEl.querySelector<HTMLInputElement>('input[name="height_m"]');
    const priceRollInput = itemEl.querySelector<HTMLInputElement>('input[name="price_per_roll"]');
    const installCostInput = itemEl.querySelector<HTMLInputElement>('input[name="install_cost_per_roll"]');
    const codeInput = itemEl.querySelector<HTMLInputElement>('input[name="code"]');
    const notesInput = itemEl.querySelector<HTMLInputElement>('input[name="notes"]');

    // (QoL Item 7) Progressive Disclosure
    const detailsEl = itemEl.querySelector<HTMLElement>('.details-advanced-toggle');
    const moreBtn = itemEl.querySelector<HTMLButtonElement>('.btn-toggle-details');
    if (moreBtn && detailsEl) {
        moreBtn.setAttribute('aria-expanded', 'false');
        detailsEl.classList.remove('show');
    }

    // --- Event Listeners (Internal) ---
    if (heightInput) heightInput.addEventListener('blur', handleCmToMBlur);

    // --- Initialization ---
    if (!wallsContainer || !heightInput || !priceRollInput || !installCostInput || !codeInput || !notesInput) {
        console.error("Wallpaper item template is missing required elements.");
        return null;
    }

    // Populate wall inputs
    if (data.widths && data.widths.length > 0) {
        data.widths.forEach(width => {
            const wallEl = createWall({ width });
            if (wallEl) wallsContainer.appendChild(wallEl);
        });
    } else {
         const wallEl = createWall(); // Add at least one
         if (wallEl) wallsContainer.appendChild(wallEl);
    }

    heightInput.value = fmtDimension(data.height_m);
    priceRollInput.value = data.price_per_roll ? fmtTH(data.price_per_roll) : '';
    
    // (QoL) เคารพค่าแรง-0-บาท
    if (data.install_cost_per_roll === 0) {
        installCostInput.value = '0';
    } else if (data.install_cost_per_roll && data.install_cost_per_roll > 0) {
        installCostInput.value = fmtTH(data.install_cost_per_roll);
    } else {
        // ใช้-default-จาก-config-(ถ้า-template-value-ว่าง)
        if (!installCostInput.value) {
            installCostInput.value = fmtTH(PRICING.wallpaper_install_cost);
        }
    }

    codeInput.value = data.code || '';
    notesInput.value = data.notes || '';

    // (QoL) ตั้งค่า-data-type-สำหรับ-favorites
    const favButton = itemEl.querySelector<HTMLButtonElement>('.btn-add-fav');
    const showFavsButton = itemEl.querySelector<HTMLButtonElement>('.btn-show-favs');
    if (codeInput) codeInput.dataset.favoriteType = 'wallpaper';
    if (favButton) favButton.dataset.type = 'wallpaper';
    if (showFavsButton) showFavsButton.dataset.type = 'wallpaper';

    return itemEl;
}