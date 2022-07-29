import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HomeVialidadPageRoutingModule } from './home-vialidad-routing.module';

import { HomeVialidadPage } from './home-vialidad.page';
import { MatStepperModule } from '@angular/material/stepper';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClientModule } from '@angular/common/http';
import { ModalCaminosPageModule } from '../modal-caminos/modal-caminos.module';
import { SQLite } from '@awesome-cordova-plugins/sqlite/ngx';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomeVialidadPageRoutingModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    HttpClientModule,
    ModalCaminosPageModule
  ],
  declarations: [HomeVialidadPage]
})
export class HomeVialidadPageModule {}
