import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ModalActivosPageRoutingModule } from './modal-activos-routing.module';

import { ModalActivosPage } from './modal-activos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModalActivosPageRoutingModule
  ],
  declarations: [ModalActivosPage]
})
export class ModalActivosPageModule {}
