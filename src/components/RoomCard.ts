// src/components/RoomCard.ts
// (ตามข้อ 8) แปลงเป็น .ts
import { SELECTORS } from '../lib/config';
import type { Room } from '../types';

// (TS) ใช้-Partial<Room>-เพราะข้อมูลอาจมาไม่ครบตอนสร้าง
export function createRoomCard(data: Partial<Room> = {}): HTMLElement | null {
    const template = document.querySelector<HTMLTemplateElement>(SELECTORS.roomTpl);
    if (!template) {
        console.error('Room template not found');
        return null;
    }

    const clone = template.content.cloneNode(true) as DocumentFragment;
    const roomEl = clone.firstElementChild as HTMLDetailsElement;
    
    roomEl.id = data.id || `room-${Date.now()}`;
    roomEl.open = data.is_open !== false; // (QoL) เปิดเป็นค่าเริ่มต้น
    roomEl.dataset.roomDefaults = JSON.stringify(data.room_defaults || {});

    // (ตามข้อ 10) DOM Safety
    const nameInput = roomEl.querySelector<HTMLInputElement>(SELECTORS.roomNameInput);
    const nameDisplay = roomEl.querySelector<HTMLElement>('[data-room-name-display]');
    const briefDisplay = roomEl.querySelector<HTMLElement>('[data-room-brief]');
    const itemsContainer = roomEl.querySelector<HTMLElement>(SELECTORS.allItemsContainer);

    // --- Functions ---
    const updateNameDisplay = (): void => {
        if (!nameInput || !nameDisplay) return;
        const newName = nameInput.value || 'ห้อง (ไม่มีชื่อ)';
        nameDisplay.textContent = newName;
    };

    // --- Event Listeners (Internal) ---
    if (nameInput) {
        nameInput.addEventListener('input', updateNameDisplay);
    }

    // --- Initialization ---
    const initialRoomName = data.room_name || `ห้อง ${document.querySelectorAll(SELECTORS.room).length + 1}`;
    if (nameInput) {
        nameInput.value = initialRoomName;
        // (ตามข้อ 15) Accessibility: เชื่อม-Label
        const uniqueId = `room_name_${roomEl.id}`;
        nameInput.id = uniqueId;
        const label = nameInput.closest('.room-name-wrapper')?.querySelector('label');
        if(label) label.setAttribute('for', uniqueId);
    }
    if (nameDisplay) nameDisplay.textContent = initialRoomName;

    if (data.is_suspended) {
        roomEl.classList.add('is-suspended');
    }

    // (TS) สร้าง-Public-Methods-บน-Element-โดยตรง
    // (เราจะเปลี่ยนไปใช้-Event-Bubbling-ใน-ui.ts-แต่ตอนนี้คง-API-เดิมไว้ก่อน)
    (roomEl as any).getItemsContainer = (): HTMLElement | null => itemsContainer;
    (roomEl as any).updateBrief = (html: string): void => { 
        if (briefDisplay) briefDisplay.innerHTML = html; 
    };
    (roomEl as any).updateTotal = (total: string): void => {
        const totalEl = roomEl.querySelector<HTMLElement>(SELECTORS.roomTotal);
        if (totalEl) totalEl.textContent = total;
    };

    return roomEl;
}
