// src/lib/ui-actions.ts
// [แก้ไข]
// 1. [FIX] Import 'getIsLocked' จาก './ui-state' (แทน 'isLocked' จาก 'ui')
// 2. [FIX] แก้ไขการเรียก 'isLocked()' เป็น 'getIsLocked()'

import { SELECTORS, ITEM_CONFIG } from './config';
import { toNum, fmtDimension, fmtTH, sanitizeForFilename } from './utils';
import { buildPayload, saveData } from './storage';
import { pushState } from './undoManager';

// (TS) Import-Component-Factories
import { createRoomCard } from '../components/RoomCard';
import { createSetItem } from '../components/SetItem';
import { createWallpaperItem, createWall } from '../components/WallpaperItem';
import { createAreaBasedItem } from '../components/AreaBasedItem';

// (TS) Import-Core-UI-(Circular-Dependency-is-OK)
import {
    showToast,
    scrollToViewIfNeeded,
    updateQuickNavMenu,
    updateToggleAllButtonState,
    updateRoomObserver,
    showConfirmation,
    recalcAll,
    renumberItemTitles,
    toggleDetails,
    animateAndRemove,
    updateUndoButtonState,
    _extractItemData,
    loadPayload,
    showModal // (Needed for applyRoomDefaults)
} from './ui';

// [FIX] Import 'getIsLocked' จาก state
import { getIsLocked } from './ui-state';

// (TS) Import-Modal-Functions
import { showItemTypeModal } from './ui-modals';

// (TS) Import-Data-Layer
import { clearAllFavorites } from './favorites';
import { clearHistory } from './undoManager';

// (TS) Import-Types
import type { Item, Room, SetItemData, AreaBasedItemData, WallpaperItemData, Payload } from '../types';


// --- ACTION: Room ---

export function addRoom(): void {
    if (getIsLocked()) return; // [FIX] ใช้ Getter
    pushState(buildPayload());
    
    const roomsContainer = document.querySelector<HTMLElement>(SELECTORS.roomsContainer);
    if (!roomsContainer) return;

    const roomEl = createRoomCard();
    if (roomEl) {
        roomsContainer.appendChild(roomEl);
        renumberItemTitles();
        recalcAll();
        updateQuickNavMenu();
        updateToggleAllButtonState();
        updateRoomObserver();
        (roomEl.querySelector(SELECTORS.roomNameInput) as HTMLInputElement)?.focus();
    }
}

export async function deleteRoom(roomEl: HTMLElement): Promise<void> {
    if (getIsLocked()) return; // [FIX] ใช้ Getter
    
    const roomName = (roomEl.querySelector(SELECTORS.roomNameInput) as HTMLInputElement)?.value || 'ห้องนี้';
    const confirmed = await showConfirmation(
        'ยืนยันการลบ', 
        `คุณต้องการลบ "${sanitizeHTML(roomName)}" และรายการทั้งหมดในห้องนี้ใช่หรือไม่?`
    );

    if (confirmed) {
        pushState(buildPayload());
        animateAndRemove(roomEl); // (QoL)
        renumberItemTitles();
        recalcAll(); // This triggers save
        updateUndoButtonState();
        updateQuickNavMenu();
        updateToggleAllButtonState();
        updateRoomObserver();
    }
}

