import { Component, Input, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
@Component({
  selector: 'app-modal-enviar',
  templateUrl: './modal-enviar.page.html',
  styleUrls: ['./modal-enviar.page.scss'],
})
export class ModalEnviarPage implements OnInit {
  @Input() estadoEnvioAlerta;
  constructor(public modalCtrl:ModalController,public navParams: NavParams) { 
    this.estadoEnvioAlerta = navParams.get('estadoEnvioAlerta');
  }

  ngOnInit() {
  }

}
