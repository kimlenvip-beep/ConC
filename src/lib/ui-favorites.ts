// src/lib/ui-favorites.ts
// [แก้ไข] - Import State จาก 'ui-state.ts'

import { SELECTORS, ITEM_CONFIG } from './config';
import { fmtTH, toNum, sanitizeHTML } from './utils';
import { 
    getFavorites, 
    addOrUpdateFavorite, 
    getFavorite, 
    deleteFavorite,
    importFavorites as importFavoritesData, // (Data-layer)
    mergeFavorites,
    exportFavorites as exportFavoritesData // (Data-layer)
} from './favorites';
import { sanitizeForFilename } from './utils'; // (Utility)
import { buildPayload } from './storage'; // (Storage)

// (TS) Import-Core-UI (Circular-Dependency-is-OK)
import {
    showModal,
    showToast,
    showConfirmation,
    recalcAll
} from './ui'; 

// [FIX] import State จาก ui-state.ts
import {
    getActiveFavoriteInput,
    setActiveFavoriteInput,
    getFavManagerChangesMade,
    setFavManagerChangesMade,
    getSelectedFavItem,
    setSelectedFavItem
} from './ui-state';

// (TS) Import-Types
import type { FavoriteItem, Favorites, Payload } from '../types';

// --- 1. FAVORITES LIST MODAL (Read-only list) ---

/**
 * (Helper) Handles click on 'Show Favorites' (star) button.
 */
export function showFavoritesModal(btn: HTMLElement): void {
    const input = btn.previousElementSibling as HTMLInputElement;
    const type = btn.dataset.type;
    
    if (input && type) {
        // (State) บันทึกว่า-input-ไหนกำลังรอ-fav
        setActiveFavoriteInput({ input, type });
        // (UI) แสดง-modal-รายการ
        showFavListModal(type);
    }
}

/**
 * (Helper) Handles click on 'Add Favorite' (plus) button.
 */
