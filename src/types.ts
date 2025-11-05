// src/types.ts
// (ตามข้อ 6) นี่คือไฟล์สถาปัตยกรรมใหม่สำหรับ Type ทั้งหมด
// QoL & HIG: การมี-Type-ที่เข้มงวดช่วยป้องกันข้อผิดพลาดในการคำนวณและ-UI

// --- CONFIG TYPES ---
export interface ItemConfig {
  name: string;
  className: string;
  // เพิ่ม-props-อื่นๆ-ตามต้องการ
}

export interface ShopConfig {
  name: string;
  address: string;
  phone: string;
  taxId: string;
  logoUrl: string;
  baseVatRate: number;
  pdf: {
    paymentTerms: string;
    priceValidity: string;
    notes: string[];
    bank: {
      name: string;
      account: string;
      holder: string;
    };
  };
}

// --- DATA MODEL TYPES ---
export interface Customer {
  name: string;
  phone: string;
  address: string;
}

export interface Discount {
  type: 'amount' | 'percent';
  value: number;
}

export interface BaseItem {
  id: string;
  type: string;
  is_suspended: boolean;
  width_m: number;
  height_m: number;
  notes: string;
  // เพิ่ม-props-ที่ใช้ร่วมกัน
}

export interface SetItemData extends BaseItem {
  type: 'set';
  set_style: 'ลอน' | 'ตาไก่' | 'จีบ' | 'ม่านพับ' | 'ม่านแป๊บ' | 'หลุยส์';
  fabric_variant: 'ทึบ' | 'ทึบ & โปร่ง' | 'โปร่ง';
  price_per_m_raw: number;
  fabric_code: string;
  sheer_price_per_m: number;
  sheer_fabric_code: string;
  louis_price_per_m: number;
  opening_style: 'แยกกลาง' | 'เก็บข้างเดียว';
  adjustment_side: 'ปรับขวา' | 'ปรับซ้าย';
  // Hardware
  track_color: string;
  bracket_color: string;
  finial_color: string;
  grommet_color: string;
  louis_valance: string;
  louis_tassels: string;
}

export interface WallpaperItemData extends BaseItem {
  type: 'wallpaper';
  widths: number[];
  price_per_roll: number;
  install_cost_per_roll: number;
  code: string;
}

export interface AreaBasedItemData extends BaseItem {
  type: 'wooden_blind' | 'roller_blind' | 'vertical_blind' | 'partition' | 'pleated_screen' | 'aluminum_blind';
  price_sqyd: number;
  code: string;
  // Dynamic fields
  opening_style?: 'แยกกลาง' | 'เก็บข้างเดียว';
  adjustment_side?: 'ปรับขวา' | 'ปรับซ้าย';
}

export interface PlaceholderItemData {
  id: string;
  type: 'placeholder';
  is_suspended: boolean;
  width_m: number;
  height_m: number;
  // (QoL) เก็บ-dimensions-ที่ผู้ใช้ป้อนไว้ก่อนเลือก-type
}

// Union type-สำหรับ-item-ทั้งหมด
export type Item = SetItemData | WallpaperItemData | AreaBasedItemData | PlaceholderItemData;

export interface RoomDefaults {
  // กำหนด-type-สำหรับ-room_defaults-ที่นี่
  [key: string]: any; // Placeholder
}

export interface Room {
  id: string;
  room_name: string;
  is_suspended: boolean;
  is_open: boolean;
  room_defaults: RoomDefaults;
  items: Item[];
}

export interface FavoriteItem {
  code: string;
  price: number;
}

export interface Favorites {
  [key: string]: FavoriteItem[];
  fabric: FavoriteItem[];
  sheer: FavoriteItem[];
  wallpaper: FavoriteItem[];
  wooden_blind: FavoriteItem[];
  roller_blind: FavoriteItem[];
  vertical_blind: FavoriteItem[];
  partition: FavoriteItem[];
  pleated_screen: FavoriteItem[];
  aluminum_blind: FavoriteItem[];
}

// --- PAYLOAD (STATE) ---
export interface Payload {
  app_version: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_card_open: boolean;
  discount: Discount;
  rooms: Room[];
  favorites: Favorites;
}
