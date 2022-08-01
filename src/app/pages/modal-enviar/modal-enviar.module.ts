import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ModalEnviarPageRoutingModule } from './modal-enviar-routing.module';

import { ModalEnviarPage } from './modal-enviar.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModalEnviarPageRoutingModule
  ],
  declarations: [ModalEnviarPage]
})
export class ModalEnviarPageModule {}
