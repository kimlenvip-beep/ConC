// src/lib/documentGenerator.ts
// (ตามข้อ 8) แปลงเป็น .ts
import { SHOP_CONFIG, ITEM_CONFIG } from './config';
import { bahttext, fmt, fmtTH, sanitizeHTML, sanitizeForFilename, toNum } from './utils';
import { CALC } from './calculations';
import type { Payload, Room, Item, SetItemData, WallpaperItemData, AreaBasedItemData, Discount } from '../types';

// (TS) สร้าง-Type-สำหรับ-Options
interface PdfOptions {
    vatType: 'included' | 'excluded';
    showDetails: 'show' | 'hide';
    pageBreakLines: number;
}

interface Totals {
    subTotal: number;
    discountAmount: number;
    totalBeforeVat: number;
    vatAmount: number;
    grandTotal: number;
}

// (QoL) แยก-logic-การคำนวณราคารวมออกมา
function calculateTotals(payload: Payload): Totals {
    const subTotal = payload.rooms.reduce((roomSum, room) => {
        return roomSum + room.items.reduce((itemSum, item) => {
            return itemSum + CALC.calculateItemPrice(item);
        }, 0);
    }, 0);

    const discount: Discount = payload.discount || { type: 'amount', value: 0 };
    let discountAmount = 0;
    if (discount.type === 'percent') {
        discountAmount = (subTotal * toNum(discount.value)) / 100;
    } else {
        discountAmount = toNum(discount.value);
    }

    const totalAfterDiscount = subTotal - discountAmount;
    
    // (TS) คำนวณ-VAT-ตาม-options
    const vatRate = SHOP_CONFIG.baseVatRate;
    let totalBeforeVat = totalAfterDiscount;
    let vatAmount = 0;
    let grandTotal = totalAfterDiscount;
    
    // (Logic-จาก-pdfBtn.addEventListener)
    // นี่คือการคำนวณแบบ-Default-(Vat Included)-สำหรับ-Overview/Lookbook
    // ส่วน-generateQuotationHtml-จะคำนวณเองตาม-options
    totalBeforeVat = totalAfterDiscount / (1 + vatRate);
    vatAmount = totalAfterDiscount - totalBeforeVat;
    
    return { subTotal, discountAmount, totalBeforeVat, vatAmount, grandTotal };
}

// --- 1. SUMMARY TEXT (FOR LINE) ---

