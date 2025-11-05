// src/components/AreaBasedItem.ts
// (ตามข้อ 8) แปลงเป็น .ts
import { fmtTH, toNum, fmtDimension, handleCmToMBlur } from '../lib/utils';
import { SELECTORS, ITEM_CONFIG } from '../lib/config';
import type { AreaBasedItemData } from '../types';

export function createAreaBasedItem(type: AreaBasedItemData['type'], data: Partial<AreaBasedItemData> = {}): HTMLElement | null {
    const template = document.querySelector<HTMLTemplateElement>(SELECTORS.areaBasedTpl);
    if (!template) {
        console.error('AreaBased template not found');
        return null;
    }

    const clone = template.content.cloneNode(true) as DocumentFragment;
    const itemEl = clone.firstElementChild as HTMLElement;
    itemEl.dataset.type = type;
    itemEl.id = data.id || `item-${Date.now()}`;

    // [FIX 2] (Accessibility) เพิ่ม Helper Function สำหรับเชื่อม Label/Input
    const linkLabels = (baseId: string): void => {
        itemEl.querySelectorAll<HTMLElement>('.form-group').forEach((group, index) => {
            const input = group.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
            const label = group.querySelector<HTMLLabelElement>('label');
            if (input && label) {
                // ใช้ name หรือ index เป็น fallback
                const inputName = input.getAttribute('name') || `input-${index}`;
                const uniqueId = `${baseId}-${inputName}`;
                input.id = uniqueId;
                label.setAttribute('for', uniqueId);
            }
        });
    };
    linkLabels(itemEl.id); // เรียกใช้ Helper

    // (TS) โหลด-config-สำหรับ-type-นี้
    const config = ITEM_CONFIG[type] || ITEM_CONFIG['default'];
    itemEl.classList.add(config.className); // (Refactor) ใช้-className-จาก-config

    // --- Element Querying ---
    const typeDisplay = itemEl.querySelector<HTMLElement>('.item-type-display');
    const typeIcon = itemEl.querySelector<HTMLElement>('.item-type-changer i');
    const widthInput = itemEl.querySelector<HTMLInputElement>('input[name="area_width_m"]');
    const heightInput = itemEl.querySelector<HTMLInputElement>('input[name="area_height_m"]');
    const priceSqydInput = itemEl.querySelector<HTMLInputElement>('input[name="area_price_sqyd"]');
    const codeInput = itemEl.querySelector<HTMLInputElement>('input[name="area_code"]');
    const notesInput = itemEl.querySelector<HTMLInputElement>('input[name="area_notes"]');
    const favButton = itemEl.querySelector<HTMLButtonElement>('.btn-add-fav');
    const showFavsButton = itemEl.querySelector<HTMLButtonElement>('.btn-show-favs');
    
    // Dynamic Fields
    const openingStyleSelect = itemEl.querySelector<HTMLSelectElement>('select[name="opening_style"]');
    const adjustmentSideSelect = itemEl.querySelector<HTMLSelectElement>('select[name="adjustment_side"]');
    
    // (QoL Item 7) Progressive Disclosure
    const detailsEl = itemEl.querySelector<HTMLElement>('.details-advanced-toggle');
    const moreBtn = itemEl.querySelector<HTMLButtonElement>('.btn-toggle-details');
    if (moreBtn && detailsEl) {
        moreBtn.setAttribute('aria-expanded', 'false');
        detailsEl.classList.remove('show');
    }

    // --- Dynamic UI Logic (ซ่อน/แสดงช่องตาม-type) ---
    const updateVisibility = () => {
        const showOpening = type === 'partition' || type === 'pleated_screen';
        const showAdjustment = ['wooden_blind', 'roller_blind', 'vertical_blind', 'aluminum_blind'].includes(type);
        
        // (QoL) ใช้ .hidden-utility-class
        if (openingStyleSelect?.parentElement) openingStyleSelect.parentElement.classList.toggle('hidden', !showOpening);
        if (adjustmentSideSelect?.parentElement) adjustmentSideSelect.parentElement.classList.toggle('hidden', !showAdjustment);
    };

    // --- Event Listeners (Internal) ---
    if (widthInput) widthInput.addEventListener('blur', handleCmToMBlur);
    if (heightInput) heightInput.addEventListener('blur', handleCmToMBlur);

    // --- Initialization ---
    if (typeDisplay) typeDisplay.textContent = config.name;
    if (typeIcon) typeIcon.className = `ph ${config.icon}`;

    // Set data attributes for favorite functionality
    if (codeInput) codeInput.dataset.favoriteType = type;
    if (favButton) favButton.dataset.type = type;
    if (showFavsButton) showFavsButton.dataset.type = type;

    // Set values
    if (widthInput) widthInput.value = fmtDimension(data.width_m);
    if (heightInput) heightInput.value = fmtDimension(data.height_m);
    if (priceSqydInput) priceSqydInput.value = data.price_sqyd ? fmtTH(data.price_sqyd) : '';
    if (codeInput) codeInput.value = data.code || '';
    if (notesInput) notesInput.value = data.notes || '';

    // Set dynamic field values
    if (openingStyleSelect) openingStyleSelect.value = data.opening_style || 'แยกกลาง';
    if (adjustmentSideSelect) adjustmentSideSelect.value = data.adjustment_side || 'ปรับขวา';

    updateVisibility(); // Set initial visibility

    return itemEl;
}