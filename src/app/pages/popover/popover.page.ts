import { Component, OnInit, Input } from '@angular/core';
import { PopoverController, NavParams } from '@ionic/angular';

@Component({
  selector: 'app-popover',
  templateUrl: './popover.page.html',
  styleUrls: ['./popover.page.scss'],
})
export class PopoverPage implements OnInit {

  @Input() mapa;
  @Input() idioma = 'Español';
  tipo:string;
  posicionT:string;
  centrarT:string;
  traductorT:string;
  redvial:boolean;
  novialidad:boolean;
  constructor(public popctrl: PopoverController,public navParams: NavParams) { 
    this.mapa = navParams.get('mapa');
    this.redvial = navParams.get('red');
    this.novialidad = navParams.get('novialidad');
    if(this.mapa != 'osm'){
      this.tipo = 'Mapa topo-vector';
    }else{
      this.tipo = 'Mapa Satelital';
    }
    this.posicionT = 'Mi posición'
    this.centrarT = 'Posición inicial'
  }

  ngOnInit() {
  }

  tipoMapa() {
    if(this.mapa == 'osm'){
      this.mapa = 'satelite';
    }else{
      this.mapa = 'osm';
    }
    let data = { mapa:this.mapa };
    this.popctrl.dismiss(data);
  }
  posicion() {
    let data = { posicion:true };
    this.popctrl.dismiss(data);
  }
  centrar() {
    let data = { centrar:true };
    this.popctrl.dismiss(data);
  }
  redVial() {
    let data = { red:true };
    this.popctrl.dismiss(data);
  }

}