export function generateSummaryText(type: string, payload: Payload): string {
    let output = "";
    const { subTotal, discountAmount, grandTotal } = calculateTotals(payload);
    const customer = payload.customer_name || "ลูกค้า";

    const f = (val: number) => val.toLocaleString('th-TH'); // Format-แบบไม่มีทศนิยม

    output += `สรุป ${customer}\n`;
    output += `ที่อยู่: ${payload.customer_address || '-'}\n`;
    output += `โทร: ${payload.customer_phone || '-'}\n\n`;

    if (type === 'customer' || type === 'full') {
        payload.rooms.forEach(room => {
            if (room.is_suspended) return;
            let roomTotal = 0;
            output += `--- [${room.room_name || 'ห้อง'}] ---\n`;
            
            room.items.forEach((item, index) => {
                if (item.is_suspended) return;
                const price = CALC.calculateItemPrice(item);
                if (price <= 0) return;
                
                roomTotal += price;
                let itemName = ITEM_CONFIG[item.type]?.name || 'รายการ';
                
                if (type === 'full') {
                    // (Full)
                    output += `  ${index + 1}. ${itemName} (${item.width_m}x${item.height_m}) = ${f(price)} บ.\n`;
                } else {
                    // (Customer)
                    output += `  - ${itemName} = ${f(price)} บ.\n`;
                }
            });
            output += `  *รวม ${f(roomTotal)} บ.*\n\n`;
        });

        output += `---------------------\n`;
        output += `รวม ${f(subTotal)} บ.\n`;
        if (discountAmount > 0) {
            output += `ส่วนลด ${f(discountAmount)} บ.\n`;
            output += `สุทธิ ${f(grandTotal)} บ.\n`;
        }
        output += `(VAT 7% Included)\n`;
        
    } else if (type === 'sew' || type === 'order') {
        payload.rooms.forEach(room => {
            if (room.is_suspended) return;
            output += `--- [${room.room_name || 'ห้อง'}] ---\n`;
            
            room.items.forEach((item, index) => {
                if (item.is_suspended) return;
                
                let line = `${index + 1}. [${ITEM_CONFIG[item.type]?.name}] (ก${item.width_m} x ส${item.height_m})`;
                
                if (item.type === 'set') {
                    const set = item as SetItemData;
                    line += ` [${set.set_style}] [${set.fabric_variant}]`;
                    if (set.fabric_code) line += ` [ทึบ: ${set.fabric_code}]`;
                    if (set.sheer_fabric_code) line += ` [โปร่ง: ${set.sheer_fabric_code}]`;
                    if (type === 'order') {
                        // (Order)
                         const calc = CALC.calculateSetPrice(set);
                         line += ` (ค่าผ้า ${f(calc.material)} | ค่าราง ${f(calc.rail)})`;
                    }
                } 
                else if (item.type === 'wallpaper') {
                    const wp = item as WallpaperItemData;
                    const calc = CALC.calculateWallpaperPrice(wp);
                    line += ` [รหัส: ${wp.code}] (ใช้ ${calc.rolls} ม้วน)`;
                }
                else if (ITEM_CONFIG[item.type]) {
                    const area = item as AreaBasedItemData;
                    const calc = CALC.calculateAreaBasedPrice(area);
                    line += ` [รหัส: ${area.code}] (คำนวณ ${calc.sqyd.toFixed(2)} หลา)`;
                }
                
                if (item.notes) line += ` (Note: ${item.notes})`;
                output += line + '\n';
            });
            output += '\n';
        });
    }

    return output;
}

// --- 2. QUOTATION (PDF) ---

