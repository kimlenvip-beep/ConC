import { initUI } from './lib/ui';
import { initUIActions } from './lib/ui-actions';
import { initModals } from './lib/ui-modals';

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initUIActions();
    initModals();
    console.info('App initialized');
});