export async function addFavoriteFromInput(btn: HTMLElement): Promise<void> {
    const input = btn.previousElementSibling as HTMLInputElement;
    const type = btn.dataset.type;
    const itemCard = btn.closest<HTMLElement>(SELECTORS.itemCard);
    
    if (!input || !type || !itemCard) return;

    const code = input.value.trim();
    if (!code) {
        showToast('กรุณาใส่รหัสสินค้าก่อน', 'warning');
        return;
    }
    
    let price = 0;
    
    // (TS) ดึงราคาจาก-field-ที่ถูกต้อง
    if (type === 'fabric') {
        price = toNum((itemCard.querySelector(SELECTORS.setPricePerMSelect) as HTMLSelectElement)?.value);
    } else if (type === 'sheer') {
        price = toNum((itemCard.querySelector(SELECTORS.setSheerPricePerMSelect) as HTMLSelectElement)?.value);
    } else if (type === 'wallpaper') {
        price = toNum((itemCard.querySelector(SELECTORS.wpPriceRollInput) as HTMLInputElement)?.value);
    } else if (ITEM_CONFIG[type]) {
        price = toNum((itemCard.querySelector(SELECTORS.areaPriceSqydInput) as HTMLInputElement)?.value);
    }

    const confirmed = await showConfirmation(
        'เพิ่มในรายการโปรด?',
        `คุณต้องการเพิ่ม "${sanitizeHTML(code)}" (ราคา ${fmtTH(price)}) ในรายการโปรดหรือไม่?`
    );
    
    if (confirmed) {
        if (addOrUpdateFavorite(type, code, price)) {
            showToast(`เพิ่ม "${code}" ในรายการโปรดแล้ว`, 'success');
        } else {
            showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
    }
}

export async function showFavListModal(type: string): Promise<void> {
    const modalEl = document.querySelector<HTMLElement>(SELECTORS.favListModal);
    const bodyEl = modalEl?.querySelector<HTMLElement>(SELECTORS.favListModalBody);
    const typeEl = modalEl?.querySelector<HTMLElement>(SELECTORS.favListModalType);
    if (!modalEl || !bodyEl || !typeEl) return;

    const favorites = getFavorites();
    const items = favorites[type] || [];
    
    let favTypeDisplayName = ITEM_CONFIG[type]?.name || type;
    if (type === 'fabric') favTypeDisplayName = 'ผ้าทึบ';
    else if (type === 'sheer') favTypeDisplayName = 'ผ้าโปร่ง';
    typeEl.textContent = favTypeDisplayName;
    modalEl.dataset.currentType = type;

    if (items.length === 0) {
        bodyEl.innerHTML = '<p class="empty-summary">ไม่มีรายการโปรดที่บันทึกไว้สำหรับหมวดนี้</p>';
    } else {
        const tpl = document.querySelector<HTMLTemplateElement>(SELECTORS.favListTpl);
        if (!tpl) return;
        
        bodyEl.innerHTML = items.map(fav => {
            let priceDisplay = '-';
            if (fav.price !== null && typeof fav.price !== 'undefined' && fav.price >= 0) {
                 priceDisplay = fmtTH(fav.price);
            }
            return tpl.innerHTML
                .replace(/{CODE}/g, sanitizeHTML(fav.code))
                .replace(/{PRICE}/g, priceDisplay);
        }).join('');
    }

    await showModal(SELECTORS.favListModal);
}

export function applyFavoriteFromList(clickedEl: HTMLElement): void {
    const activeFavInput = getActiveFavoriteInput();
    const code = clickedEl.dataset.code;
    
    if (activeFavInput && activeFavInput.input && code) {
        const { input, type } = activeFavInput;
        const fav = getFavorite(type, code); // Get {code, price}
        
        if (fav) {
            // 1. Set Code Input
            input.value = fav.code;
            
            // 2. Find and Set Price Input
            const itemCard = input.closest<HTMLElement>(SELECTORS.itemCard);
            if (itemCard) {
                let priceInput: HTMLInputElement | HTMLSelectElement | null = null;
                
                if (type === 'fabric') {
                    priceInput = itemCard.querySelector<HTMLSelectElement>(SELECTORS.setPricePerMSelect);
                } else if (type === 'sheer') {
                    priceInput = itemCard.querySelector<HTMLSelectElement>(SELECTORS.setSheerPricePerMSelect);
                } else if (type === 'wallpaper') {
                    priceInput = itemCard.querySelector<HTMLInputElement>(SELECTORS.wpPriceRollInput);
                } else if (ITEM_CONFIG[type]) { // Area-based
                    priceInput = itemCard.querySelector<HTMLInputElement>(SELECTORS.areaPriceSqydInput);
                }
                
                if (priceInput && fav.price >= 0) {
                    priceInput.value = String(fav.price);
                }
            }
            
            // 3. Close modal and show toast
            const modal = clickedEl.closest<HTMLElement>(SELECTORS.favListModal);
            if (modal && (modal as any).closeModal) {
                (modal as any).closeModal();
            }
            showToast(`ใช้ "${fav.code}" แล้ว`, 'success');
            recalcAll(); // Trigger recalc and save
        }
    }
}


// --- 2. FAVORITES MANAGER MODAL (Add/Edit/Delete) ---

export async function showManageFavsTypeModal(): Promise<void> {
    const modalEl = document.querySelector<HTMLElement>('#manageFavsTypeModal');
    const bodyEl = modalEl?.querySelector<HTMLElement>('#manageFavsTypeBody');
    if (!modalEl || !bodyEl) return;
    
    const favTypes = Object.keys(getFavorites());
    let optionsHtml = '';
    let firstType = null;
    
    for (const type of favTypes) {
        const config = ITEM_CONFIG[type];
        if (!config && type !== 'fabric' && type !== 'sheer') continue;
        
        let name = '';
        let icon = '';
        
        if (type === 'fabric') {
            name = 'ผ้าทึบ (ผ้าม่าน)';
            icon = 'ph-rows';
        } else if (type === 'sheer') {
            name = 'ผ้าโปร่ง (ผ้าม่าน)';
            icon = 'ph-waves';
        } else {
            name = config.name;
            icon = config.icon || 'ph-star';
        }
        
        if (!firstType) firstType = type;
        
        optionsHtml += `
            <label class="option-item" data-type="${type}">
                <i class="ph ${icon}"></i>
                <strong>${name}</strong>
            </label>
        `;
    }
    bodyEl.innerHTML = optionsHtml;

    const result = await showModal('#manageFavsTypeModal');
    if (result && !result.cancelled) {
        const type = (result.el.closest('.option-item') as HTMLElement)?.dataset.type;
        if (type) {
            showFavManager(type); // Open the actual manager
        }
    }
}

export async function showFavManager(type: string): Promise<void> {
    const modalEl = document.querySelector<HTMLElement>(SELECTORS.favManagerModal);
    if (!modalEl || !type) return;

    let favTypeDisplayName = ITEM_CONFIG[type]?.name || type;
    if (type === 'fabric') favTypeDisplayName = 'ผ้าทึบ';
    else if (type === 'sheer') favTypeDisplayName = 'ผ้าโปร่ง';

    modalEl.dataset.currentType = type;
    setFavManagerChangesMade(false); // (State) Reset flag
    setSelectedFavItem(null); // (State) Clear selection

    const typeEl = modalEl.querySelector<HTMLElement>(SELECTORS.favManagerModalType);
    if (typeEl) typeEl.textContent = favTypeDisplayName;

    _renderFavManagerList(type); // Helper to fill the list
    await showModal(SELECTORS.favManagerModal);

    // After modal closes, check if we need to recalc
    if (getFavManagerChangesMade()) {
        recalcAll(); // Recalc if prices were changed
    }
}

function _renderFavManagerList(type: string): void {
    const bodyEl = document.querySelector<HTMLElement>(SELECTORS.favManagerModalBody);
    const tpl = document.querySelector<HTMLTemplateElement>(SELECTORS.favManagerTpl);
    if (!bodyEl || !tpl) return;

    const favorites = getFavorites();
    const items = favorites[type] || [];

    if (items.length === 0) {
        bodyEl.innerHTML = '<p class="empty-summary">ไม่พบรายการโปรด</p>';
    } else {
        bodyEl.innerHTML = items.map(fav => {
            let priceDisplay = '-';
             if (fav.price !== null && typeof fav.price !== 'undefined' && fav.price >= 0) {
                 priceDisplay = fmtTH(fav.price);
             }
            return tpl.innerHTML
                .replace(/{CODE}/g, sanitizeHTML(fav.code))
                .replace(/{PRICE}/g, priceDisplay)
                .replace(/{RAW_PRICE}/g, String(fav.price)); // Store raw price for editing
        }).join('');
    }
    
    setSelectedFavItem(null); // (State) Clear selection
    // Disable edit/delete buttons
    const editBtn = document.querySelector<HTMLButtonElement>(SELECTORS.favManagerEditBtn);
    const delBtn = document.querySelector<HTMLButtonElement>(SELECTORS.favManagerDelBtn);
    if (editBtn) editBtn.disabled = true;
    if (delBtn) delBtn.disabled = true;
}

export async function handleAddFavorite(): Promise<void> {
    const managerModal = document.querySelector<HTMLElement>(SELECTORS.favManagerModal);
    const type = managerModal?.dataset.currentType;
    if (!type) return;

    const addModal = document.querySelector<HTMLElement>(SELECTORS.favAddModal);
    const codeInput = addModal?.querySelector<HTMLInputElement>(SELECTORS.favAddCodeInput);
    const priceInput = addModal?.querySelector<HTMLInputElement>(SELECTORS.favAddPriceInput);
    if (!addModal || !codeInput || !priceInput) return;

    // Clear inputs
    codeInput.value = '';
    priceInput.value = '';

    const result = await showModal(SELECTORS.favAddModal);
    if (result.cancelled) return;

    const code = codeInput.value.trim();
    const price = toNum(priceInput.value);
    
    if (!code) {
        showToast('ไม่สามารถเพิ่มได้: ต้องระบุรหัส', 'warning');
        return;
    }

    if (addOrUpdateFavorite(type, code, price)) {
        showToast(`เพิ่ม "${code}" แล้ว`, 'success');
        setFavManagerChangesMade(true); // (State) Mark changes
        _renderFavManagerList(type); // Re-render list
    } else {
        showToast('เกิดข้อผิดพลาดในการเพิ่ม', 'error');
    }
}

export async function handleEditFavorite(): Promise<void> {
    const selected = getSelectedFavItem();
    const managerModal = document.querySelector<HTMLElement>(SELECTORS.favManagerModal);
    const type = managerModal?.dataset.currentType;
    if (!selected || !type) return;

    const editModal = document.querySelector<HTMLElement>(SELECTORS.favEditModal);
    const codeInput = editModal?.querySelector<HTMLInputElement>(SELECTORS.favEditCodeInput);
    const priceInput = editModal?.querySelector<HTMLInputElement>(SELECTORS.favEditPriceInput);
    if (!editModal || !codeInput || !priceInput) return;

    // Load current data into edit modal
    codeInput.value = selected.code;
    priceInput.value = selected.price >= 0 ? String(selected.price) : '';

    const result = await showModal(SELECTORS.favEditModal);
    if (result.cancelled) return;

    const newCode = codeInput.value.trim();
    const newPrice = toNum(priceInput.value);
    
    if (!newCode) {
        showToast('ไม่สามารถแก้ไขได้: ต้องระบุรหัส', 'warning');
        return;
    }

    if (selected.code !== newCode) {
        deleteFavorite(type, selected.code);
    }
    
    if (addOrUpdateFavorite(type, newCode, newPrice)) {
        showToast(`แก้ไข "${newCode}" แล้ว`, 'success');
        setFavManagerChangesMade(true); // (State) Mark changes
        _renderFavManagerList(type); // Re-render list
    } else {
        showToast('เกิดข้อผิดพลาดในการแก้ไข', 'error');
    }
}

export async function handleDeleteFavorite(): Promise<void> {
    const selected = getSelectedFavItem();
    const managerModal = document.querySelector<HTMLElement>(SELECTORS.favManagerModal);
    const type = managerModal?.dataset.currentType;
    if (!selected || !type) return;

    const confirmed = await showConfirmation(
        'ยืนยันการลบ',
        `คุณต้องการลบ "${sanitizeHTML(selected.code)}" ใช่หรือไม่?`
    );
    if (!confirmed) return;

    if (deleteFavorite(type, selected.code)) {
        showToast(`ลบ "${selected.code}" แล้ว`, 'success');
        setFavManagerChangesMade(true); // (State) Mark changes
        _renderFavManagerList(type); // Re-render list
    } else {
        showToast('เกิดข้อผิดพลาดในการลบ', 'error');
    }
}


// --- 3. IMPORT / EXPORT (Called by ui-modals.ts) ---

export function exportFavorites(): void {
    try {
        const favorites = getFavorites();
        const date = new Date().toISOString().split('T')[0];
        const filename = `Marnthara_Favorites_${date}.json`;
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(favorites));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", filename);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        showToast('ส่งออกรายการโปรดสำเร็จ', 'success');
    } catch (err: unknown) {
        console.error("Export favorites failed:", err);
        showToast('ส่งออกรายการโปรดไม่สำเร็จ', 'error');
    }
}

