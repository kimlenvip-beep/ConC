// src/lib/ui.ts
// [แก้ไข] - แก้ไขการเรียก 'clearAllRooms' เป็น 'handleClearAllRooms'

import { SELECTORS, PDF_EXPORT_DELAY_MS, ITEM_CONFIG, SHOP_CONFIG, WEBHOOK_URL, STORAGE_KEY } from './config';
import { fmtTH, toNum, debounce, fmtDimension, sanitizeHTML, sanitizeForFilename, fmt, throttle } from './utils';
import { saveData, buildPayload } from './storage';
import { getFavorites, importFavorites, mergeFavorites, clearAllFavorites } from './favorites';
import { pushState, popState, canUndo, clearHistory } from './undoManager';
import { generateSummaryText, generateQuotationHtml, generateOverviewHtml, generateLookBookModalHtml } from './documentGenerator';
import { CALC } from './calculations';

// (TS) Import-Types
import type { Payload, Room, Item, Customer, Discount, SetItemData, AreaBasedItemData, WallpaperItemData } from '../types';

// (TS) Import-Component-Factories
import { createRoomCard } from '../components/RoomCard';
import { createSetItem } from '../components/SetItem';
import { createWallpaperItem, createWall } from '../components/WallpaperItem';
import { createAreaBasedItem } from '../components/AreaBasedItem';

// (TS) Import-Refactored-UI-Modules
import * as UIActions from './ui-actions';
import * as UIModals from './ui-modals';
import * as UIFavorites from './ui-favorites';

// [FIX] Import State จาก ui-state.ts
import { getIsLocked, setIsLocked } from './ui-state';


// --- State Variables (เก็บ-state-ชั่วคราวของ-UI-ไฟล์นี้เท่านั้น) ---
let toastTimer: number;
let activeModal: HTMLElement | null = null;
let modalResolve: ((value: any) => void) | null = null;
let roomObserver: IntersectionObserver | null = null;

// --- Toast Notifications ---
export function showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration: number = 3000): void {
    const toastEl = document.querySelector<HTMLElement>(SELECTORS.toast);
    const messageEl = document.querySelector<HTMLElement>(SELECTORS.toastMessage);
    if (!toastEl || !messageEl) return;

    clearTimeout(toastTimer);
    messageEl.textContent = message;
    
    toastEl.className = 'toast'; // Reset
    toastEl.classList.add(`toast-${type}`);
    toastEl.classList.add('show');
    
    toastTimer = window.setTimeout(() => {
        toastEl.classList.remove('show');
    }, duration);
}

// --- Theme ---
export function applyInitialTheme(): void {
    const savedTheme = localStorage.getItem('marnthara.theme') || 'system';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

export function toggleTheme(): void {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'system';
    let newTheme: string;
    
    if (currentTheme === 'light') newTheme = 'dark';
    else if (currentTheme === 'dark') newTheme = 'system';
    else newTheme = 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('marnthara.theme', newTheme);
    
    const themeName = newTheme === 'system' ? 'System' : (newTheme === 'light' ? 'Light' : 'Dark');
    showToast(`เปลี่ยนเป็นธีม ${themeName}`, 'info');
}

// --- Modal Management (Core) ---
export function showModal(selector: string): Promise<{ cancelled: boolean; [key: string]: any } | null> {
    if (activeModal) {
        console.warn(`Attempted to open modal ${selector} while ${activeModal.id} is already active.`);
        return Promise.resolve(null);
    }
    
    const modalEl = document.querySelector<HTMLElement>(selector);
    if (!modalEl) {
        console.error(`Modal with selector "${selector}" not found.`);
        return Promise.resolve(null);
    }

    activeModal = modalEl;
    modalEl.classList.add('visible');
    
    const focusableElements = modalEl.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const trapFocus = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstFocusable) {
                lastFocusable.focus();
                e.preventDefault();
            }
        } else { // Tab
            if (document.activeElement === lastFocusable) {
                firstFocusable.focus();
                e.preventDefault();
            }
        }
    };
    
    const keydownHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            closeModal({ cancelled: true });
        }
    };

    modalEl.addEventListener('keydown', trapFocus);
    document.addEventListener('keydown', keydownHandler); // Global listener for Escape

    if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 50); // Delay for transition
    }

    const closeModal = (result: any) => {
        if (!activeModal) return;
        
        modalEl.removeEventListener('keydown', trapFocus);
        document.removeEventListener('keydown', keydownHandler);
        
        modalEl.classList.remove('visible');
        activeModal = null;
        if (modalResolve) {
            modalResolve(result);
            modalResolve = null;
        }
    };

    (modalEl as any).closeModal = closeModal;
    
    modalEl.querySelectorAll<HTMLButtonElement>('[data-act="modal-cancel"]').forEach(btn => {
        btn.onclick = () => closeModal({ cancelled: true });
    });

    return new Promise((resolve) => {
        modalResolve = resolve;
    });
}

