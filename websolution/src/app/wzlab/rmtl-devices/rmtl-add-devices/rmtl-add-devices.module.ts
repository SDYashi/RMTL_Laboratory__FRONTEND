import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAddDevicesRoutingModule } from './rmtl-add-devices-routing.module';
import { RmtlAddDevicesComponent } from './rmtl-add-devices/rmtl-add-devices.component';
import { FormsModule } from '@angular/forms';
import { BarcodeListenerDirective } from 'src/app/shared/directives/barcode-listener.directive';


@NgModule({
  declarations: [
    RmtlAddDevicesComponent,
    BarcodeListenerDirective
  ],
  imports: [
    CommonModule,
    RmtlAddDevicesRoutingModule,
    FormsModule
  ]
})
export class RmtlAddDevicesModule { }
