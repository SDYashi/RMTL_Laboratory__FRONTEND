import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appBarcodeListener]'
})
export class BarcodeListenerDirective {
  @Output() barcodeScanned = new EventEmitter<string>();

  private buffer = '';
  private lastTime = 0;
  private firstTime = 0;
  private readonly interKeyTimeoutMs = 180;
  private readonly minCodeLength = 3;
  private readonly maxScanDurationMs = 4000;

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;

    const now = Date.now();
    if (!this.lastTime || now - this.lastTime > this.interKeyTimeoutMs) {
      this.buffer = '';
      this.firstTime = now;
    }
    this.lastTime = now;

    if (event.key === 'Enter' || event.key === 'Tab') {
      const value = this.buffer.trim();
      const duration = now - this.firstTime;
      this.buffer = '';
      this.lastTime = 0;
      this.firstTime = 0;

      if (value.length >= this.minCodeLength && duration <= this.maxScanDurationMs) {
        event.preventDefault();
        this.barcodeScanned.emit(value);
      }
      return;
    }

    if (event.key === 'Escape') {
      this.buffer = '';
      this.lastTime = 0;
      this.firstTime = 0;
      return;
    }

    if (event.key.length === 1) this.buffer += event.key;
  }
}