export async function showConfirmation(title: string, body: string): Promise<boolean> {
    const modalEl = document.querySelector<HTMLElement>(SELECTORS.confirmModal);
    const titleEl = document.querySelector<HTMLElement>(SELECTORS.confirmModalTitle);
    const bodyEl = document.querySelector<HTMLElement>(SELECTORS.confirmModalBody);
    if (!modalEl || !titleEl || !bodyEl) return false;

    titleEl.textContent = title;
    bodyEl.textContent = body;
    
    const result = await showModal(SELECTORS.confirmModal);
    
    return result && !result.cancelled;
}

// --- Core UI & Calculation ---
export const debouncedSave = debounce(() => {
    if (getIsLocked()) return; // [FIX] ใช้ Getter
    saveData();
}, 1000);

export function recalcAll(): void {
    if (getIsLocked()) return; // [FIX] ใช้ Getter

    let subTotal = 0;
    const roomsContainer = document.querySelector<HTMLElement>(SELECTORS.roomsContainer);
    if (!roomsContainer) return;

    const rooms = roomsContainer.querySelectorAll<HTMLElement>(SELECTORS.room);

    rooms.forEach(roomEl => {
        let roomTotal = 0;
        let briefText = '';
        let itemCounter = 0;

        roomEl.querySelectorAll<HTMLElement>(SELECTORS.itemCard).forEach(itemEl => {
            const item = _extractItemData(itemEl);
            if (!item) return;

            const itemTotal = CALC.calculateItemPrice(item);
            
            const totalEl = itemEl.querySelector<HTMLElement>(SELECTORS.itemTotal);
            if (totalEl) totalEl.textContent = fmtTH(itemTotal);

            if (!item.is_suspended) {
                roomTotal += itemTotal;
                if (item.type !== 'placeholder') {
                    itemCounter++;
                    if (itemCounter <= 3) {
                         briefText += (ITEM_CONFIG[item.type]?.name || 'รายการ') + ', ';
                    }
                }
            }
        });
        
        if (itemCounter > 3) briefText += `...และอีก ${itemCounter - 3} รายการ`;
        else if (itemCounter > 0) briefText = briefText.slice(0, -2); // Remove last comma
        
        const roomCard = roomEl as any;
        if (typeof roomCard.updateBrief === 'function') roomCard.updateBrief(briefText);
        if (typeof roomCard.updateTotal === 'function') roomCard.updateTotal(fmtTH(roomTotal));

        if (roomEl.classList.contains('is-suspended')) {
            roomEl.classList.add('is-suspended'); // Ensure it stays suspended
        } else {
            subTotal += roomTotal;
        }
    });

    // --- Calculate Footer Totals ---
    const discountTypeInput = document.querySelector<HTMLSelectElement>(SELECTORS.discountTypeInput);
    const discountValueInput = document.querySelector<HTMLInputElement>(SELECTORS.discountValueInput);
    const totalTextEl = document.querySelector<HTMLElement>(SELECTORS.totalText);
    const grandTotalTextEl = document.querySelector<HTMLElement>(SELECTORS.grandTotalText);

    if (!discountTypeInput || !discountValueInput || !totalTextEl || !grandTotalTextEl) return;

    let discountAmount = 0;
    const discountType = discountTypeInput.value;
    const discountValue = toNum(discountValueInput.value);
    
    if (discountType === 'percent') {
        discountAmount = (subTotal * discountValue) / 100;
    } else {
        discountAmount = discountValue;
    }
    const grandTotal = subTotal - discountAmount;

    totalTextEl.textContent = `ยอดรวม: ${fmtTH(subTotal)}`;
    grandTotalTextEl.textContent = `สุทธิ: ${fmtTH(grandTotal)}`;

    debouncedSave();
}

