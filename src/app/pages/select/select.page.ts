import { Component, Input, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';

@Component({
  selector: 'app-select',
  templateUrl: './select.page.html',
  styleUrls: ['./select.page.scss'],
})
export class SelectPage implements OnInit {

  titulo = ''
  lista = []
  seleccionado = null;
  constructor(public modalCtrl:ModalController,public navParams: NavParams) {
    this.titulo = navParams.get('activos');
    this.lista = navParams.get('lista');
    this.seleccionado = navParams.get('seleccionado');
   }

  ngOnInit() {
  }

  select(item){
    // console.log(item)
    this.seleccionado = item;
    this.modalCtrl.dismiss(this.seleccionado)
  }

}