export function generateQuotationHtml(payload: Payload, options: PdfOptions): string {
    const { vatType, showDetails } = options;
    
    // (TS) คำนวณ-Totals-ใหม่-ตาม-VAT-Option
    const totals = calculateTotals(payload);
    let { subTotal, discountAmount, grandTotal } = totals;
    let totalBeforeVat, vatAmount;

    if (vatType === 'excluded') {
        totalBeforeVat = grandTotal;
        vatAmount = totalBeforeVat * SHOP_CONFIG.baseVatRate;
        grandTotal = totalBeforeVat + vatAmount;
    } else { // 'included'
        totalBeforeVat = grandTotal / (1 + SHOP_CONFIG.baseVatRate);
        vatAmount = grandTotal - totalBeforeVat;
    }

    // --- PDF Header ---
    const headerHtml = `
    <div class="pdf-header">
        ${SHOP_CONFIG.logoUrl ? `<img src="${SHOP_CONFIG.logoUrl}" alt="Logo" class="pdf-logo">` : ''}
        <div class="pdf-shop-info">
            <strong>${sanitizeHTML(SHOP_CONFIG.name)}</strong><br>
            ${sanitizeHTML(SHOP_CONFIG.address)}<br>
            ${sanitizeHTML(SHOP_CONFIG.phone)}<br>
            เลขประจำตัวผู้เสียภาษี: ${sanitizeHTML(SHOP_CONFIG.taxId)}
        </div>
        <div class="pdf-doc-title">
            <h1>ใบเสนอราคา</h1>
            <h2>Quotation</h2>
        </div>
    </div>
    <div class="pdf-customer-info">
        <div class="pdf-customer-details">
            <strong>ลูกค้า:</strong> ${sanitizeHTML(payload.customer_name) || '-'}<br>
            <strong>ที่อยู่:</strong> ${sanitizeHTML(payload.customer_address || '-').replace(/\n/g, '<br>')}<br>
            <strong>โทร:</strong> ${sanitizeHTML(payload.customer_phone) || '-'}
        </div>
        <div class="pdf-doc-meta">
            <strong>วันที่:</strong> ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
            <strong>ยืนราคา:</strong> ${sanitizeHTML(SHOP_CONFIG.pdf.priceValidity)}<br>
            <strong>เงื่อนไข:</strong> ${sanitizeHTML(SHOP_CONFIG.pdf.paymentTerms)}
        </div>
    </div>
    `;

    // --- PDF Table ---
    let tableRowsHtml = '';
    let runningIndex = 1;
    payload.rooms.forEach(room => {
        if (room.is_suspended) return;
        
        const roomItems = room.items.filter(item => !item.is_suspended && CALC.calculateItemPrice(item) > 0);
        if (roomItems.length === 0) return;

        // Room Header Row
        tableRowsHtml += `
        <tr class="row-room-header">
            <td colspan="5"><strong><i class="ph ph-map-pin"></i> ${sanitizeHTML(room.room_name) || 'ห้อง'}</strong></td>
        </tr>`;

        roomItems.forEach(item => {
            const itemPrice = CALC.calculateItemPrice(item);
            let itemName = ITEM_CONFIG[item.type]?.name || 'รายการ';
            let detailsHtml = '';

            if (showDetails === 'show') {
                detailsHtml += `(ก ${fmt(item.width_m)} x ส ${fmt(item.height_m)} ม.)`;
                if (item.type === 'set') {
                    const set = item as SetItemData;
                    detailsHtml += ` [${set.set_style}] [${set.fabric_variant}]`;
                    if (set.fabric_code) detailsHtml += ` [ทึบ: ${sanitizeHTML(set.fabric_code)}]`;
                    if (set.sheer_fabric_code) detailsHtml += ` [โปร่ง: ${sanitizeHTML(set.sheer_fabric_code)}]`;
                } else if (item.type === 'wallpaper') {
                    const wp = item as WallpaperItemData;
                    const calc = CALC.calculateWallpaperPrice(wp);
                    detailsHtml += ` [${sanitizeHTML(wp.code)}] (ใช้ ${calc.rolls} ม้วน)`;
                } else if (ITEM_CONFIG[item.type]) {
                    const area = item as AreaBasedItemData;
                    detailsHtml += ` [${sanitizeHTML(area.code)}]`;
                }
                if (item.notes) detailsHtml += `<br><small><i>โน้ต: ${sanitizeHTML(item.notes)}</i></small>`;
            }

            tableRowsHtml += `
            <tr class="row-item">
                <td class="col-center">${runningIndex++}</td>
                <td>
                    ${sanitizeHTML(itemName)}
                    ${showDetails === 'show' ? `<div class="item-details">${detailsHtml}</div>` : ''}
                </td>
                <td class="col-center">1</td>
                <td class="col-center">ชุด</td>
                <td class="col-right">${fmtTH(itemPrice)}</td>
            </tr>`;
        });
    });

    const tableHtml = `
    <table class="pdf-table">
        <thead>
            <tr>
                <th class="col-center" style="width: 8%;">ลำดับ</th>
                <th style="width: 52%;">รายการ</th>
                <th class="col-center" style="width: 12%;">จำนวน</th>
                <th class="col-center" style="width: 12%;">หน่วย</th>
                <th class="col-right" style="width: 16%;">ราคา/หน่วย</th>
            </tr>
        </thead>
        <tbody>
            ${tableRowsHtml}
        </tbody>
    </table>`;

    // --- PDF Footer & Totals ---
    const totalsHtml = `
    <div class="pdf-totals">
        <div class="pdf-notes">
            <strong>หมายเหตุ:</strong><br>
            ${SHOP_CONFIG.pdf.notes.map(note => `<span>- ${sanitizeHTML(note)}</span>`).join('<br>')}
            <br><br>
            <strong>โอนเงิน:</strong> ${sanitizeHTML(SHOP_CONFIG.pdf.bank.name)}<br>
            <strong>เลขที่:</strong> ${sanitizeHTML(SHOP_CONFIG.pdf.bank.account)}<br>
            <strong>ชื่อ:</strong> ${sanitizeHTML(SHOP_CONFIG.pdf.bank.holder)}
        </div>
        <div class="pdf-summary">
            <div class="summary-row">
                <span>รวมเป็นเงิน (Subtotal)</span>
                <span>${fmtTH(subTotal)}</span>
            </div>
            ${discountAmount > 0 ? `
            <div class="summary-row">
                <span>ส่วนลด (Discount)</span>
                <span>-${fmtTH(discountAmount)}</span>
            </div>` : ''}
            <div class="summary-row">
                <span>ยอดรวมหลังส่วนลด</span>
                <span>${fmtTH(totals.totalAfterDiscount)}</span>
            </div>
            ${vatType === 'excluded' ? `
            <div class="summary-row">
                <span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                <span>${fmtTH(vatAmount)}</span>
            </div>
            <div class="summary-row total">
                <span>ยอดรวมสุทธิ (Grand Total)</span>
                <span>${fmtTH(grandTotal)}</span>
            </div>
            ` : `
            <div class="summary-row">
                <span>(มูลค่าก่อนภาษี)</span>
                <span>(${fmtTH(totalBeforeVat)})</span>
            </div>
            <div class="summary-row">
                <span>(ภาษีมูลค่าเพิ่ม 7%)</span>
                <span>(${fmtTH(vatAmount)})</span>
            </div>
            <div class="summary-row total">
                <span>ยอดรวมสุทธิ (ราคารวมภาษี)</span>
                <span>${fmtTH(grandTotal)}</span>
            </div>
            `}
            <div class="summary-row baht-text">
                (${bahttext(grandTotal)})
            </div>
        </div>
    </div>
    <div class="pdf-signatures">
        <div class="sig-box">
            ...................................<br>
            ( ${sanitizeHTML(payload.customer_name) || '...................................'} )<br>
            ผู้อนุมัติซื้อ
        </div>
        <div class="sig-box">
            ...................................<br>
            ( ศิริขวัญ นาคะเสถียร )<br>
            ผู้เสนอราคา
        </div>
    </div>`;
    
    const pageFooterHtml = `
    <div class="pdf-page-footer">
        <span>ขอบคุณที่ไว้วางใจในบริการของเรา</span>
        <span>${sanitizeHTML(SHOP_CONFIG.name)}</span>
    </div>`;

    // --- Page Splitting Logic (QoL) ---
    // สร้าง-DOM-ชั่วคราวเพื่อวัดความสูง
    const measurementDiv = document.createElement('div');
    measurementDiv.innerHTML = `<div id="quotation-template">${headerHtml}${tableHtml}${totalsHtml}</div>`;
    measurementDiv.style.position = 'absolute';
    measurementDiv.style.left = '-9999px';
    measurementDiv.style.width = '210mm';
    document.body.appendChild(measurementDiv);

    const A4_CONTENT_HEIGHT_MM = 297 - 12 - 20; // (สูง-ลบ-padding-top/bottom)
    const MM_TO_PX = 3.78;
    const MAX_PAGE_HEIGHT_PX = A4_CONTENT_HEIGHT_MM * MM_TO_PX;
    const HEADER_HEIGHT_PX = measurementDiv.querySelector<HTMLElement>('.pdf-header')!.offsetHeight + measurementDiv.querySelector<HTMLElement>('.pdf-customer-info')!.offsetHeight;
    const TOTALS_HEIGHT_PX = measurementDiv.querySelector<HTMLElement>('.pdf-totals')!.offsetHeight + measurementDiv.querySelector<HTMLElement>('.pdf-signatures')!.offsetHeight;
    const TABLE_HEADER_HEIGHT_PX = measurementDiv.querySelector<HTMLElement>('.pdf-table thead')!.offsetHeight;
    
    const MAX_TABLE_HEIGHT_PAGE_1 = MAX_PAGE_HEIGHT_PX - HEADER_HEIGHT_PX - TOTALS_HEIGHT_PX - TABLE_HEADER_HEIGHT_PX;
    const MAX_TABLE_HEIGHT_SUBSEQUENT = MAX_PAGE_HEIGHT_PX - HEADER_HEIGHT_PX - TOTALS_HEIGHT_PX - TABLE_HEADER_HEIGHT_PX; // (เผื่อ-header-ใหม่)

    const rows = Array.from(measurementDiv.querySelectorAll('.pdf-table tbody tr'));
    let pagesHtml = '';
    let currentPageRows: Element[] = [];
    let currentPageHeight = 0;
    let isFirstPage = true;

    const createPage = (rowsHtml: string, isLastPage: boolean) => {
        return `
        <div class="pdf-page">
            <div class="pdf-page-content">
                ${headerHtml}
                <table class="pdf-table">
                    <thead>
                        <tr>
                            <th class="col-center" style="width: 8%;">ลำดับ</th>
                            <th style="width: 52%;">รายการ</th>
                            <th class="col-center" style="width: 12%;">จำนวน</th>
                            <th class="col-center" style="width: 12%;">หน่วย</th>
                            <th class="col-right" style="width: 16%;">ราคา/หน่วย</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
                ${isLastPage ? totalsHtml : ''}
            </div>
            ${pageFooterHtml}
        </div>`;
    };

    const maxLines = options.pageBreakLines > 0 ? options.pageBreakLines : 2;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowHeight = (row as HTMLElement).offsetHeight;
        const MAX_TABLE_HEIGHT = isFirstPage ? MAX_TABLE_HEIGHT_PAGE_1 : MAX_TABLE_HEIGHT_SUBSEQUENT;

        // (QoL Page Break Logic)
        const remainingRows = rows.length - i;
        const forceBreak = (currentPageHeight + rowHeight > MAX_TABLE_HEIGHT) && (remainingRows <= maxLines);

        if ((currentPageHeight + rowHeight > MAX_TABLE_HEIGHT) || forceBreak) {
            // End current page
            pagesHtml += createPage(currentPageRows.map(r => r.outerHTML).join(''), false);
            currentPageRows = [row];
            currentPageHeight = rowHeight;
            isFirstPage = false;
        } else {
            currentPageRows.push(row);
            currentPageHeight += rowHeight;
        }
    }
    
    // Add the last page
    pagesHtml += createPage(currentPageRows.map(r => r.outerHTML).join(''), true);

    document.body.removeChild(measurementDiv);
    return `<div id="quotation-template">${pagesHtml}</div>`;
}