export function duplicateRoom(): void {
    if (getIsLocked()) return; // [FIX] ใช้ Getter

    const dupBtn = document.querySelector<HTMLButtonElement>(SELECTORS.duplicateRoomBtn);
    if (!dupBtn || dupBtn.disabled) return;
    
    const targetRoomId = dupBtn.dataset.targetRoomId;
    if (!targetRoomId) {
        showToast('กรุณาเลือกห้องที่ต้องการคัดลอกก่อน', 'warning');
        return;
    }

    const roomEl = document.getElementById(targetRoomId);
    if (!roomEl) return;
    
    pushState(buildPayload());
    
    const roomsContainer = document.querySelector<HTMLElement>(SELECTORS.roomsContainer);
    if (!roomsContainer) return;

    // (TS) 1. Extract data (จาก-DOM-ของห้องที่เลือก)
    const q = (sel: string) => (roomEl.querySelector<HTMLInputElement | HTMLSelectElement>(sel) as HTMLInputElement)?.value || '';
    const roomData: Partial<Room> = {
        room_name: q(SELECTORS.roomNameInput) + " (คัดลอก)",
        is_open: true,
        room_defaults: JSON.parse(roomEl.dataset.roomDefaults || '{}'),
        is_suspended: roomEl.classList.contains('is-suspended'),
        items: []
    };
    
    roomEl.querySelectorAll<HTMLElement>(SELECTORS.itemCard).forEach(itemEl => {
        const item = _extractItemData(itemEl);
        if (item) roomData.items!.push(item);
    });

    // (TS) 2. สร้าง-Room-ใหม่จาก-Data
    const newRoomEl = createRoomCard(roomData);
    if (newRoomEl) {
        // (TS) 3. โหลด-Items-เข้า-Room-ใหม่
        const itemsContainer = (newRoomEl as any).getItemsContainer() as HTMLElement;
        roomData.items!.forEach(itemData => {
            let itemEl: HTMLElement | null = null;
            if (itemData.type === 'set') itemEl = createSetItem(itemData as SetItemData);
            else if (itemData.type === 'wallpaper') itemEl = createWallpaperItem(itemData as WallpaperItemData);
            else if (itemData.type === 'placeholder') itemEl = createPlaceholderItem(itemData.width_m, itemData.height_m);
            else if (ITEM_CONFIG[itemData.type]) itemEl = createAreaBasedItem(itemData.type as AreaBasedItemData['type'], itemData as AreaBasedItemData);
            
            if (itemEl) {
                // (QoL) ตรวจสอบ-details-state-ด้วย
                const detailsToggled = checkIfDetailsToggled(itemData);
                if (detailsToggled) toggleDetails(itemEl, true);
                itemsContainer.appendChild(itemEl);
            }
        });

        roomsContainer.appendChild(newRoomEl);
        renumberItemTitles();
        recalcAll();
        updateQuickNavMenu();
        updateToggleAllButtonState();
        updateRoomObserver();
        scrollToViewIfNeeded(newRoomEl);
    }
}

export function toggleAllRooms(btn: HTMLElement): void {
    const state = btn.dataset.state || 'collapse';
    const newState = state === 'collapse' ? 'expand' : 'collapse';
    const shouldOpen = newState === 'collapse';

    document.querySelectorAll<HTMLDetailsElement>(SELECTORS.room).forEach(room => {
        room.open = shouldOpen;
    });

    updateToggleAllButtonState(); // (QoL) อัปเดตสถานะปุ่ม
}

export function jumpToRoom(linkEl: HTMLElement): void {
    const roomId = linkEl.dataset.roomId;
    if (!roomId) return;
    
    const roomEl = document.getElementById(roomId);
    if (roomEl) {
        scrollToViewIfNeeded(roomEl);
        // (QoL) เปิดห้องที่-jump-ไป
        if (roomEl instanceof HTMLDetailsElement) {
            roomEl.open = true;
        }
    }
}

export function toggleSuspendRoom(roomEl: HTMLElement): void {
    if (getIsLocked()) return; // [FIX] ใช้ Getter
    pushState(buildPayload());
    
    roomEl.classList.toggle('is-suspended');
    
    recalcAll();
    updateUndoButtonState();
    
    // (QoL) อัปเดตสถานะปุ่ม-Duplicate
    const dupBtn = document.querySelector<HTMLButtonElement>(SELECTORS.duplicateRoomBtn);
    if (dupBtn && dupBtn.dataset.targetRoomId === roomEl.id) {
        dupBtn.disabled = roomEl.classList.contains('is-suspended');
    }
}

