// src/components/SetItem.ts
// (ตามข้อ 8) แปลงเป็น .ts
import { fmtTH, fmtDimension, toNum, handleCmToMBlur } from '../lib/utils';
import { SELECTORS } from '../lib/config';
import type { SetItemData } from '../types';

export function createSetItem(data: Partial<SetItemData> = {}): HTMLElement | null {
    const template = document.querySelector<HTMLTemplateElement>(SELECTORS.setTpl);
    if (!template) {
        console.error('Set template not found');
        return null;
    }

    const clone = template.content.cloneNode(true) as DocumentFragment;
    const itemEl = clone.firstElementChild as HTMLElement;
    itemEl.dataset.type = 'set';
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

    // --- Element Querying ---
    // (ตามข้อ 10) ใช้-Type-Guards
    const widthInput = itemEl.querySelector<HTMLInputElement>('input[name="width_m"]');
    const heightInput = itemEl.querySelector<HTMLInputElement>('input[name="height_m"]');
    const styleSelect = itemEl.querySelector<HTMLSelectElement>('select[name="set_style"]');
    const fabricVariantSelect = itemEl.querySelector<HTMLSelectElement>('select[name="fabric_variant"]');
    const pricePerMSelect = itemEl.querySelector<HTMLSelectElement>('select[name="set_price_per_m"]');
    const sheerPricePerMSelect = itemEl.querySelector<HTMLSelectElement>('select[name="set_sheer_price_per_m"]');
    const louisPricePerMSelect = itemEl.querySelector<HTMLSelectElement>('select[name="set_louis_price_per_m"]');
    const fabricCodeInput = itemEl.querySelector<HTMLInputElement>('input[name="fabric_code"]');
    const sheerCodeInput = itemEl.querySelector<HTMLInputElement>('input[name="sheer_fabric_code"]');
    const openingStyleSelect = itemEl.querySelector<HTMLSelectElement>('select[name="opening_style"]');
    const adjustmentSideSelect = itemEl.querySelector<HTMLSelectElement>('select[name="adjustment_side"]');
    const notesInput = itemEl.querySelector<HTMLInputElement>('input[name="notes"]');
    
    // (QoL Item 7) Progressive Disclosure
    const detailsEl = itemEl.querySelector<HTMLElement>('.details-advanced-toggle');
    const moreBtnWrapper = itemEl.querySelector<HTMLElement>('.more-btn-wrapper');
    const moreBtn = itemEl.querySelector<HTMLButtonElement>('.btn-toggle-details');
    if (moreBtn && detailsEl) {
        // (ย้าย-logic-การ-click-ไปที่-ui.ts-โดยใช้-delegation)
        // ตั้งค่า-Aria-เริ่มต้น
        moreBtn.setAttribute('aria-expanded', 'false');
        detailsEl.classList.remove('show');
    }

    // --- Event Listeners (Internal) ---
    // (QoL) ใช้-handleCmToMBlur-สำหรับ-dimensions
    if (widthInput) widthInput.addEventListener('blur', handleCmToMBlur);
    if (heightInput) heightInput.addEventListener('blur', handleCmToMBlur);

    // --- Dynamic UI Logic ---
    const fabricGroup = itemEl.querySelector<HTMLElement>('.fabric-group');
    const sheerGroup = itemEl.querySelector<HTMLElement>('.sheer-group');
    const louisGroup = itemEl.querySelector<HTMLElement>('.louis-group');
    const adjustmentGroup = adjustmentSideSelect?.closest('.form-group');

    const updateVisibility = () => {
        const style = styleSelect?.value;
        const variant = fabricVariantSelect?.value;
        
        if (fabricGroup) fabricGroup.classList.toggle('hidden', variant === 'โปร่ง');
        if (sheerGroup) sheerGroup.classList.toggle('hidden', variant === 'ทึบ');
        if (louisGroup) louisGroup.classList.toggle('hidden', style !== 'หลุยส์');
        // (QoL) ซ่อน/แสดง-ช่อง-เชือกปรับ-สำหรับม่านพับ
        if (adjustmentGroup) adjustmentGroup.classList.toggle('hidden', style !== 'ม่านพับ');
    };
    
    if (styleSelect) styleSelect.addEventListener('change', updateVisibility);
    if (fabricVariantSelect) fabricVariantSelect.addEventListener('change', updateVisibility);
    
    // --- Initialization ---
    if (widthInput) widthInput.value = fmtDimension(data.width_m);
    if (heightInput) heightInput.value = fmtDimension(data.height_m);
    if (styleSelect) styleSelect.value = data.set_style || 'ลอน';
    if (fabricVariantSelect) fabricVariantSelect.value = data.fabric_variant || 'ทึบ';
    
    // (QoL) โหลดราคาแบบ-Raw-value
    if (pricePerMSelect) pricePerMSelect.value = data.price_per_m_raw ? String(data.price_per_m_raw) : '';
    if (sheerPricePerMSelect) sheerPricePerMSelect.value = data.sheer_price_per_m ? String(data.sheer_price_per_m) : '';
    if (louisPricePerMSelect) louisPricePerMSelect.value = data.louis_price_per_m ? String(data.louis_price_per_m) : '';
    if (fabricCodeInput) fabricCodeInput.value = data.fabric_code || '';
    if (sheerCodeInput) sheerCodeInput.value = data.sheer_fabric_code || '';
    if (openingStyleSelect) openingStyleSelect.value = data.opening_style || 'แยกกลาง';
    if (adjustmentSideSelect) adjustmentSideSelect.value = data.adjustment_side || 'ปรับขวา';
    if (notesInput) notesInput.value = data.notes || '';

    // Set hidden hardware values
    const setHwVal = (name: string, value: string | undefined, defaultVal: string) => {
        const input = itemEl.querySelector<HTMLInputElement>(`input[name="${name}"]`);
        if (input) input.value = value || defaultVal;
    };
    setHwVal('track_color', data.track_color, 'ขาว');
    setHwVal('bracket_color', data.bracket_color, 'ขาว');
    setHwVal('finial_color', data.finial_color, 'ขาว');
    setHwVal('grommet_color', data.grommet_color, 'เงิน');
    setHwVal('louis_valance', data.louis_valance, 'กล่องหลุยส์');
    setHwVal('louis_tassels', data.louis_tassels, 'สีเข้ากับผ้า');

    updateVisibility(); // Set initial visibility

    return itemEl;
}