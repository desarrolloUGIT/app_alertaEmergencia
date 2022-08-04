import { Component, Input, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { addIcons } from 'ionicons';
addIcons({
  'distance': 'assets/img/distance.svg',
  'ruta': 'assets/img/ruta.svg',
});
@Component({
  selector: 'app-modal-caminos',
  templateUrl: './modal-caminos.page.html',
  styleUrls: ['./modal-caminos.page.scss'],
})
export class ModalCaminosPage implements OnInit {
  @Input() caminos;
  constructor(public modalCtrl:ModalController,public navParams: NavParams) {
    this.caminos = navParams.get('caminos');
   }

  ngOnInit() {
  }

  selectActivo(e){
    this.modalCtrl.dismiss(e)
  }
}
