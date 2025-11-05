// src/lib/storage.ts
// (ตามข้อ 8) แปลงเป็น .ts
// (ตามข้อ 2) นี่คือไฟล์ที่รับผิดชอบ-Auto-Save

import { APP_VERSION, STORAGE_KEY, SELECTORS } from './config';
import { toNum } from './utils';
import { getFavorites } from './favorites';
import type { Payload, Room, Item, Discount, SetItemData, WallpaperItemData, AreaBasedItemData } from '../types';

/**
 * Builds the complete application state (Payload) from the DOM.
 * @returns {Payload} The current application state.
 */
export function buildPayload(): Payload {
    const favorites = getFavorites();

    // (ตามข้อ 10) DOM Safety & Type Guards
    const customerNameInput = document.querySelector<HTMLInputElement>(SELECTORS.customerNameInput);
    const customerPhoneInput = document.querySelector<HTMLInputElement>(SELECTORS.customerPhoneInput);
    const customerAddressInput = document.querySelector<HTMLTextAreaElement>(SELECTORS.customerAddressInput);
    const customerCard = document.querySelector<HTMLDetailsElement>(SELECTORS.customerCard);
    const discountTypeInput = document.querySelector<HTMLSelectElement>(SELECTORS.discountTypeInput);
    const discountValueInput = document.querySelector<HTMLInputElement>(SELECTORS.discountValueInput);

    const payload: Payload = {
        app_version: APP_VERSION,
        customer_name: customerNameInput ? customerNameInput.value : '',
        customer_phone: customerPhoneInput ? customerPhoneInput.value : '',
        customer_address: customerAddressInput ? customerAddressInput.value : '',
        customer_card_open: customerCard ? customerCard.open : true,
        discount: {
            type: (discountTypeInput ? discountTypeInput.value : 'amount') as Discount['type'],
            value: discountValueInput ? toNum(discountValueInput.value) : 0
        },
        rooms: [],
        favorites: favorites
    };

    document.querySelectorAll<HTMLElement>(SELECTORS.room).forEach(roomEl => {
        const roomNameInput = roomEl.querySelector<HTMLInputElement>(SELECTORS.roomNameInput);
        
        const roomData: Room = {
            id: roomEl.id,
            room_name: roomNameInput ? roomNameInput.value : '',
            is_suspended: roomEl.classList.contains('is-suspended'),
            is_open: (roomEl as HTMLDetailsElement).open,
            room_defaults: roomEl.dataset.roomDefaults ? JSON.parse(roomEl.dataset.roomDefaults) : {},
            items: []
        };

        roomEl.querySelectorAll<HTMLElement>(SELECTORS.itemCard).forEach(itemEl => {
            const itemType = itemEl.dataset.type;
            if (!itemType) return;

            const baseItemData = {
                id: itemEl.id,
                type: itemType,
                is_suspended: itemEl.classList.contains('is-suspended'),
                width_m: 0,
                height_m: 0,
                notes: ''
            };

            let itemData: Item | null = null;

            if (itemType === 'placeholder') {
                const width = itemEl.querySelector<HTMLElement>('[data-placeholder-width]')?.textContent;
                const height = itemEl.querySelector<HTMLElement>('[data-placeholder-height]')?.textContent;
                itemData = {
                    ...baseItemData,
                    type: 'placeholder',
                    width_m: toNum(width),
                    height_m: toNum(height),
                };
            }
            else if (itemType === 'set') {
                // (ตามข้อ 10) ใช้-Type-Guards-ที่เข้มงวด
                const q = (sel: string) => itemEl.querySelector<HTMLInputElement | HTMLSelectElement>(sel)?.value || '';
                
                itemData = {
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
                const q = (sel: string) => itemEl.querySelector<HTMLInputElement | HTMLSelectElement>(sel)?.value || '';
                
                const widths: number[] = [];
                itemEl.querySelectorAll<HTMLInputElement>('input[name="wall_width_m"]').forEach(input => {
                    widths.push(toNum(input.value));
                });
                
                itemData = {
                    ...baseItemData,
                    type: 'wallpaper',
                    width_m: 0, // (Wallpaper-ใช้-widths-array-แทน)
                    height_m: toNum(q('input[name="height_m"]')),
                    widths: widths,
                    price_per_roll: toNum(q('input[name="price_per_roll"]')),
                    install_cost_per_roll: toNum(q('input[name="install_cost_per_roll"]')),
                    code: q('input[name="code"]'),
                    notes: q('input[name="notes"]'),
                };
            } 
            else if (ITEM_CONFIG[itemType]) { // (AreaBased)
                const q = (sel: string) => itemEl.querySelector<HTMLInputElement | HTMLSelectElement>(sel)?.value || '';

                itemData = {
                    ...baseItemData,
                    type: itemType as AreaBasedItemData['type'],
                    width_m: toNum(q('input[name="area_width_m"]')),
                    height_m: toNum(q('input[name="area_height_m"]')),
                    price_sqyd: toNum(q('input[name="area_price_sqyd"]')),
                    code: q('input[name="area_code"]'),
                    notes: q('input[name="area_notes"]'),
                };
                
                // Add specific fields
                if (itemType === 'partition' || itemType === 'pleated_screen') {
                    itemData.opening_style = q('select[name="opening_style"]') as AreaBasedItemData['opening_style'];
                }
                if (['wooden_blind', 'roller_blind', 'vertical_blind', 'aluminum_blind'].includes(itemType)) {
                    itemData.adjustment_side = q('select[name="adjustment_side"]') as AreaBasedItemData['adjustment_side'];
                }
            }

            if (itemData) {
                roomData.items.push(itemData);
            }
        });
        payload.rooms.push(roomData);
    });
    return payload;
}

/**
 * Saves the current application state to localStorage.
 * (QoL Item 2: This is the core Auto-Save function)
 */
export function saveData(): void {
    try {
        const currentPayload = buildPayload();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPayload));
        // console.log("Data saved:", currentPayload);
    } catch (error: unknown) {
        console.error("Failed to save data to localStorage:", error);
    }
}