export async function clearRoomItems(roomEl: HTMLElement): Promise<void> {
    if (getIsLocked()) return; // [FIX] ใช้ Getter

    const roomName = (roomEl.querySelector(SELECTORS.roomNameInput) as HTMLInputElement)?.value || 'ห้องนี้';
    const confirmed = await showConfirmation(
        'ล้างรายการในห้อง?', 
        `คุณต้องการลบรายการทั้งหมดใน "${sanitizeHTML(roomName)}" ใช่หรือไม่?`
    );

    if (confirmed) {
        pushState(buildPayload());
        
        const itemsContainer = roomEl.querySelector<HTMLElement>(SELECTORS.allItemsContainer);
        if (itemsContainer) {
            itemsContainer.innerHTML = ''; // Clear DOM
        }
        
        recalcAll(); // Recalc and save
        updateUndoButtonState();
    }
}

// --- ACTION: Item ---

export async function addPlaceholderItem(roomEl: HTMLElement): Promise<HTMLElement | null> {
    if (getIsLocked()) return; // [FIX] ใช้ Getter

    pushState(buildPayload());

    const itemsContainer = roomEl.querySelector<HTMLElement>(SELECTORS.allItemsContainer);
    if (!itemsContainer) return null;

    const tpl = document.querySelector<HTMLTemplateElement>(SELECTORS.placeholderTpl);
    if (!tpl) return null;
    
    const clone = tpl.content.cloneNode(true) as DocumentFragment;
    const placeholderEl = clone.firstElementChild as HTMLElement;
    
    // (QoL) โหลดค่าเริ่มต้นจาก-Room-Defaults
    const defaults = JSON.parse(roomEl.dataset.roomDefaults || '{}');
    const widthInput = placeholderEl.querySelector<HTMLInputElement>('input[name="placeholder_width"]');
    const heightInput = placeholderEl.querySelector<HTMLInputElement>('input[name="placeholder_height"]');

    if (widthInput) {
        widthInput.value = defaults.width_m ? fmtDimension(defaults.width_m) : '';
    }
    if (heightInput) {
        heightInput.value = defaults.height_m ? fmtDimension(defaults.height_m) : '';
    }
    
    itemsContainer.appendChild(placeholderEl);
    renumberItemTitles();
    
    // (QoL) Focus ที่-input-แรก
    setTimeout(() => widthInput?.focus(), 100);

    // [FIX] ย้ายการเรียก showItemTypeModal มาที่นี่
    const itemType = await showItemTypeModal(false); // เรียกจาก ui-modals
    
    if (itemType) {
        // (Core) แทนที่ placeholder ด้วย item จริง
        replacePlaceholderWithItem(placeholderEl, itemType); // เรียกจากไฟล์นี้เอง
    } else {
        // (QoL) ถ้าผู้ใช้กดยกเลิก ให้ลบ placeholder
        placeholderEl.remove();
        renumberItemTitles();
    }
    
    return placeholderEl;
}

