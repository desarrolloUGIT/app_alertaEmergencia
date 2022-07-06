import { Component, Input, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { addIcons } from 'ionicons';
addIcons({
  'distance': 'assets/img/distance.svg',
});
@Component({
  selector: 'app-modal-activos',
  templateUrl: './modal-activos.page.html',
  styleUrls: ['./modal-activos.page.scss'],
})
export class ModalActivosPage implements OnInit {
  @Input() activos;
  @Input() coord;
  activosShow = [];
  todos = []
  constructor(public modalCtrl:ModalController,public navParams: NavParams) {
    this.activos = navParams.get('activos');
    this.coord = navParams.get('coord');
    this.calcularActivos()    
  }

  ngOnInit() {
  }

  inicializar(){
    this.activosShow = this.todos.slice(0,5)
  }

  calcularActivos(){
    var temp = []
    this.activos.forEach(f=>{
      temp.push({activo:f,distancia:Number(this.getKilometros(this.coord[1],this.coord[0],f.SERVICEADDRESS.LATITUDEY,f.SERVICEADDRESS.LONGITUDEX))})
    })
    temp = this.sortJSON(temp,'distancia','asc')
    this.todos = temp;
    this.activosShow = temp.slice(0,5)
  }
  getKilometros(lat1,lon1,lat2,lon2){
    var rad = function(x) {return x*Math.PI/180;}
    var R = 6378.137; //Radio de la tierra en km
    var dLat = rad( lat2 - lat1 );
    var dLong = rad( lon2 - lon1 );
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLong/2) * Math.sin(dLong/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d.toFixed(1); //Retorna tres decimales
 }

 sortJSON(data, key, orden) {
  return data.sort(function (a, b) {
      var x = a[key],
          y = b[key];
      if (orden === 'asc') {
          return ((x < y) ? -1 : ((x > y) ? 1 : 0));
      }
      if (orden === 'desc') {
          return ((x > y) ? -1 : ((x < y) ? 1 : 0));
      }
  });
}

getActivos(ev: any) {
  const val = ev.target.value;
  if (val && val.trim() != '' && val.length >=3 ) {
    this.activosShow = this.todos.filter((item) => {
      return (item.activo.DESCRIPTION.toLowerCase().indexOf(val.toLowerCase()) > -1);
    }).splice(0,5)
  }else{
    if(val.length == 0 || val == null){
      this.inicializar()
    }
  }
}
 
selectActivo(e){
  this.modalCtrl.dismiss(e)
}


}
