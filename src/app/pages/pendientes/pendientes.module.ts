import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PendientesPageRoutingModule } from './pendientes-routing.module';

import { PendientesPage } from './pendientes.page';
import { ModalEnviarPageModule } from '../modal-enviar/modal-enviar.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PendientesPageRoutingModule,
    ModalEnviarPageModule
  ],
  declarations: [PendientesPage]
})
export class PendientesPageModule {}