export function replacePlaceholderWithItem(placeholderEl: HTMLElement, itemType: string): void {
    const width = (placeholderEl.querySelector('input[name="placeholder_width"]') as HTMLInputElement)?.value;
    const height = (placeholderEl.querySelector('input[name="placeholder_height"]') as HTMLInputElement)?.value;
    
    const roomEl = placeholderEl.closest<HTMLElement>(SELECTORS.room);
    if (!roomEl) return;
    
    const defaults = JSON.parse(roomEl.dataset.roomDefaults || '{}');

    let newItemEl: HTMLElement | null = null;
    
    const baseData = {
        width_m: toNum(width) || toNum(defaults.width_m),
        height_m: toNum(height) || toNum(defaults.height_m)
    };

    if (itemType === 'set') {
        const setData: Partial<SetItemData> = {
            ...baseData,
            set_style: defaults.set_style || 'จีบ',
            fabric_variant: defaults.fabric_variant || '3',
            opening_style: defaults.opening_style || 'แยกกลาง',
            adjustment_side: defaults.adjustment_side || 'ปรับขวา',
            track_color: defaults.track_color || 'ขาว',
            bracket_color: defaults.bracket_color || 'ขาว',
            finial_color: defaults.finial_color || 'ขาว',
            grommet_color: defaults.grommet_color || 'เงิน',
            louis_valance: defaults.louis_valance || 'กล่องหลุยส์',
            louis_tassels: defaults.louis_tassels || 'สีเข้ากับผ้า'
        };
        newItemEl = createSetItem(setData);
    } 
    else if (itemType === 'wallpaper') {
        newItemEl = createWallpaperItem(baseData);
    } 
    else if (ITEM_CONFIG[itemType]) {
        const areaData: Partial<AreaBasedItemData> = {
            ...baseData,
            type: itemType as AreaBasedItemData['type'],
            opening_style: defaults.opening_style,
            adjustment_side: defaults.adjustment_side
        };
        newItemEl = createAreaBasedItem(itemType as AreaBasedItemData['type'], areaData);
    }

    if (newItemEl) {
        placeholderEl.replaceWith(newItemEl);
        newItemEl.classList.add('item-created');
        recalcAll(); // Save
        updateUndoButtonState();
        scrollToViewIfNeeded(newItemEl);
    } else {
        placeholderEl.remove(); // Remove placeholder if creation failed
    }
    renumberItemTitles();
}

export async function handleChangeItemType(itemEl: HTMLElement): Promise<void> {
    if (getIsLocked()) return; // [FIX] ใช้ Getter

    const currentType = itemEl.dataset.type;
    const isPlaceholder = currentType === 'placeholder';
    
    let currentData: Item | null = null;
    if (!isPlaceholder) {
        currentData = _extractItemData(itemEl);
    }
    
    const newType = await showItemTypeModal(true); // (QoL) แสดง-modal-ทุก-type
    if (!newType || newType === currentType) return;
    
    pushState(buildPayload());

    let baseData: Partial<Item> = {};
    if (isPlaceholder) {
        const width = (itemEl.querySelector('input[name="placeholder_width"]') as HTMLInputElement)?.value;
        const height = (itemEl.querySelector('input[name="placeholder_height"]') as HTMLInputElement)?.value;
        baseData = { width_m: toNum(width), height_m: toNum(height) };
    } else if (currentData) {
        baseData = {
            id: currentData.id,
            width_m: currentData.width_m,
            height_m: currentData.height_m,
            notes: currentData.notes
        };
    }

    let newItemEl: HTMLElement | null = null;
    
    if (newType === 'set') newItemEl = createSetItem(baseData as SetItemData);
    else if (newType === 'wallpaper') newItemEl = createWallpaperItem(baseData as WallpaperItemData);
    else if (ITEM_CONFIG[newType]) newItemEl = createAreaBasedItem(newType as AreaBasedItemData['type'], baseData as AreaBasedItemData);
    else if (newType === 'placeholder') newItemEl = createPlaceholderItem(baseData.width_m, baseData.height_m);
    
    if (newItemEl) {
        itemEl.replaceWith(newItemEl);
        newItemEl.classList.add('item-created');
        renumberItemTitles();
        recalcAll();
        updateUndoButtonState();
    }
}

export function createPlaceholderItem(width: number | undefined, height: number | undefined): HTMLElement | null {
    const tpl = document.querySelector<HTMLTemplateElement>(SELECTORS.placeholderTpl);
    if (!tpl) return null;
    
    const clone = tpl.content.cloneNode(true) as DocumentFragment;
    const placeholderEl = clone.firstElementChild as HTMLElement;
    
    const widthInput = placeholderEl.querySelector<HTMLInputElement>('input[name="placeholder_width"]');
    const heightInput = placeholderEl.querySelector<HTMLInputElement>('input[name="placeholder_height"]');
    
    if (widthInput) widthInput.value = fmtDimension(width);
    if (heightInput) heightInput.value = fmtDimension(height);
    
    return placeholderEl;
}