// --- 3. OVERVIEW MODAL ---

export function generateOverviewHtml(payload: Payload): string {
    const { subTotal, discountAmount, grandTotal, vatAmount } = calculateTotals(payload);
    let html = '<div class="overview-container">';

    let hasPricedItems = false;
    
    payload.rooms.forEach(room => {
        if (room.is_suspended) return;
        const roomTotal = room.items.reduce((sum, item) => sum + CALC.calculateItemPrice(item), 0);
        if (roomTotal <= 0) return; // ข้ามห้องที่ไม่มีราคา

        hasPricedItems = true;
        html += `
        <details class="overview-room" open>
            <summary>
                <span class="overview-room-name"><i class="ph ph-map-pin"></i> ${sanitizeHTML(room.room_name) || 'ห้อง'}</span>
                <span class="overview-room-total">${fmtTH(roomTotal)}</span>
            </summary>
            <div class="overview-item-list">
        `;
        
        room.items.forEach((item, index) => {
            if (item.is_suspended) return;
            const itemPrice = CALC.calculateItemPrice(item);
            if (itemPrice <= 0) return; // ข้ามรายการที่ไม่มีราคา

            let itemName = ITEM_CONFIG[item.type]?.name || 'รายการ';
            let itemDetails = `(ก ${fmt(item.width_m)} x ส ${fmt(item.height_m)})`;

            html += `
            <div class="overview-item" data-room-id="${room.id}" data-item-index="${index}">
                <span class="overview-item-name">${index + 1}. ${sanitizeHTML(itemName)}</span>
                <span class="overview-item-details">${sanitizeHTML(itemDetails)}</span>
                <span class="overview-item-price">${fmtTH(itemPrice)}</span>
            </div>`;
        });
        
        html += `</div></details>`;
    });

    if (!hasPricedItems) {
        return `<p class="empty-summary">ไม่มีรายการสำหรับสรุปยอด (ลองตรวจสอบว่าป้อนราคาครบถ้วนหรือไม่)</p>`;
    }

    html += '</div>'; // close container
    
    // Add totals summary
    html += `
    <div class="overview-totals">
        <div class="summary-row">
            <span>รวม</span>
            <span>${fmtTH(subTotal)}</span>
        </div>
        ${discountAmount > 0 ? `
        <div class="summary-row discount">
            <span>ส่วนลด</span>
            <span>-${fmtTH(discountAmount)}</span>
        </div>` : ''}
        <div class="summary-row total">
            <span>ยอดสุทธิ (รวม VAT)</span>
            <span>${fmtTH(grandTotal)}</span>
        </div>
        <div class="summary-row vat-note">
            <span>(VAT 7% ที่รวมอยู่: ${fmtTH(vatAmount)})</span>
        </div>
    </div>`;

    return html;
}

