// src/lib/utils.ts
export const toNum = (v: any): number => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'string') {
        v = v.replace(/,/g, '').trim();
        if (v === '') return 0;
    }
    const num = parseFloat(v);
    return Number.isFinite(num) ? num : 0;
};

export const fmt = (v: any): string => toNum(v).toFixed(2);

export const fmtTH = (v: any): string => {
    const num = toNum(v);
    try {
        return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
        return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
};

export const debounce = <T extends (...args: any[]) => void>(func: T, delay = 300) => {
    let id: number | undefined;
    return (...args: Parameters<T>) => {
        if (id !== undefined) clearTimeout(id);
        id = window.setTimeout(() => func(...args), delay);
    };
};

export const throttle = <T extends (...args: any[]) => void>(fn: T, limit = 250) => {
    let waiting = false;
    let lastArgs: any[] | null = null;
    return (...args: any[]) => {
        if (!waiting) {
            fn(...(args as Parameters<T>));
            waiting = true;
            setTimeout(() => {
                waiting = false;
                if (lastArgs) { fn(...(lastArgs as Parameters<T>)); lastArgs = null; }
            }, limit);
        } else {
            lastArgs = args;
        }
    };
};

export const sanitizeHTML = (s: string | null | undefined): string => {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
};

export const sanitizeForFilename = (str: string): string => {
    if (!str) return 'file';
    return str.replace(/[^a-z0-9\u0E00-\u0E7F._-]/gi, '_').substring(0, 100).trim().replace(/^\.+|\.+$/g, '').replace(/_{2,}/g, '_');
};

const TxtNumArr = ["ศูนย์","หนึ่ง","สอง","สาม","สี่","ห้า","หก","เจ็ด","แปด","เก้า"];
const TxtDigitArr = ["","สิบ","ร้อย","พัน","หมื่น","แสน","ล้าน"];

export const bahttext = (v: any): string => {
    let n = toNum(v);
    if (n === 0) return "ศูนย์บาทถ้วน";
    n = parseFloat(n.toFixed(2));
    const i = Math.floor(n);
    const d = Math.round((n - i) * 100);
    const read = (num: number) => {
        if (num === 0) return '';
        const s = String(num);
        let out = '';
        for (let idx = 0; idx < s.length; idx++) {
            const digit = s[idx];
            const pos = s.length - idx - 1;
            if (digit === '0') continue;
            if (pos === 1 && digit === '1') out += TxtDigitArr[pos];
            else if (pos === 1 && digit === '2') out += 'ยี่' + TxtDigitArr[pos];
            else if (pos === 0 && digit === '1' && s.length > 1) out += 'เอ็ด';
            else out += TxtNumArr[parseInt(digit)] + TxtDigitArr[pos];
        }
        return out;
    };
    let res = '';
    if (i > 0) {
        const millions = Math.floor(i / 1000000);
        const rest = i % 1000000;
        if (millions > 0) res += read(millions) + 'ล้าน';
        res += read(rest) + 'บาท';
    }
    if (d > 0) res += read(d) + 'สตางค์'; else res += 'ถ้วน';
    return res;
};

/**
 * Convert centimeters input to meters on blur; writes to target input if provided.
 */
export const handleCmToMBlur = (
    source: Event | HTMLInputElement,
    target?: HTMLInputElement | string
): void => {
    let inputEl: HTMLInputElement | null = null;
    if (source instanceof Event) {
        const t = source.target as HTMLElement | null;
        if (!t) return;
        if ((t as HTMLInputElement).value !== undefined) inputEl = t as HTMLInputElement;
        else return;
    } else if (source instanceof HTMLInputElement) inputEl = source;
    else return;

    const cm = toNum(inputEl.value);
    if (cm <= 0) {
        if (target) {
            if (typeof target === 'string') {
                const el = document.querySelector<HTMLInputElement>(target);
                if (el) el.value = '';
            } else target.value = '';
        } else {
            const sib = inputEl.parentElement?.querySelector<HTMLInputElement>('input[data-unit="m"], input.m, input.meters');
            if (sib) sib.value = '';
        }
        return;
    }
    const m = (cm / 100).toFixed(2);
    if (target) {
        if (typeof target === 'string') {
            const el = document.querySelector<HTMLInputElement>(target);
            if (el) el.value = m;
        } else target.value = m;
    } else {
        const dataTarget = inputEl.getAttribute('data-target');
        if (dataTarget) {
            const el = document.querySelector<HTMLInputElement>(dataTarget);
            if (el) el.value = m;
            return;
        }
        const sibling = inputEl.parentElement?.querySelector<HTMLInputElement>('input[data-unit="m"], input.m, input.meters') || inputEl.nextElementSibling as (HTMLInputElement | null);
        if (sibling && sibling.tagName.toLowerCase() === 'input') {
            sibling.value = m;
        }
    }
};