export function _extractItemData(itemEl: HTMLElement): Item | null {
    const itemType = itemEl.dataset.type;
    if (!itemType) return null;

    const baseItemData = {
        id: itemEl.id,
        type: itemType,
        is_suspended: itemEl.classList.contains('is-suspended'),
        width_m: 0,
        height_m: 0,
        notes: ''
    };

    if (itemType === 'placeholder') {
        const width = itemEl.querySelector<HTMLElement>('[data-placeholder-width]')?.textContent;
        const height = itemEl.querySelector<HTMLElement>('[data-placeholder-height]')?.textContent;
        return {
            ...baseItemData,
            type: 'placeholder',
            width_m: toNum(width),
            height_m: toNum(height),
        };
    } 
    else if (itemType === 'set') {
        const q = (sel: string) => (itemEl.querySelector<HTMLInputElement | HTMLSelectElement>(sel) as HTMLInputElement)?.value || '';
        return {
            ...baseItemData,
            type: 'set',
            width_m: toNum(q('input[name="width_m"]')),
            height_m: toNum(q('input[name="height_m"]')),
            set_style: q('select[name="set_style"]') as SetItemData['set_style'],
            fabric_variant: q('select[name="fabric_variant"]') as SetItemData['fabric_variant'],
            price_per_m_raw: toNum(q('select[name="set_price_per_m"]')),
            fabric_code: q('input[name="fabric_code"]'),
            sheer_price_per_m: toNum(q('select[name="set_sheer_price_per_m"]')),
            sheer_fabric_code: q('input[name="sheer_fabric_code"]'),
            louis_price_per_m: toNum(q('select[name="set_louis_price_per_m"]')),
            opening_style: q('select[name="opening_style"]') as SetItemData['opening_style'],
            adjustment_side: q('select[name="adjustment_side"]') as SetItemData['adjustment_side'],
            notes: q('input[name="notes"]'),
            track_color: q('input[name="track_color"]'),
            bracket_color: q('input[name="bracket_color"]'),
            finial_color: q('input[name="finial_color"]'),
            grommet_color: q('input[name="grommet_color"]'),
            louis_valance: q('input[name="louis_valance"]'),
            louis_tassels: q('input[name="louis_tassels"]'),
        };
    } 
    else if (itemType === 'wallpaper') {
        const q = (sel: string) => (itemEl.querySelector<HTMLInputElement | HTMLSelectElement>(sel) as HTMLInputElement)?.value || '';
        const widths: number[] = [];
        itemEl.querySelectorAll<HTMLInputElement>('input[name="wall_width_m"]').forEach(input => {
            widths.push(toNum(input.value));
        });
        return {
            ...baseItemData,
            type: 'wallpaper',
            width_m: 0,
            height_m: toNum(q('input[name="height_m"]')),
            widths: widths,
            price_per_roll: toNum(q('input[name="price_per_roll"]')),
            install_cost_per_roll: toNum(q('input[name="install_cost_per_roll"]')),
            code: q('input[name="code"]'),
            notes: q('input[name="notes"]'),
        };
    } 
    else if (ITEM_CONFIG[itemType]) { // (AreaBased)
        const q = (sel: string) => (itemEl.querySelector<HTMLInputElement | HTMLSelectElement>(sel) as HTMLInputElement)?.value || '';
        const areaItem: AreaBasedItemData = {
            ...baseItemData,
            type: itemType as AreaBasedItemData['type'],
            width_m: toNum(q('input[name="area_width_m"]')),
            height_m: toNum(q('input[name="area_height_m"]')),
            price_sqyd: toNum(q('input[name="area_price_sqyd"]')),
            code: q('input[name="area_code"]'),
            notes: q('input[name="area_notes"]'),
        };
        if (itemType === 'partition' || itemType === 'pleated_screen') {
            areaItem.opening_style = q('select[name="opening_style"]') as AreaBasedItemData['opening_style'];
        }
        if (['wooden_blind', 'roller_blind', 'vertical_blind', 'aluminum_blind'].includes(itemType)) {
            areaItem.adjustment_side = q('select[name="adjustment_side"]') as AreaBasedItemData['adjustment_side'];
        }
        return areaItem;
    }
    return null;
}