// --- 4. LOOK BOOK / IMAGE REPORTS (QoL) ---

function _getSvgFrame(dimensions: { width: number; height: number }): { svgW: number; svgH: number; objW: number; objH: number; x: number; y: number; lines: string; } {
    const { width = 0, height = 0 } = dimensions;
    const PADDING = 15;
    const MAX_W = 100 - PADDING * 2;
    const MAX_H = 100 - PADDING * 2;

    const scale = (width > 0 && height > 0) ? Math.min(MAX_W / width, MAX_H / height) : 1;
    const objW = width * scale;
    const objH = height * scale;
    
    const svgW = 100;
    const svgH = 100;
    
    const x = (svgW - objW) / 2;
    const y = (svgH - objH) / 2;

    // Dimension lines
    const lines = `
        <line class="dimension-line" x1="${x}" y1="${y - PADDING/2}" x2="${x + objW}" y2="${y - PADDING/2}"></line>
        <line class="dimension-tick" x1="${x}" y1="${y - PADDING/2 - 3}" x2="${x}" y2="${y - PADDING/2 + 3}"></line>
        <line class="dimension-tick" x1="${x + objW}" y1="${y - PADDING/2 - 3}" x2="${x + objW}" y2="${y - PADDING/2 + 3}"></line>
        <text class="dimension-text" x="${svgW/2}" y="${y - PADDING/2 - 5}">${fmt(width)} ม.</text>
        
        <line class="dimension-line" x1="${x + objW + PADDING/2}" y1="${y}" x2="${x + objW + PADDING/2}" y2="${y + objH}"></line>
        <line class="dimension-tick" x1="${x + objW + PADDING/2 - 3}" y1="${y}" x2="${x + objW + PADDING/2 + 3}" y2="${y}"></line>
        <line class="dimension-tick" x1="${x + objW + PADDING/2 - 3}" y1="${y + objH}" x2="${x + objW + PADDING/2 + 3}" y2="${y + objH}"></line>
        <text class="dimension-text" x="${x + objW + PADDING/2 + 8}" y="${svgH/2}" writing-mode="vertical-rl" transform="rotate(180, ${x + objW + PADDING/2 + 8}, ${svgH/2})">${fmt(height)} ม.</text>
    `;
    
    return { svgW, svgH, objW, objH, x, y, lines };
}

