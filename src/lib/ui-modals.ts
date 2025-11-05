import { getCurrentRoomDefaultsEl, setCurrentRoomDefaultsEl, registerRoomDefaultsListener, clearRoomDefaultsModalListeners } from './ui-state';

/**
 * Minimal modal helpers — open/close room defaults modal and manage listeners.
 */

export const openRoomDefaultsModal = (el: HTMLElement) => {
    setCurrentRoomDefaultsEl(el);
    // attach basic close handler as an example
    const closeBtn = el.querySelector<HTMLElement>('.close-btn');
    if (closeBtn) {
        const onClose = () => { closeRoomDefaultsModal(); };
        registerRoomDefaultsListener(closeBtn, 'click', onClose);
    }
};

export const closeRoomDefaultsModal = () => {
    const el = getCurrentRoomDefaultsEl();
    if (el) {
        // hide element
        (el as HTMLElement).style.display = 'none';
        setCurrentRoomDefaultsEl(null);
    }
    clearRoomDefaultsModalListeners();
};

export const initModals = () => {
    // placeholder to init modal behaviors
};