export function deleteItem(itemEl: HTMLElement): void {
    if (getIsLocked()) return; // [FIX] ใช้ Getter
    pushState(buildPayload());
    
    animateAndRemove(itemEl); // (QoL)
    
    renumberItemTitles();
    recalcAll(); // This triggers save
    updateUndoButtonState();
}

export function duplicateItem(itemEl: HTMLElement): void {
    if (getIsLocked()) return; // [FIX] ใช้ Getter

    const itemData = _extractItemData(itemEl);
    if (!itemData) return;
    
    pushState(buildPayload());

    itemData.id = `item-${Date.now()}`; // (TS) สร้าง-ID-ใหม่
    
    let newItemEl: HTMLElement | null = null;
    if (itemData.type === 'set') newItemEl = createSetItem(itemData as SetItemData);
    else if (itemData.type === 'wallpaper') newItemEl = createWallpaperItem(itemData as WallpaperItemData);
    else if (itemData.type === 'placeholder') newItemEl = createPlaceholderItem(itemData.width_m, itemData.height_m);
    else if (ITEM_CONFIG[itemData.type]) newItemEl = createAreaBasedItem(itemData.type as AreaBasedItemData['type'], itemData as AreaBasedItemData);

    if (newItemEl) {
        const detailsToggled = checkIfDetailsToggled(itemData);
        if (detailsToggled) toggleDetails(newItemEl, true);
        
        itemEl.after(newItemEl); // (QoL) แทรกต่อท้าย-item-เดิม
        newItemEl.classList.add('item-created');
        renumberItemTitles();
        recalcAll();
        updateUndoButtonState();
    }
}

export function toggleSuspendItem(itemEl: HTMLElement): void {
    if (getIsLocked()) return; // [FIX] ใช้ Getter
    pushState(buildPayload());
    
    itemEl.classList.toggle('is-suspended');
    
    recalcAll();
    updateUndoButtonState();
}

export function applyRoomDefaults(roomEl: HTMLElement, defaults: { [key: string]: string }): void {
    if (getIsLocked()) return; // [FIX] ใช้ Getter
    pushState(buildPayload());

    roomEl.querySelectorAll<HTMLElement>(`${SELECTORS.itemCard}[data-type="set"]`).forEach(itemEl => {
        itemEl.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[name], select[name]').forEach(input => {
            const inputName = input.getAttribute('name');
            if (inputName && inputName in defaults) {
                input.value = defaults[inputName];
            }
        });
    });

    recalcAll(); // Recalc and save
    updateUndoButtonState();
    showToast('ใช้ค่าเริ่มต้นกับทุกรายการในห้องแล้ว', 'success');
}

// --- ACTION: Wallpaper Item ---

export function addWallToItem(itemEl: HTMLElement): void {
    if (getIsLocked()) return; // [FIX] ใช้ Getter
    pushState(buildPayload());
    
    const wallsContainer = itemEl.querySelector<HTMLElement>(SELECTORS.wpWallsContainer);
    if (!wallsContainer) return;
    
    const wallEl = createWall();
    if (wallEl) {
        wallsContainer.appendChild(wallEl);
        recalcAll(); // Recalc and save
        updateUndoButtonState();
        wallEl.querySelector<HTMLInputElement>('input')?.focus();
    }
}

export function deleteWallFromItem(btn: HTMLElement): void {
    if (getIsLocked()) return; // [FIX] ใช้ Getter
    
    const wallEl = btn.closest<HTMLElement>('.wall-input-group');
    if (!wallEl) return;
    
    const itemEl = btn.closest<HTMLElement>(SELECTORS.itemCard);
    const wallsContainer = itemEl?.querySelector<HTMLElement>(SELECTORS.wpWallsContainer);
    
    if (wallsContainer && wallsContainer.childElementCount <= 1) {
        showToast('ไม่สามารถลบได้ ต้องมีอย่างน้อย 1 ผนัง', 'warning');
        return;
    }
    
    pushState(buildPayload());
    wallEl.remove();
    recalcAll(); // Recalc and save
    updateUndoButtonState();
}

// --- ACTION: Undo ---