function _generateVisual(item: Item): string {
    const { width = 0, height = 0 } = item;
    if (width <= 0 || height <= 0) {
        return `<div class="visual-placeholder"><svg viewBox="0 0 100 100"><text x="50" y="50" class="fallback-text">ระบุขนาด</text></svg></div>`;
    }
    
    const { svgW, svgH, objW, objH, x, y, lines } = _getSvgFrame({ width, height });
    let itemSvg = '';
    let openingIndicator = '';

    // (TS) ตรวจสอบ-Type-เพื่อสร้าง-SVG
    if (item.type === 'set') {
        const set = item as SetItemData;
        const isSplit = set.opening_style === 'แยกกลาง';
        const panelW = isSplit ? objW / 2 : objW;
        
        if (set.fabric_variant === 'ทึบ & โปร่ง' || set.fabric_variant === 'โปร่ง') {
            itemSvg += `<rect class="curtain-panel-sheer" x="${x}" y="${y}" width="${objW}" height="${objH}"></rect>`;
        }
        if (set.fabric_variant === 'ทึบ & โปร่ง' || set.fabric_variant === 'ทึบ') {
            itemSvg += `<rect class="curtain-panel-opaque" x="${x}" y="${y}" width="${panelW}" height="${objH}"></rect>`;
            if (isSplit) {
                itemSvg += `<rect class="curtain-panel-opaque" x="${x + panelW}" y="${y}" width="${panelW}" height="${objH}"></rect>`;
            }
        }
        openingIndicator = `<text class="opening-text" x="${svgW/2}" y="${y + objH + 10}">${isSplit ? 'แยกกลาง' : 'เก็บข้าง'}</text>`;

    } else if (item.type === 'wallpaper') {
        itemSvg = `<rect x="${x}" y="${y}" width="${objW}" height="${objH}" fill="url(#wallpaper-pattern)"></rect>`;
    
    } else if (ITEM_CONFIG[item.type]) { // AreaBased
        const area = item as AreaBasedItemData;
        const isSplit = area.opening_style === 'แยกกลาง';
        itemSvg = `<rect class="item-visual-fill" x="${x}" y="${y}" width="${objW}" height="${objH}"></rect>`;
        if (area.opening_style) {
             openingIndicator = `<text class="opening-text" x="${svgW/2}" y="${y + objH + 10}">${isSplit ? 'แยกกลาง' : 'เก็บข้าง'}</text>`;
        }
    }

    return `
    <div class="visual-placeholder">
        <svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet">
            <defs>
                <pattern id="wallpaper-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
                    <path class="wallpaper-pattern" d="M0 0 H6 M0 3 H6 M3 3 V6 M3 0 V3" stroke-width="0.5"></path>
                </pattern>
            </defs>
            <rect class="visual-bg" x="0" y="0" width="${svgW}" height="${svgH}"></rect>
            ${itemSvg}
            <rect class="visual-frame" x="${x}" y="${y}" width="${objW}" height="${objH}"></rect>
            ${lines}
            ${openingIndicator}
        </svg>
    </div>`;
}

