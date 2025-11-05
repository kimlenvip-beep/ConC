// src/main.ts
// (ตามข้อ 9) นี่คือ-entry-point-ใหม่ของ-Vite

// --- MAIN APPLICATION ENTRY POINT (VITE + TS) ---
import './styles/main.css'; // (ตามข้อ 9) Import-CSS-หลัก

// (ตามข้อ 6) Import-Types-หลัก
import type { Payload, Room, SetItemData, WallpaperItemData, AreaBasedItemData } from './types'; 

// Import-Config-และ-Libs-ที่แปลงเป็น-TS
import { STORAGE_KEY, SELECTORS, PRICING, APP_VERSION } from './lib/config';
import {
    applyInitialTheme,
    initializeGlobalEventListeners,
    loadPayload,
    recalcAll,
    updateLockState,
    updateToggleAllButtonState,
    updateRoomObserver,
    updateUndoButtonState,
    showToast
} from './lib/ui';
import { addRoom } from './lib/ui-actions';
import { getFavorites } from './lib/favorites';

/**
 * [TS] Populates the price selection dropdowns.
 */
function populatePriceDropdowns(): void {
    const setTemplate = document.querySelector<HTMLTemplateElement>(SELECTORS.setTpl);
    if (!setTemplate) return;

    const fabricSelect = setTemplate.content.querySelector<HTMLSelectElement>(SELECTORS.setPricePerMSelect);
    const sheerSelect = setTemplate.content.querySelector<HTMLSelectElement>(SELECTORS.setSheerPricePerMSelect);
    const louisSelect = setTemplate.content.querySelector<HTMLSelectElement>(SELECTORS.setLouisPricePerMSelect);

    const createOptions = (prices: number[]): string => {
        let optionsHtml = '<option value="" hidden>เลือกราคา</option>';
        prices.forEach(price => {
            optionsHtml += `<option value="${price}">${price}</option>`;
        });
        return optionsHtml;
    };

    if (fabricSelect) fabricSelect.innerHTML = createOptions(PRICING.fabric);
    if (sheerSelect) sheerSelect.innerHTML = createOptions(PRICING.sheer);
    if (louisSelect) louisSelect.innerHTML = createOptions(PRICING.louis_price_per_m);
}

/**
 * [TS] Initializes the application.
 */
function init(): void {
    console.log(`Initializing Marnthara App ${APP_VERSION}`);
    
    // (ตามข้อ 10) ใช้-Type-Guards-เพื่อความปลอดภัย
    const appContainer = document.getElementById('app-container');
    if (!appContainer) {
        console.error("Fatal Error: #app-container not found.");
        return;
    }

    applyInitialTheme();
    populatePriceDropdowns();
    initializeGlobalEventListeners(appContainer); // (QoL) ส่ง-appContainer-ไปให้-event-listener

    // Load data from localStorage
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            const payload: Payload = JSON.parse(storedData);
            
            // [QoL] ตรวจสอบเวอร์ชัน (ถ้าจำเป็น)
            if (payload.app_version !== APP_VERSION) {
                 console.warn(`Data version mismatch. Loaded: ${payload.app_version}, App: ${APP_VERSION}`);
                 // ที่นี่เราสามารถเพิ่ม-logic-การ-migrate-ข้อมูลได้
            }

            // [QoL] ตรวจสอบข้อมูล-Favorites-ที่-load-มา
            const favoritesFromStorage = getFavorites();
            if (Object.keys(favoritesFromStorage).length === 0 && payload.favorites && Object.keys(payload.favorites).length > 0) {
                // ถ้า-localStorage-ของ-favorites-ว่าง-แต่-payload-มี-ให้ใช้จาก-payload
                localStorage.setItem('marnthara.favorites.v4', JSON.stringify(payload.favorites));
                showToast('รายการโปรดถูกโหลดจากไฟล์สำรอง', 'success');
            }

            loadPayload(payload);
            
            // (ตามข้อ 2) Auto-Save: หลังจาก-load-ข้อมูล-ให้ตรวจสอบว่าข้อมูลลูกค้าเปิดอยู่หรือไม่
            const customerCard = document.querySelector<HTMLDetailsElement>(SELECTORS.customerCard);
            if (customerCard) {
                 customerCard.open = payload.customer_card_open !== false; // เปิด-ถ้าไม่ได้ตั้งค่าเป็น-false
            }
            if (payload.rooms.length === 0) {
                 addRoom(); // เพิ่มห้อง-ถ้า-payload-ว่าง
                 if (customerCard) customerCard.open = true;
            }
        } else {
            addRoom(); // เริ่มด้วยห้องเดียวถ้าไม่มีข้อมูล
            const customerCard = document.querySelector<HTMLDetailsElement>(SELECTORS.customerCard);
            if (customerCard) customerCard.open = true; // เปิดหน้าข้อมูลลูกค้าในเซสชันใหม่
        }
    } catch(err: unknown) {
        console.error("Failed to load or parse data from localStorage:", err);
        localStorage.removeItem(STORAGE_KEY); // ล้างข้อมูลที่อาจเสียหาย
        addRoom(); // เริ่มใหม่
         const customerCard = document.querySelector<HTMLDetailsElement>(SELECTORS.customerCard);
         if (customerCard) customerCard.open = true;
    }

    // อัปเดต-UI-เริ่มต้น
    recalcAll(); 
    updateLockState(); 
    updateToggleAllButtonState(); 
    updateRoomObserver(); 
    updateUndoButtonState(); // (QoL Item 1) อัปเดตสถานะปุ่ม-Undo

    console.log("Marnthara App Initialized (Vite + TS)");
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', init);
