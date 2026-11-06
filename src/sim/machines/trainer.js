// L01 — Bàn thực hành PLC: nút nhấn, công tắc, đèn, còi, cảm biến tiệm cận PNP và cảm biến quang
import { Machine } from '../kit.js';

export class Trainer extends Machine {
  constructor() {
    super({
      id: 'trainer',
      title: 'Bàn thực hành PLC (nút – đèn – cảm biến)',
      summary: 'Bàn trainer S7-1200: 3 nút nhấn (S3 là nút NC), công tắc xoay, 4 đèn, còi, cảm biến tiệm cận điện cảm PNP và cảm biến quang thu–phát. Dùng để làm quen địa chỉ I/O và logic bit.',
      labs: ['L01'],
      ioMap: {
        inputs: [
          { addr: '%I0.5', tag: 'S1', desc: 'Nút S1 xanh (NO)' },
          { addr: '%I0.6', tag: 'S2', desc: 'Nút S2 xanh (NO)' },
          { addr: '%I0.7', tag: 'S3', desc: 'Nút S3 đỏ (NC — bình thường = 1, nhấn = 0)' },
          { addr: '%I1.0', tag: 'SW1', desc: 'Công tắc xoay SW1 (1 = vị trí phải)' },
          { addr: '%I1.1', tag: 'PRX', desc: 'Cảm biến tiệm cận điện cảm PNP (1 = có kim loại)' },
          { addr: '%I1.2', tag: 'PE', desc: 'Cảm biến quang thu–phát, Dark-On (1 = tia bị chắn)' },
        ],
        outputs: [
          { addr: '%Q0.2', tag: 'H1', desc: 'Đèn H1 đỏ' },
          { addr: '%Q0.3', tag: 'H2', desc: 'Đèn H2 vàng' },
          { addr: '%Q0.4', tag: 'H3', desc: 'Đèn H3 xanh lá' },
          { addr: '%Q0.5', tag: 'H4', desc: 'Đèn H4 xanh dương' },
          { addr: '%Q0.6', tag: 'BUZ', desc: 'Còi' },
        ],
      },
      buttons: [
        { id: 'S1', label: 'S1', kind: 'momentary', color: 'green' },
        { id: 'S2', label: 'S2', kind: 'momentary', color: 'green' },
        { id: 'S3', label: 'S3 (NC)', kind: 'momentary', color: 'red', nc: true },
        { id: 'SW1', label: 'SW1', kind: 'selector', color: 'black' },
        { id: 'Metal', label: 'Đưa kim loại vào cảm biến', kind: 'latching', color: 'grey' },
        { id: 'Block', label: 'Che cảm biến quang', kind: 'latching', color: 'grey' },
        { id: 'NPN', label: 'Thay bằng cảm biến NPN', kind: 'latching', color: 'grey' },
      ],
      faults: [
        { id: 'lampH3', label: 'Bóng đèn H3 bị cháy' },
        { id: 'wireS2', label: 'Đứt dây nút S2' },
      ],
      panelDefaults: { S1: false, S2: false, S3: false, SW1: false, Metal: false, Block: false, NPN: false },
    });
    this.init();
  }

  init() { this.warnedNpn = false; this.history = []; }

  physics() {
    const p = this.panel;
    this.inputs.S1 = p.S1;
    this.inputs.S2 = this.faults.wireS2 ? false : p.S2;
    this.inputs.S3 = !p.S3;
    this.inputs.SW1 = p.SW1;
    // Thẻ DI của S7-1200 đấu kiểu sink (chân 1M nối 0 V): chỉ nhận cảm biến PNP (sourcing).
    if (p.NPN && p.Metal && !this.warnedNpn) { this.warnedNpn = true; this.log('Cảm biến NPN đấu vào ngõ vào kiểu sink (1M = 0 V): PLC không nhận được tín hiệu. Đèn trên cảm biến vẫn sáng!', 'warn'); }
    if (!p.NPN) this.warnedNpn = false;
    this.inputs.PRX = p.Metal && !p.NPN;
    this.inputs.PE = p.Block;
  }

  visualParts() {
    const parts = this.visualBase();
    parts.target_metal = this.panel.Metal ? 1 : 0;
    parts.blocker = this.panel.Block ? 1 : 0;
    return parts;
  }

  getVisual() {
    const v = super.getVisual();
    if (this.faults.lampH3) v.outs.H3 = false;
    v.leds.PRX = this.panel.Metal;            // đèn trên thân cảm biến luôn sáng khi có kim loại (kể cả NPN)
    return v;
  }
}
