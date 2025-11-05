// src/lib/ui-modals.ts
// [แก้ไข] - ลบ import 'ui-actions', และใช้ CustomEvent 'applyroomdefaults'

import { SELECTORS, ITEM_CONFIG, SHOP_CONFIG, WEBHOOK_URL, STORAGE_KEY } from './config';
import { fmtTH, toNum, fmt, fmtDimension, sanitizeHTML, sanitizeForFilename } from './utils';
import { buildPayload, saveData } from './storage';
import { pushState } from './undoManager';
import { generateSummaryText, generateQuotationHtml, generateOverviewHtml, generateLookBookModalHtml } from './documentGenerator';
import { exportFavorites, importFavoritesFromFile } from './ui-favorites'; // Import
import { clearHistory } from './undoManager'; // Import

// (TS) Import-Core-UI (Circular-Dependency-is-OK)
import {
    showModal,
    showToast,
    showConfirmation,
    recalcAll,
    updateUndoButtonState,
    renumberItemTitles,
    scrollToViewIfNeeded,
    _extractItemData,
    updateLockState, // (ต้องใช้ updateLockState สำหรับ handleSendData)
    loadPayload
} from './ui';

// [FIX] import State จาก ui-state.ts
import {
    getActiveHardwareItem,
    setActiveHardwareItem,
    getCurrentRoomDefaultsEl,
    setCurrentRoomDefaultsEl,
    getRoomDefaultsModalListeners,
    addRoomDefaultsModalListener,
    clearRoomDefaultsModalListeners
} from './ui-state';

// (TS) Import-Actions
// [FIX] ลบการ import 'ui-actions' เพื่อทลายวงจร
// import * as UIActions from './ui-actions';

// (TS) Import-Types
import type { Payload, Item, Room, SetItemData, AreaBasedItemData, WallpaperItemData } from '../types';

// --- MODAL: DIMENSION ENTRY ---

export async function showItemTypeModal(showAll = false): Promise<string | null> {
    const modalEl = document.querySelector<HTMLElement>(SELECTORS.itemTypeModal);
    if (!modalEl) return null;

    modalEl.classList.toggle('show-all-types', showAll);
    
    const defaultRadio = modalEl.querySelector<HTMLInputElement>('input[name="item_type_option"][value="set"]');
    if (defaultRadio) defaultRadio.checked = true;

    const result = await showModal(SELECTORS.itemTypeModal);
    if (result.cancelled) return null;

    const selectedOption = modalEl.querySelector<HTMLInputElement>('input[name="item_type_option"]:checked');
    return selectedOption ? selectedOption.value : null;
}

