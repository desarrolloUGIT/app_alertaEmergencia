import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ModalCaminosPageRoutingModule } from './modal-caminos-routing.module';

import { ModalCaminosPage } from './modal-caminos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModalCaminosPageRoutingModule
  ],
  declarations: [ModalCaminosPage]
})
export class ModalCaminosPageModule {}
