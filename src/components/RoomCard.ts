import { fmt } from '../lib/utils';
import { CALC } from '../lib/calculations';

export default function RoomCard(room: any) {
    const subtotal = (room?.items || []).reduce((s: number, it: any) => s + (Number(it.total) || 0), 0);
    return {
        title: room?.name || 'Room',
        subtotalDisplay: fmt(subtotal),
        subtotal
    };
}