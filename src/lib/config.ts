// src/lib/config.ts
// (ตามข้อ 8) แปลงเป็น .ts
import type { ShopConfig, ItemConfig } from '../types';

export const APP_VERSION = "vite-ts/7.0.0";
export const WEBHOOK_URL = "https://your-make-webhook-url.com/your-unique-path";
export const STORAGE_KEY = "marnthara.input.v7.0"; // (QoL) อัปเดตเวอร์ชัน-storage
export const PDF_EXPORT_DELAY_MS = 500;
export const SQM_TO_SQYD = 1.196;
export const WALLPAPER_SPECS = {
    roll_width_m: 0.53,
    roll_length_m: 10.0,
    roll_sqm: 5.0, // (เผื่อ-waste-เล็กน้อย)
    waste_allowance: 1.15
};

// (ตามข้อ 6) ใช้-Type-ที่กำหนดไว้
export const SHOP_CONFIG: ShopConfig = {
    name: "ร้านผ้าม่าน ขวัญฤดี",
    address: "เลขที่ 257 ม.6 ต.หนองโพรง อ.ศรีมหาโพธิ จ.ปราจีนบุรี 25140",
    phone: "โทร 087-985-3832 (ศิริขวัญ นาคะเสถียร)",
    taxId: "1250100194164",
    logoUrl: "", // ตั้งค่าเป็น "" เพื่อปิดการใช้งาน
    baseVatRate: 0.07,
    pdf: {
        paymentTerms: "ชำระมัดจำ 50%",
        priceValidity: "30 วัน",
        notes: [
            "ราคานี้รวมค่าติดตั้งแล้ว",
            "ชำระมัดจำ 50% เพื่อยืนยืนการสั่งผลิตสินค้า",
            "ใบเสนอราคานี้มีอายุ 30 วัน นับจากวันที่เสนอราคา"
        ],
        bank: {
            name: "ธ.กสิกรไทย",
            account: "000-0-00000-0",
            holder: "ศิริขวัญ นาคะเสถียร"
        }
    }
};

export const PRICING = {
    fabric: [350, 450, 550, 650, 750, 850, 950, 1050, 1150, 1250, 1350, 1450, 1550, 1650, 1750, 1850, 1950],
    sheer: [350, 450, 550],
    louis_price_per_m: [2500, 3000, 3500],
    style_surcharge: { "ลอน": 0, "ตาไก่": 100, "จีบ": 0, "ม่านพับ": 300, "หลุยส์": 0, "ม่านแป๊บ": 0 },
    height: [
        { threshold: 2.8, surcharge: 100 },
        { threshold: 3.5, surcharge: 200 }
    ],
    pleat_cost: 0,
    eyelet_cost: 0,
    folding_curtain_accessory: 0,
    rail: { "มาตรฐาน": 120, "งอ": 150 },
    rail_surcharge_percent: 1.0,
    installation: { "มาตรฐาน": 150, "ฝ้า": 200 },
    wallpaper_install_cost_per_roll: 300 // (ค่าเริ่มต้น-สามารถ-override-ใน-item-ได้)
};

// (ตามข้อ 6) ใช้-Type-ที่กำหนดไว้
export const ITEM_CONFIG: { [key: string]: ItemConfig } = {
    'set': { name: 'ผ้าม่าน', className: 'set-item', icon: 'ph-person-simple-run' },
    'wallpaper': { name: 'วอลเปเปอร์', className: 'wallpaper-item', icon: 'ph-paint-roller' },
    'wooden_blind': { name: 'มู่ลี่ไม้', className: 'wooden-blind-item', icon: 'ph-table' },
    'roller_blind': { name: 'ม่านม้วน', className: 'roller-blind-item', icon: 'ph-scroll' },
    'vertical_blind': { name: 'ม่านปรับแสง', className: 'vertical-blind-item', icon: 'ph-rows' },
    'partition': { name: 'ฉากกั้นห้อง', className: 'partition-item', icon: 'ph-columns' },
    'pleated_screen': { name: 'มุ้งจีบ', className: 'pleated-screen-item', icon: 'ph-squares-four' },
    'aluminum_blind': { name: 'มู่ลี่อลูมิเนียม', className: 'aluminum-blind-item', icon: 'ph-stack' },
    'default': { name: 'ของตกแต่ง', className: 'default-item', icon: 'ph-ruler' }
};