export function importFavoritesFromFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json, .marn, .txt'; 
    
    input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event: ProgressEvent<FileReader>) => {
            try {
                const text = event.target?.result as string;
                const data = JSON.parse(text);

                let favoritesToImport: Favorites | undefined;
                if (data.favorites && data.app_version) {
                    favoritesToImport = (data as Payload).favorites;
                } else if (data.fabric || data.wallpaper || data.wooden_blind) {
                    favoritesToImport = data;
                } else {
                     throw new Error('Invalid file format');
                }

                if (!favoritesToImport || Object.keys(favoritesToImport).length === 0) {
                     showToast('ไม่พบข้อมูลรายการโปรดในไฟล์', 'warning');
                     return;
                }
                
                const result = await showModal(SELECTORS.importFavoritesModal);
                if (result && !result.cancelled) {
                    const action = (result.el.closest('.option-item') as HTMLElement)?.dataset.type;
                    
                    if (action === 'overwrite') {
                        importFavoritesData(favoritesToImport); // (Data-layer)
                        showToast('นำเข้ารายการโปรด (เขียนทับ) สำเร็จ', 'success');
                    } else if (action === 'merge') {
                        mergeFavorites(favoritesToImport); // (Data-layer)
                        showToast('รวมข้อมูลรายการโปรดสำเร็จ', 'success');
                    }
                    
                    recalcAll(); // Recalc in case prices changed
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