import { SELECTORS } from './config';
import { CALC } from './calculations';

export const renderRooms = (rooms: any[] = []) => {
    const container = document.querySelector(SELECTORS.roomsContainer) as HTMLElement | null;
    if (!container) return;
    container.innerHTML = '';
    rooms.forEach(r => {
        const el = document.createElement('div');
        el.className = 'room';
        el.textContent = r.name || 'Room';
        container.appendChild(el);
    });
};

export const updateTotals = (rooms: any[] = []) => {
    // compute totals via CALC if needed (placeholder)
    let subtotal = 0;
    rooms.forEach(r => { (r.items || []).forEach((it: any) => { subtotal += Number(it.total) || 0; }); });
    return subtotal;
};

export const initUI = () => {
    // placeholder to initialize UI
};