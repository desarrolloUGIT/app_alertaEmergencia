import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule} from '@angular/forms';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { MatStepperModule } from '@angular/material/stepper';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClientModule } from '@angular/common/http';
import { ModalActivosPageModule } from '../modal-activos/modal-activos.module';
import { SQLite } from '@awesome-cordova-plugins/sqlite/ngx';
import { ModalEnviarPageModule } from '../modal-enviar/modal-enviar.module';
import { SelectPageModule } from '../select/select.module';
import { MatTooltipModule } from '@angular/material/tooltip';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    HttpClientModule,
    ModalActivosPageModule,
    ModalEnviarPageModule,
    SelectPageModule,
    MatTooltipModule
  ],
  declarations: [HomePage],providers:[SQLite]
})
export class HomePageModule {}