// --- Payload Loading ---
export function loadPayload(payload: Payload): void {
    setIsLocked(true); // [FIX] ใช้ Setter
    
    const customerNameInput = document.querySelector<HTMLInputElement>(SELECTORS.customerNameInput);
    const customerPhoneInput = document.querySelector<HTMLInputElement>(SELECTORS.customerPhoneInput);
    const customerAddressInput = document.querySelector<HTMLTextAreaElement>(SELECTORS.customerAddressInput);
    const customerCard = document.querySelector<HTMLDetailsElement>(SELECTORS.customerCard);
    const discountTypeInput = document.querySelector<HTMLSelectElement>(SELECTORS.discountTypeInput);
    const discountValueInput = document.querySelector<HTMLInputElement>(SELECTORS.discountValueInput);
    const roomsContainer = document.querySelector<HTMLElement>(SELECTORS.roomsContainer);

    if (!customerNameInput || !customerPhoneInput || !customerAddressInput || !customerCard || !discountTypeInput || !discountValueInput || !roomsContainer) {
        console.error("Cannot load payload: Core DOM elements missing.");
        setIsLocked(false); // [FIX] ใช้ Setter
        return;
    }

    // 1. Clear existing DOM state
    roomsContainer.innerHTML = '';
    clearHistory(); 
    updateUndoButtonState();

    // 2. Load Customer & Discount
    customerNameInput.value = payload.customer_name || '';
    customerPhoneInput.value = payload.customer_phone || '';
    customerAddressInput.value = payload.customer_address || '';
    customerCard.open = payload.customer_card_open !== false; 
    
    const discount = payload.discount || { type: 'amount', value: 0 };
    discountTypeInput.value = discount.type || 'amount';
    discountValueInput.value = String(discount.value || 0);

    // 3. Load Rooms and Items
    payload.rooms?.forEach(roomData => {
        const roomEl = createRoomCard(roomData);
        if (!roomEl) return;
        
        const itemsContainer = (roomEl as any).getItemsContainer() as HTMLElement;
        if (!itemsContainer) return;
        
        roomData.items?.forEach(itemData => {
            let itemEl: HTMLElement | null = null;
            
            if (itemData.type === 'set') {
                itemEl = createSetItem(itemData as SetItemData);
            } else if (itemData.type === 'wallpaper') {
                itemEl = createWallpaperItem(itemData as WallpaperItemData);
            } else if (itemData.type === 'placeholder') {
                itemEl = UIActions.createPlaceholderItem(itemData.width_m, itemData.height_m);
                if (itemEl) itemEl.id = itemData.id;
            } else if (ITEM_CONFIG[itemData.type]) {
                itemEl = createAreaBasedItem(itemData.type as AreaBasedItemData['type'], itemData as AreaBasedItemData);
            }

            if (itemEl) {
                const detailsToggled = UIActions.checkIfDetailsToggled(itemData);
                if (detailsToggled) {
                    toggleDetails(itemEl, true); // เปิด-details-โดยไม่-recalc
                }
                itemsContainer.appendChild(itemEl);
            }
        });
        roomsContainer.appendChild(roomEl);
    });

    setIsLocked(false); // [FIX] ใช้ Setter

    // 4. Recalculate
    renumberItemTitles();
    recalcAll(); 
    updateQuickNavMenu();
    updateToggleAllButtonState();
    updateRoomObserver();
    showToast('โหลดข้อมูลสำเร็จ', 'success');
}

// --- Global UI State Updaters ---

export function updateUndoButtonState(): void {
    const undoBtn = document.querySelector<HTMLButtonElement>(SELECTORS.undoBtn);
    if (undoBtn) {
        undoBtn.disabled = !canUndo();
    }
}

// นี่คือฟังก์ชันที่ main.ts เรียกใช้
export function updateLockState(lock: boolean = false): void {
    setIsLocked(lock); // [FIX] เรียก Setter จาก ui-state
}

export function renumberItemTitles(): void {
    const rooms = document.querySelectorAll<HTMLElement>(SELECTORS.room);
    rooms.forEach(roomEl => {
        let itemIndex = 1;
        roomEl.querySelectorAll<HTMLElement>(SELECTORS.itemCard).forEach(itemEl => {
            const titleEl = itemEl.querySelector<HTMLElement>('[data-item-title]');
            if (titleEl) {
                titleEl.textContent = `${itemIndex}`;
                itemIndex++;
            }
        });
    });
}

