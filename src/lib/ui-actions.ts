import { setIsLocked, getIsLocked } from './ui-state';
import { SELECTORS } from './config';

export const toggleLock = (): void => {
    const locked = !getIsLocked();
    setIsLocked(locked);
};

export const duplicateRoom = (roomData: any): any => {
    // shallow duplicate - caller integrates into state
    return JSON.parse(JSON.stringify(roomData));
};

export const initUIActions = (): void => {
    // wire up a couple of UI controls if present
    const dupBtn = document.querySelector(SELECTORS.duplicateRoomBtn) as HTMLElement | null;
    if (dupBtn) dupBtn.addEventListener('click', () => { /* trigger duplicate via app */ });
};