export function handleImportData(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.marn, .json, .txt';
    
    input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event: ProgressEvent<FileReader>) => {
            try {
                const text = event.target?.result as string;
                const data: Payload = JSON.parse(text);

                if (!data.app_version || !Array.isArray(data.rooms)) {
                    throw new Error('Invalid file format');
                }
                
                const confirmed = await showConfirmation(
                    'ยืนยันการนำเข้าข้อมูล',
                    'คุณต้องการนำเข้าข้อมูลและเขียนทับข้อมูลปัจจุบันหรือไม่? (ข้อมูลปัจจุบันจะถูกลบ)'
                );
                
                if (confirmed) {
                    pushState(buildPayload()); // บันทึก state ปัจจุบันไว้ใน Undo
                    localStorage.setItem(STORAGE_KEY, text); // บันทึกข้อมูลใหม่
                    loadPayload(); // โหลดข้อมูลใหม่ (UI จะ re-render)
                    clearHistory(); // ล้างประวัติ Undo (เพราะเป็น session ใหม่)
                    updateUndoButtonState();
                    showToast('นำเข้าข้อมูลสำเร็จ', 'success');
                }

            } catch (err: unknown) {
                console.error('Import failed:', err);
                showToast('นำเข้าไฟล์ไม่สำเร็จ (ไฟล์อาจเสียหาย)', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

export function handleExportData(): void {
    try {
        const payload = buildPayload();
        const customerName = payload.customer_name || 'backup';
        const date = new Date().toISOString().split('T')[0];
        const filename = `Marnthara_${sanitizeForFilename(customerName)}_${date}.marn`;
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", filename);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        showToast('ส่งออกข้อมูลสำเร็จ', 'success');
    } catch (err: unknown) {
        console.error("Export failed:", err);
        showToast('ส่งออกข้อมูลไม่สำเร็จ', 'error');
    }
}


// --- MODAL: DISCOUNT ---
export async function showDiscountModal(): Promise<void> {
    const modalEl = document.querySelector<HTMLElement>(SELECTORS.discountModal);
    const typeInput = document.querySelector<HTMLSelectElement>(SELECTORS.discountTypeInput);
    const valueInput = document.querySelector<HTMLInputElement>(SELECTORS.discountValueInput);
    
    if (!modalEl || !typeInput || !valueInput) return;

    // 1. Load current values into modal inputs
    const modalTypeInput = modalEl.querySelector<HTMLSelectElement>('select[name="modal_discount_type"]');
    const modalValueInput = modalEl.querySelector<HTMLInputElement>('input[name="modal_discount_value"]');
    
    if (!modalTypeInput || !modalValueInput) return;

    modalTypeInput.value = typeInput.value;
    modalValueInput.value = valueInput.value === '0' ? '' : valueInput.value;

    const result = await showModal(SELECTORS.discountModal);
    if (result.cancelled) return;

    // 3. Save values back to main inputs and recalc
    pushState(buildPayload()); // (QoL) Save Undo state
    typeInput.value = modalTypeInput.value;
    valueInput.value = toNum(modalValueInput.value).toString(); // Save '0' if empty
    
    recalcAll(); // This will auto-save
    updateUndoButtonState();
    showToast('บันทึกส่วนลดแล้ว', 'success');
}


// --- MODAL: EXPORT & ACTIONS ---

export async function handleCopySummary(): Promise<void> {
    try {
        const payload = buildPayload(); 
        const summary = generateSummaryText(payload);
        
        const textarea = document.createElement('textarea');
        textarea.value = summary;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed'; 
        textarea.style.top = '-9999px';    
        textarea.style.left = '-9999px';   
        document.body.appendChild(textarea);
        textarea.select();
        
        let success = false;
        try {
            success = document.execCommand('copy');
        } catch (err) {
            console.warn("execCommand copy failed", err);
        }
        
        document.body.removeChild(textarea);
        
        if (success) {
            showToast('คัดลอกสรุปข้อความแล้ว', 'success');
        } else {
            throw new Error('Copy failed');
        }
    } catch (err: unknown) {
        console.error("Copy failed:", err);
        showToast('คัดลอกไม่สำเร็จ', 'error');
    }
}


export async function handleSendData(): Promise<void> {
    if (!WEBHOOK_URL || WEBHOOK_URL.includes('your-make-webhook')) {
        showToast('ยังไม่ได้ตั้งค่า Webhook', 'warning');
        return;
    }
    
    const confirmed = await showConfirmation(
        'ยืนยันการส่งข้อมูล',
        'คุณต้องการส่งข้อมูลการประเมินราคานี้ไปยังเซิร์ฟเวอร์หรือไม่?'
    );
    if (!confirmed) return;

    updateLockState(true); // [FIX] เรียกฟังก์ชันจาก ui.ts
    showToast('กำลังส่งข้อมูล...', 'info');

    try {
        const payload = buildPayload();
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        
        showToast('ส่งข้อมูลสำเร็จ', 'success');
    } catch (err: unknown) {
        console.error("Webhook send failed:", err);
        showToast('ส่งข้อมูลไม่สำเร็จ', 'error');
    } finally {
        updateLockState(false); // [FIX] เรียกฟังก์ชันจาก ui.ts
    }
}

export function handleImportFavorites(): void {
    importFavoritesFromFile(); // เรียกใช้ฟังก์ชันจาก 'ui-favorites'
}

export function handleExportFavorites(): void {
    exportFavorites(); // เรียกใช้ฟังก์ชันจาก 'ui-favorites'
}

export async function showOverviewModal(): Promise<void> {
    const modalEl = document.querySelector<HTMLElement>(SELECTORS.overviewModal);
    const bodyEl = modalEl.querySelector<HTMLElement>(SELECTORS.overviewModalBody);
    if (!modalEl || !bodyEl) return;
    bodyEl.innerHTML = generateOverviewHtml(buildPayload());
    await showModal(SELECTORS.overviewModal);
}

export async function showLookBookModal(): Promise<void> {
    const modalEl = document.querySelector<HTMLElement>(SELECTORS.lookbookModal);
    const bodyEl = modalEl.querySelector<HTMLElement>(SELECTORS.lookbookModalBody);
    if (!modalEl || !bodyEl) return;
    bodyEl.innerHTML = generateLookBookModalHtml(buildPayload());
    await showModal(SELECTORS.lookbookModal);
}

export async function showPdfOptionsModal(): Promise<void> {
    const result = await showModal(SELECTORS.pdfOptionsModal);
    if (result.cancelled) return;
    
    showToast('การสร้าง PDF ยังไม่รองรับในเวอร์ชันนี้', 'info');
}


// --- MODAL: HARDWARE (SET ITEM) ---
export async function showHardwareModal(itemEl: HTMLElement): Promise<void> {
    const modalEl = document.querySelector<HTMLElement>(SELECTORS.hardwareModal);
    if (!modalEl) return;

    setActiveHardwareItem(itemEl); // Store the item we're editing (from ui-state)

    // 1. Load current values from itemEl's hidden inputs into modal inputs
    const fields = ['track_color', 'bracket_color', 'finial_color', 'grommet_color', 'louis_valance', 'louis_tassels'];
    fields.forEach(field => {
        const itemInput = itemEl.querySelector<HTMLInputElement>(`input[name="${field}"]`);
        const modalInput = modalEl.querySelector<HTMLSelectElement | HTMLInputElement>(`[name="hw_${field}"]`);
        if (itemInput && modalInput) {
            modalInput.value = itemInput.value;
        }
    });

    // 2. Show the modal
    const result = await showModal(SELECTORS.hardwareModal);
    const activeItem = getActiveHardwareItem(); // Get the stored item (from ui-state)
    
    if (!activeItem) {
        console.error("No active item found after hardware modal close");
        return;
    }

    // 3. Handle save/cancel
    if (!result.cancelled) {
        pushState(buildPayload()); // Save Undo state

        const applyToRoom = (result.el.id === 'hwApplyToRoom');
        const targetItems: HTMLElement[] = [];

        if (applyToRoom) {
            const roomEl = activeItem.closest<HTMLElement>(SELECTORS.room);
            if (roomEl) {
                roomEl.querySelectorAll<HTMLElement>(`${SELECTORS.itemCard}[data-type="set"]`).forEach(setItem => {
                    targetItems.push(setItem);
                });
            }
            showToast('ใช้อุปกรณ์กับทุกรายการในห้องนี้', 'success');
        } else {
            targetItems.push(activeItem);
            showToast('บันทึกอุปกรณ์แล้ว', 'success');
        }

        // 4. Save values from modal back to target item(s)
        targetItems.forEach(targetItem => {
            fields.forEach(field => {
                const itemInput = targetItem.querySelector<HTMLInputElement>(`input[name="${field}"]`);
                const modalInput = modalEl.querySelector<HTMLSelectElement | HTMLInputElement>(`[name="hw_${field}"]`);
                if (itemInput && modalInput) {
                    itemInput.value = modalInput.value;
                }
            });
        });
        
        recalcAll(); // Recalc and save
        updateUndoButtonState();
    }

    setActiveHardwareItem(null); // Clear stored item (from ui-state)
}


// --- MODAL: ROOM DEFAULTS ---
export async function showRoomDefaultsModal(roomEl: HTMLElement): Promise<void> {
    const modalEl = document.querySelector<HTMLElement>(SELECTORS.roomDefaultsModal);
    const formEl = modalEl?.querySelector<HTMLFormElement>(SELECTORS.roomDefaultsForm);
    if (!modalEl || !formEl) return;

    setCurrentRoomDefaultsEl(roomEl); // Store which room we're editing (from ui-state)
    clearRoomDefaultsModalListeners(); // Clear old listeners (from ui-state)

    // 1. Load current defaults from roomEl.dataset.roomDefaults
    const defaults = JSON.parse(roomEl.dataset.roomDefaults || '{}');
    formEl.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[name], select[name]').forEach(input => {
        if (input.name in defaults) {
            input.value = defaults[input.name];
        } else {
            input.value = ''; // Clear fields not in defaults
        }
    });

    // 2. Show modal
    const result = await showModal(SELECTORS.roomDefaultsModal);
    const activeRoom = getCurrentRoomDefaultsEl(); // from ui-state
    if (!activeRoom) return;

    // 3. Handle Save/Cancel
    if (!result.cancelled) {
        pushState(buildPayload()); // Save Undo state

        const newDefaults: { [key: string]: string } = {};
        formEl.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[name], select[name]').forEach(input => {
            if (input.value) { // Only save fields that have a value
                newDefaults[input.name] = input.value;
            }
        });
        
        activeRoom.dataset.roomDefaults = JSON.stringify(newDefaults);
        showToast('บันทึกค่าเริ่มต้นสำหรับห้องนี้แล้ว', 'success');
        
        // (QoL) Check if user wants to apply to existing items
        if (Object.keys(newDefaults).length > 0) {
            const apply = await showConfirmation(
                'ใช้ค่าเริ่มต้น?',
                'คุณต้องการใช้ค่าเริ่มต้นนี้กับรายการ (ผ้าม่าน) ทั้งหมดที่มีอยู่ตอนนี้ในห้องหรือไม่?'
            );
            
            // [FIX] ทลายวงจร! เปลี่ยนจากการเรียก UIActions.applyRoomDefaults
            // ไปเป็นการส่ง Custom Event ให้ ui.ts (ไฟล์หลัก) รับไปทำแทน
            if (apply) {
                // UIActions.applyRoomDefaults(activeRoom, newDefaults); // <--- [ลบ] บรรทัดนี้
                
                // vvv [เพิ่ม] บรรทัดเหล่านี้ vvv
                const event = new CustomEvent('applyroomdefaults', {
                    detail: { roomEl: activeRoom, defaults: newDefaults },
                    bubbles: true,
                    cancelable: true
                });
                activeRoom.dispatchEvent(event); // ส่ง Event จากตัว roomEl เอง
            }
        }
    }
    
    setCurrentRoomDefaultsEl(null); // from ui-state
}