export function generateLookBookModalHtml(payload: Payload, type: string): string {
    const { grandTotal } = calculateTotals(payload);
    let hasPricedItems = false;
    
    const roomsHtml = payload.rooms.map(room => {
        if (room.is_suspended) return '';
        
        const itemsHtml = room.items.map((item, index) => {
            if (item.is_suspended) return '';
            const itemPrice = CALC.calculateItemPrice(item);
            if (itemPrice <= 0) return '';
            
            hasPricedItems = true;
            let itemName = ITEM_CONFIG[item.type]?.name || 'รายการ';
            let specHtml = '';

            // (TS) สร้าง-spec-ตาม-Type
            if (item.type === 'set') {
                const set = item as SetItemData;
                specHtml = `
                    <tr><td>รูปแบบ</td><td>${sanitizeHTML(set.set_style)}</td></tr>
                    <tr><td>ชนิดผ้า</td><td>${sanitizeHTML(set.fabric_variant)}</td></tr>
                    ${set.fabric_code ? `<tr><td>ผ้าทึบ</td><td>${sanitizeHTML(set.fabric_code)} (${fmtTH(set.price_per_m_raw)})</td></tr>` : ''}
                    ${set.sheer_fabric_code ? `<tr><td>ผ้าโปร่ง</td><td>${sanitizeHTML(set.sheer_fabric_code)} (${fmtTH(set.sheer_price_per_m)})</td></tr>` : ''}
                `;
            } else if (item.type === 'wallpaper') {
                const wp = item as WallpaperItemData;
                const calc = CALC.calculateWallpaperPrice(wp);
                specHtml = `
                    <tr><td>รหัส</td><td>${sanitizeHTML(wp.code)}</td></tr>
                    <tr><td>ราคา</td><td>${fmtTH(wp.price_per_roll)} / ม้วน</td></tr>
                    <tr><td>จำนวน</td><td>${calc.rolls} ม้วน</td></tr>
                `;
            } else if (ITEM_CONFIG[item.type]) {
                const area = item as AreaBasedItemData;
                specHtml = `
                    <tr><td>รหัส</td><td>${sanitizeHTML(area.code)}</td></tr>
                    <tr><td>ราคา</td><td>${fmtTH(area.price_sqyd)} / หลา</td></tr>
                `;
            }
            
            const dimensionRow = `<tr><td>ขนาด</td><td>${fmt(item.width_m)} x ${fmt(item.height_m)} ม.</td></tr>`;

            return `
                <div class="lookbook-item" data-room-id="${room.id}" data-item-index="${index}">
                    <div class="lookbook-item-visual">
                        ${_generateVisual(item)}
                    </div>
                    <div class="lookbook-item-details">
                        <div class="lookbook-item-header">
                            <span class="lookbook-item-title">${index + 1}. ${sanitizeHTML(itemName)}</span>
                            <span class="lookbook-item-price">${fmtTH(itemPrice)}</span>
                        </div>
                        <table class="lookbook-spec-table">
                            ${specHtml}
                            ${dimensionRow}
                            ${item.notes ? `<tr><td>โน้ต</td><td>${sanitizeHTML(item.notes)}</td></tr>` : ''}
                        </table>
                    </div>
                </div>
            `;
        }).join('<hr class="lookbook-hr">');

        if (!itemsHtml.trim()) return '';

        return `
            <div class="lookbook-room">
                <h4><i class="ph ph-map-pin"></i> ${sanitizeHTML(room.room_name) || 'ไม่ระบุชื่อห้อง'}</h4>
                ${itemsHtml}
            </div>
        `;
    }).join('');

    if (!hasPricedItems) {
        return `<p class="empty-summary">ไม่มีรายการสำหรับสร้างรายงาน</p>`;
    }

    const summaryHtml = `
        <div class="lookbook-summary">
            <div class="lookbook-customer-info">
                <strong>ลูกค้า:</strong> ${sanitizeHTML(payload.customer_name) || '-'}<br/>
                <strong>ที่อยู่:</strong> ${sanitizeHTML(payload.customer_address || '-').replace(/\n/g, '<br/>')}
            </div>
            <div class="lookbook-totals">
                <span class="grand-total">ยอดสุทธิ (รวม VAT): ${fmtTH(grandTotal)} บาท</span>
            </div>
        </div>
    `;

    return `<div id="lookbook-report">${summaryHtml}${roomsHtml}</div>`;
}