export function updateToggleAllButtonState(): void {
    const btn = document.querySelector<HTMLButtonElement>(SELECTORS.toggleAllRoomsBtn);
    if (!btn) return;
    
    const allRooms = document.querySelectorAll<HTMLDetailsElement>(SELECTORS.room);
    if (allRooms.length === 0) {
        btn.disabled = true;
        return;
    }
    btn.disabled = false;

    const allCollapsed = Array.from(allRooms).every(room => !room.open);
    
    const icon = btn.querySelector('i');
    const text = btn.querySelector('.btn-text');
    if (!icon || !text) return;

    if (allCollapsed) {
        btn.dataset.state = 'expand';
        text.textContent = 'ขยายทั้งหมด';
        icon.className = 'ph ph-arrows-out-simple';
    } else {
        btn.dataset.state = 'collapse';
        text.textContent = 'ย่อทั้งหมด';
        icon.className = 'ph ph-arrows-in-simple';
    }
}

export function scrollToViewIfNeeded(el: HTMLElement): void {
    const rect = el.getBoundingClientRect();
    if (rect.top < 60 || rect.bottom > window.innerHeight - 60) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

export function toggleDetails(itemEl: HTMLElement, forceShow: boolean | null = null): void {
    const detailsEl = itemEl.querySelector<HTMLElement>('.details-advanced-toggle');
    const moreBtn = itemEl.querySelector<HTMLButtonElement>('.btn-toggle-details');
    if (!detailsEl || !moreBtn) return;

    const icon = moreBtn.querySelector('i');
    const text = moreBtn.querySelector('span');
    
    const shouldShow = forceShow !== null ? forceShow : !detailsEl.classList.contains('show');

    detailsEl.classList.toggle('show', shouldShow);
    moreBtn.setAttribute('aria-expanded', String(shouldShow));

    if (shouldShow) {
        if (icon) icon.className = 'ph ph-caret-up';
        if (text) text.textContent = 'ซ่อนรายละเอียด';
    } else {
        if (icon) icon.className = 'ph ph-caret-down';
        if (text) text.textContent = 'แสดงรายละเอียดเพิ่มเติม';
    }
}

export function animateAndRemove(el: HTMLElement): void {
    el.classList.add('item-removing');
    el.addEventListener('animationend', () => {
        el.remove();
    }, { once: true });
}

function toggleSidebar(forceShow: boolean | null = null): void {
    const sidebar = document.querySelector<HTMLElement>(SELECTORS.mainSidebar);
    const overlay = document.querySelector<HTMLElement>(SELECTORS.sidebarOverlay);
    if (!sidebar || !overlay) return;

    const shouldShow = forceShow !== null ? forceShow : !sidebar.classList.contains('show');
    
    sidebar.classList.toggle('show', shouldShow);
    overlay.classList.toggle('show', shouldShow);
    
    if (shouldShow) {
        sidebar.querySelector<HTMLAnchorElement>('a')?.focus();
    }
}

export function updateQuickNavMenu(): void {
    const listEl = document.querySelector<HTMLElement>(SELECTORS.quickNavRoomList);
    if (!listEl) return;

    const rooms = document.querySelectorAll<HTMLElement>(SELECTORS.room);
    if (rooms.length === 0) {
        listEl.innerHTML = '<span class="nav-empty">ยังไม่มีห้อง</span>';
        return;
    }
    
    listEl.innerHTML = Array.from(rooms).map((room, index) => {
        const roomName = room.querySelector<HTMLInputElement>(SELECTORS.roomNameInput)?.value || `ห้อง ${index + 1}`;
        const isActive = room.classList.contains('is-visible');
        return `<a href="#" data-act="jump-to-room" data-room-id="${room.id}" class="${isActive ? 'is-active' : ''}">
                    <i class="ph-bold ph-caret-right"></i> ${sanitizeHTML(roomName)}
                </a>`;
    }).join('');
}

export function updateRoomObserver(): void {
    if (roomObserver) roomObserver.disconnect();
    
    const rooms = document.querySelectorAll<HTMLElement>(SELECTORS.room);
    if (rooms.length === 0) return;

    roomObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const id = entry.target.id;
            const link = document.querySelector<HTMLAnchorElement>(`${SELECTORS.quickNavRoomList} a[data-room-id="${id}"]`);
            if (!link) return;
            
            if (entry.isIntersecting) {
                document.querySelectorAll<HTMLAnchorElement>(`${SELECTORS.quickNavRoomList} a.is-active`).forEach(l => l.classList.remove('is-active'));
                link.classList.add('is-active');
            }
        });
    }, {
        root: null, // viewport
        threshold: 0.5,
        rootMargin: "-50% 0px -50% 0px" // Only trigger when in middle of screen
    });

    rooms.forEach(room => roomObserver!.observe(room));
}


