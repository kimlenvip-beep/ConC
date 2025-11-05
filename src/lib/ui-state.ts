// src/lib/ui-state.ts
// [ไฟล์ใหม่] - เก็บ State ส่วนกลางเพื่อทลายวงจร

import type { FavoriteItem } from '../types';

// --- State Variables (ย้ายมาจาก ui.ts และที่อื่นๆ) ---

// (จาก ui.ts) สถานะที่แชร์กัน
let currentActiveFavoriteInput: { input: HTMLInputElement; type: string } | null = null;
let currentActiveHardwareItem: HTMLElement | null = null;
let currentSelectedFavItem: { el: HTMLElement; code: string; price: number } | null = null;
let favManagerChangesMade = false;
let currentRoomDefaultsEl: HTMLElement | null = null;
let roomDefaultsModalListeners: { [key: string]: (e: Event) => void } = {};
let appIsLocked = false; // สถานะ Lock ของแอป

// --- Getters/Setters ---

// สำหรับ Favorites
export const getActiveFavoriteInput = () => currentActiveFavoriteInput;
export const setActiveFavoriteInput = (val: { input: HTMLInputElement; type: string } | null) => { currentActiveFavoriteInput = val; };
export const getSelectedFavItem = () => currentSelectedFavItem;
export const setSelectedFavItem = (val: { el: HTMLElement; code: string; price: number } | null) => { currentSelectedFavItem = val; };
export const getFavManagerChangesMade = () => favManagerChangesMade;
export const setFavManagerChangesMade = (val: boolean) => { favManagerChangesMade = val; };

// สำหรับ Modals (Hardware, Room Defaults)
export const getActiveHardwareItem = () => currentActiveHardwareItem;
export const setActiveHardwareItem = (val: HTMLElement | null) => { currentActiveHardwareItem = val; };
export const getCurrentRoomDefaultsEl = () => currentRoomDefaultsEl;
export const setCurrentRoomDefaultsEl = (val: HTMLElement | null) => { currentRoomDefaultsEl = val; };
export const getRoomDefaultsModalListeners = () => roomDefaultsModalListeners;
export const clearRoomDefaultsModalListeners = () => { roomDefaultsModalListeners = {}; };
export const addRoomDefaultsModalListener = (key: string, fn: (e: Event) => void) => { roomDefaultsModalListeners[key] = fn; };

// สำหรับสถานะ Lock (ที่แก้ Error)
export const getIsLocked = () => appIsLocked;
export const setIsLocked = (val: boolean) => { 
    appIsLocked = val; 
    // อัปเดต UI ทันที
    const container = document.querySelector<HTMLElement>('#appContainer');
    if (container) {
        container.classList.toggle('is-locked', val);
    }
};