// (ตามข้อ 10) DOM Safety: รวม-Selectors-ไว้ที่เดียว
export const SELECTORS = {
    // App
    appContainer: '#app-container',
    roomsContainer: '#roomsContainer',
    templates: '#templates',
    
    // Header & Menu
    menuToggleBtn: '#menuToggleBtn',
    mainSidebar: '#mainSidebar',
    menuCloseBtn: '#menuCloseBtn',
    sidebarOverlay: '#sidebarOverlay',
    overviewBtn: '#overviewBtn',
    copySummaryBtn: '#copySummaryBtn',
    imageReportBtn: '#imageReportBtn',
    pdfBtn: '#pdfBtn',
    sendDataBtn: '#sendDataBtn',
    themeToggleBtn: '#themeToggleBtn',
    importBtn: '#importBtn',
    exportBtn: '#exportBtn',
    importFavBtn: '#importFavBtn',
    exportFavBtn: '#exportFavBtn',
    clearAllBtn: '#clearAllBtn',
    deleteAllBtn: '#deleteAllBtn',

    // Customer Card
    customerCard: '#customerCard',
    customerBrief: '#customerBrief',
    customerNameInput: '#customerNameInput',
    customerPhoneInput: '#customerPhoneInput',
    customerAddressInput: '#customerAddressInput',

    // Room Management
    duplicateRoomBtn: '#duplicateRoomBtn',
    toggleAllRoomsBtn: '#toggleAllRoomsBtn',
    addRoomBtn: '#addRoomBtn',
    
    // Room Card
    room: '.room-card', // class-selector
    roomNameInput: '.room-name-input', // class-selector
    roomTotal: '[data-room-total]',
    allItemsContainer: '.items-container',
    
    // Footer
    footerSummary: '#footerSummary',
    undoBtn: '#undoBtn', // (QoL Item 1)
    quickNavBtn: '#quickNavBtn',
    quickNavDropdown: '#quickNavDropdown',
    quickNavRoomList: '#quickNavRoomList',
    discountBtnTrigger: '#discountBtnTrigger',
    totalText: '#totalText',
    grandTotalText: '#grandTotalText',

    // Item (General)
    itemCard: '.item-card',
    itemTotal: '[data-item-total]',
    
    // Templates
    roomTpl: '#roomTpl',
    placeholderTpl: '#placeholderTpl',
    setTpl: '#setTpl',
    areaBasedTpl: '#areaBasedTpl',
    wallpaperTpl: '#wallpaperTpl',
    wallTpl: '#wallTpl',
    favItemTpl: '#favItemTpl',
    favManagerItemTpl: '#favManagerItemTpl',
    
    // Set (Curtain) Item Inputs
    setPricePerMSelect: 'select[name="set_price_per_m"]',
    setSheerPricePerMSelect: 'select[name="set_sheer_price_per_m"]',
    setLouisPricePerMSelect: 'select[name="set_louis_price_per_m"]',
    
    // AreaBased Item Inputs
    areaPriceSqydInput: 'input[name="area_price_sqyd"]',
    areaCodeInput: 'input[name="area_code"]',
    areaNotesInput: 'input[name="area_notes"]',
    
    // Wallpaper Item Inputs
    wallInput: 'input[name="wall_width_m"]',
    
    // Modals
    confirmModal: '#confirmModal',
    confirmModalTitle: '#confirmModalTitle',
    confirmModalBody: '#confirmModalBody',
    dimensionModal: '#dimensionModal',
    dimensionInputContainer: '#dimensionInputContainer',
    discountModal: '#discountModal',
    discountModalSubtotal: '#discountModalSubtotal',
    discountTypeInput: '#discountTypeInput',
    discountValueInput: '#discountValueInput',
    discountModalGrandTotal: '#discountModalGrandTotal',
    overviewModal: '#overviewModal',
    overviewModalBody: '#overviewModalBody',
    lookbookModal: '#lookbookModal',
    lookbookModalBody: '#lookbookModalBody',
    copySummaryModal: '#copySummaryModal',
    imageReportModal: '#imageReportModal',
    pdfOptionsModal: '#pdfOptionsModal',
    pdfRenderMethod: '#pdfRenderMethod',
    pdfPageBreakLines: '#pdfPageBreakLines',
    importFavoritesModal: '#importFavoritesModal',
    favListModal: '#favListModal',
    favListModalBody: '#favListModalBody',
    favListModalType: '#favListModalType',
    manageFavsBtn: '#manageFavsBtn',
    favManagerModal: '#favManagerModal',
    favManagerModalBody: '#favManagerModalBody',
    favManagerModalType: '#favManagerModalType',
    favManagerEditBtn: '#favManagerModal [data-act="edit-selected-fav"]',
    favManagerDelBtn: '#favManagerModal [data-act="del-selected-fav"]',
    favAddModal: '#favAddModal',
    favAddCodeInput: '[name="fav_code_add"]',
    favAddPriceInput: '[name="fav_price_add"]',
    favEditModal: '#favEditModal',
    favEditCodeInput: '[name="fav_code_edit"]',
    favEditPriceInput: '[name="fav_price_edit"]',
    itemTypeModal: '#itemTypeModal',
    hardwareModal: '#hardwareModal',
    hwApplyToRoom: '#hwApplyToRoom',
    
    // Room Defaults Modal
    roomDefaultsModal: '#roomDefaultsModal',
    roomDefaultsForm: '#roomDefaultsForm',
    roomDefaultsConfirmBtn: '#roomDefaultsConfirmBtn',
    roomDefaultsCancelBtn: '#roomDefaultsCancelBtn',
    
    // Force Apply Modal
    forceApplyModal: '#forceApplyModal',
    forceApplyConfirmBtn: '#forceApplyConfirmBtn',
    forceApplyForm: '#forceApplyForm',
    forceApplySelectedTypeDisplay: '#forceApplySelectedTypeDisplay',
    forceApplyTypeModal: '#forceApplyTypeModal',
    
    // Toast
    toast: '#toast',
    toastMessage: '#toastMessage'
};