// --- Global Event Listener Initialization ---
export function initializeGlobalEventListeners(appContainer: HTMLElement): void {
    
    // Undo
    document.querySelector<HTMLButtonElement>(SELECTORS.undoBtn)?.addEventListener('click', UIActions.handleUndo);
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            UIActions.handleUndo();
        }
    });

    // Sidebar
    document.querySelector<HTMLButtonElement>(SELECTORS.menuToggleBtn)?.addEventListener('click', () => toggleSidebar(true));
    document.querySelector<HTMLButtonElement>(SELECTORS.menuCloseBtn)?.addEventListener('click', () => toggleSidebar(false));
    document.querySelector<HTMLElement>(SELECTORS.sidebarOverlay)?.addEventListener('click', () => toggleSidebar(false));
    
    // Quick Nav
    document.querySelector<HTMLButtonElement>(SELECTORS.quickNavBtn)?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelector<HTMLElement>(SELECTORS.quickNavDropdown)?.classList.toggle('show');
    });

    // Click outside to close dropdowns
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        
        const quickNavDropdown = document.querySelector<HTMLElement>(SELECTORS.quickNavDropdown);
        if (quickNavDropdown?.classList.contains('show') && !target.closest(SELECTORS.quickNavBtn)) {
            quickNavDropdown.classList.remove('show');
        }
        
        document.querySelectorAll<HTMLElement>('.room-options-menu.show').forEach(menu => {
            if (!target.closest('.room-options-container')) {
                menu.classList.remove('show');
            }
        });
    });

    // --- Global Click Delegation (Main Container) ---
    appContainer.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const actionBtn = target.closest<HTMLElement>('[data-act]');
        if (!actionBtn) return;
        
        const act = actionBtn.dataset.act;
        const roomEl = target.closest<HTMLElement>(SELECTORS.room);
        const itemEl = target.closest<HTMLElement>(SELECTORS.itemCard);

        const dropdown = target.closest<HTMLElement>('.menu-dropdown, .room-options-menu');
        if (dropdown) dropdown.classList.remove('show');

        switch (act) {
            // Room Actions
            case 'add-room': UIActions.addRoom(); break;
            case 'del-room': if (roomEl) UIActions.deleteRoom(roomEl); break;
            case 'duplicate-room': UIActions.duplicateRoom(); break;
            case 'toggle-all-rooms': UIActions.toggleAllRooms(actionBtn); break;
            case 'jump-to-room': 
                e.preventDefault();
                UIActions.jumpToRoom(actionBtn);
                break;
            case 'toggle-room-menu':
                e.preventDefault();
                e.stopPropagation(); 
                actionBtn.nextElementSibling?.classList.toggle('show');
                break;
            case 'set-room-defaults':
                if (roomEl) UIModals.showRoomDefaultsModal(roomEl);
                break;
            case 'toggle-suspend-room':
                if (roomEl) UIActions.toggleSuspendRoom(roomEl);
                break;
            case 'clear-room-items':
                if (roomEl) UIActions.clearRoomItems(roomEl);
                break;

            // Item Actions
            case 'add-item': 
                if (roomEl) UIActions.addPlaceholderItem(roomEl); // [FIX] เปลี่ยนกลับไปเรียก UIActions
                break;
            case 'del-item': 
                if (itemEl) UIActions.deleteItem(itemEl);
                break;
            case 'duplicate-item':
                if (itemEl) UIActions.duplicateItem(itemEl);
                break;
            case 'change-item-type':
                if (itemEl) UIActions.handleChangeItemType(itemEl);
                break;
            case 'select-item-type': // (Placeholder action)
                if (itemEl) UIActions.handleChangeItemType(itemEl);
                break;
            case 'toggle-details':
                if (itemEl) toggleDetails(itemEl);
                break;
            case 'toggle-suspend':
                if (itemEl) UIActions.toggleSuspendItem(itemEl);
                break;
            case 'open-hardware-modal':
                if (itemEl) UIModals.showHardwareModal(itemEl);
                break;

            // Wallpaper Actions
            case 'add-wall': 
                if (itemEl) UIActions.addWallToItem(itemEl);
                break;
            case 'del-wall':
                if (itemEl) UIActions.deleteWallFromItem(actionBtn);
                break;
            
            // Favorites Actions
            case 'show-favs':
                UIFavorites.showFavoritesModal(actionBtn); 
                break;
            case 'add-fav':
                UIFavorites.addFavoriteFromInput(actionBtn); 
                break;
            
            // Default favorite (modal)
            case 'manage-favorites-from-defaults':
                UIFavorites.showManageFavsTypeModal();
                break;
        }
    });
    
    // --- Global Change/Input Delegation ---
    const throttledRecalc = throttle(recalcAll, 300);
    
    appContainer.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLElement;
        
        if (target.matches('input, textarea, select')) {
            throttledRecalc(); // Recalc on any input change
        }
        
        if (target.matches(SELECTORS.roomNameInput)) {
            debounce(updateQuickNavMenu, 300)();
        }
    });

    // Deference: ซ่อน/แสดงปุ่ม-Duplicate-Room
    appContainer.addEventListener('focusin', (e: FocusEvent) => {
        const target = e.target as HTMLElement;
        const roomEl = target.closest<HTMLElement>(SELECTORS.room);
        const dupBtn = document.querySelector<HTMLButtonElement>(SELECTORS.duplicateRoomBtn);
        if (!dupBtn) return;

        if (roomEl) {
            dupBtn.disabled = roomEl.classList.contains('is-suspended');
            dupBtn.dataset.targetRoomId = roomEl.id;
        }
    });

    // --- Sidebar Menu Buttons ---
    document.querySelector<HTMLAnchorElement>(SELECTORS.overviewBtn)?.addEventListener('click', (e) => { e.preventDefault(); UIModals.showOverviewModal(); });
    document.querySelector<HTMLAnchorElement>(SELECTORS.copySummaryBtn)?.addEventListener('click', (e) => { e.preventDefault(); UIModals.handleCopySummary(); });
    document.querySelector<HTMLAnchorElement>(SELECTORS.imageReportBtn)?.addEventListener('click', (e) => { e.preventDefault(); UIModals.showLookBookModal(); });
    document.querySelector<HTMLAnchorElement>(SELECTORS.pdfBtn)?.addEventListener('click', (e) => { e.preventDefault(); UIModals.showPdfOptionsModal(); });
    document.querySelector<HTMLAnchorElement>(SELECTORS.sendDataBtn)?.addEventListener('click', (e) => { e.preventDefault(); UIModals.handleSendData(); });
    
    document.querySelector<HTMLAnchorElement>(SELECTORS.themeToggleBtn)?.addEventListener('click', (e) => { e.preventDefault(); toggleTheme(); });
    
    document.querySelector<HTMLAnchorElement>(SELECTORS.importBtn)?.addEventListener('click', (e) => { e.preventDefault(); UIModals.handleImportData(); }); 
    document.querySelector<HTMLAnchorElement>(SELECTORS.exportBtn)?.addEventListener('click', (e) => { e.preventDefault(); UIModals.handleExportData(); }); 
    document.querySelector<HTMLAnchorElement>(SELECTORS.importFavBtn)?.addEventListener('click', (e) => { e.preventDefault(); UIModals.handleImportFavorites(); }); 
    document.querySelector<HTMLAnchorElement>(SELECTORS.exportFavBtn)?.addEventListener('click', (e) => { e.preventDefault(); UIModals.handleExportFavorites(); }); 

    // [FIX] แก้ไขการเรียก clearAllRooms -> handleClearAllRooms
    document.querySelector<HTMLAnchorElement>(SELECTORS.clearAllBtn)?.addEventListener('click', (e) => { e.preventDefault(); UIActions.handleClearAllRooms(); }); // Line 830
    
    document.querySelector<HTMLAnchorElement>(SELECTORS.deleteAllBtn)?.addEventListener('click', (e) => { e.preventDefault(); UIActions.deleteAllData(); }); // Line 831

    // Discount Modal
    document.querySelector(SELECTORS.discountBtnTrigger)?.addEventListener('click', () => {
        UIModals.showDiscountModal();
    });

    // [FIX] เพิ่ม Event Listener เพื่อทลายวงจร 'ui-modals' -> 'ui-actions'
    document.body.addEventListener('applyroomdefaults', (e) => {
        const { roomEl, defaults } = (e as CustomEvent).detail;
        if (roomEl && defaults) {
            UIActions.applyRoomDefaults(roomEl, defaults);
        }
    });
}