import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HomeVialidad2PageRoutingModule } from './home-vialidad2-routing.module';

import { HomeVialidad2Page } from './home-vialidad2.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomeVialidad2PageRoutingModule
  ],
  declarations: [HomeVialidad2Page]
})
export class HomeVialidad2PageModule {}