export function handleUndo(): void {
    if (getIsLocked()) return; // [FIX] ใช้ Getter
    
    const previousState = popState();
    
    if (previousState) {
        loadPayload(previousState);
        updateUndoButtonState();
        showToast('ย้อนกลับการกระทำล่าสุด', 'success');
    } else {
        showToast('ไม่สามารถย้อนกลับได้', 'info');
    }
}

// --- ACTION: Global ---

export async function handleClearAllRooms(): Promise<void> {
    if (getIsLocked()) return; // [FIX] ใช้ Getter
    
    const confirmed = await showConfirmation(
        'ล้างห้องทั้งหมด?', 
        'คุณต้องการลบห้องทั้งหมดและรายการทั้งหมดในทุกห้องใช่หรือไม่? (ข้อมูลลูกค้าและส่วนลดยังคงอยู่)'
    );

    if (confirmed) {
        pushState(buildPayload());
        
        const roomsContainer = document.querySelector<HTMLElement>(SELECTORS.roomsContainer);
        if (roomsContainer) {
            roomsContainer.innerHTML = ''; // Clear DOM
        }
        
        recalcAll(); // Recalc and save
        updateUndoButtonState();
        updateQuickNavMenu();
        updateToggleAllButtonState();
        updateRoomObserver();
    }
}

export async function deleteAllData(): Promise<void> {
    // [FIX] แก้ไขการเรียก 'isLocked' เป็น 'getIsLocked'
    if (getIsLocked()) { // Line 542
        showToast('ระบบกำลังทำงาน ไม่สามารถลบได้', 'warning');
        return;
    }
    
    const confirmed = await showConfirmation(
        '!!! ลบข้อมูลทั้งหมด !!!', 
        'คุณต้องการลบข้อมูลทั้งหมดในระบบ (รวมถึงรายการโปรด) และเริ่มต้นใหม่ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้'
    );
    if (!confirmed) return;

    const emptyPayload: Payload = {
        app_version: ITEM_CONFIG.app_version || 'unknown',
        customer_name: '',
        customer_phone: '',
        customer_address: '',
        customer_card_open: true,
        discount: { type: 'amount', value: 0 },
        rooms: [],
        favorites: {}
    };
    
    loadPayload(emptyPayload); // โหลด-UI-ที่ว่างเปล่า
    clearAllFavorites(); // (TS) ล้าง-Favorites-จาก-localStorage
    clearHistory(); // (TS) ล้าง-Undo
    
    showToast('ลบข้อมูลทั้งหมดและเริ่มต้นใหม่แล้ว', 'success');
}


// --- [HELPER] ---

export function checkIfDetailsToggled(itemData: Item): boolean {
    if (itemData.notes) return true;
    
    if (itemData.type === 'set') {
        const set = itemData as SetItemData;
        if (set.fabric_code || set.sheer_fabric_code) return true;
        if (set.price_per_m_raw && set.price_per_m_raw > 0) return true;
        if (set.sheer_price_per_m && set.sheer_price_per_m > 0) return true;
        if (set.louis_price_per_m && set.louis_price_per_m > 0) return true;
        if (set.opening_style !== 'แยกกลาง' || set.adjustment_side !== 'ปรับขวา') return true;
        if (set.track_color !== 'ขาว' || set.bracket_color !== 'ขาว' || set.finial_color !== 'ขาว' || set.grommet_color !== 'เงิน' || set.louis_valance !== 'กล่องหลุยส์' || set.louis_tassels !== 'สีเข้ากับผ้า') return true;
    } 
    else if (itemData.type === 'wallpaper') {
        const wp = itemData as WallpaperItemData;
        if (wp.code) return true;
    }
    else if (ITEM_CONFIG[itemData.type]) {
        const area = itemData as AreaBasedItemData;
        if (area.code) return true;
        if (area.opening_style && area.opening_style !== 'แยกกลาง') return true;
        if (area.adjustment_side && area.adjustment_side !== 'ปรับขวา') return true;
    }
    
    return false;
}