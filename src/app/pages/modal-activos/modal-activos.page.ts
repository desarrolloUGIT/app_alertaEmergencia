import { Component, Input, OnInit } from '@angular/core';
import { ModalController, NavParams, PopoverController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { PopoverRegionPage } from '../popoverRegion/popoverRegion.page';
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
  region:string;
  posicion;
  regionSelec;
  constructor(public modalCtrl:ModalController,public navParams: NavParams,public popoverCtrl:PopoverController) {
    this.activos = navParams.get('activos');
    this.region = navParams.get('region');
    this.posicion = navParams.get('posicion');
    this.coord = navParams.get('coord');
    this.regionSelec = navParams.get('regionSelect');
    this.calcularActivos()    
  }

  ngOnInit() {
  }

  inicializar(){
    this.activosShow = this.todos.slice(0,5)
  }

  calcularActivos(){
    var temp = []
    this.activos.forEach((a,i)=>{
      this.activos[i].forEach((f,j)=>{
        this.activos[i][j] = { ASSETNUM:f.ASSETNUM,
          DESCRIPTION:f.DESCRIPTION,
          SITEID:f.SITEID,
          SERVICEADDRESS:{
            REGIONDISTRICT:f.SERVICEADDRESS.REGIONDISTRICT,
            LATITUDEY:f.SERVICEADDRESS.LATITUDEY,
            LONGITUDEX:f.SERVICEADDRESS.LONGITUDEX
          }
          ,distancia:Number(this.getKilometros(this.coord[1],this.coord[0],f.SERVICEADDRESS.LATITUDEY,f.SERVICEADDRESS.LONGITUDEX))
        }
      })
    })
    temp = this.activos[Number(this.posicion) - 1]
    // this.activos[Number(this.posicion) - 1].forEach((f,i)=>{
    //   temp.push({ ASSETNUM:f.ASSETNUM,
    //     DESCRIPTION:f.DESCRIPTION,
    //     SITEID:f.SITEID,
    //     SERVICEADDRESS:{
    //       REGIONDISTRICT:f.SERVICEADDRESS.REGIONDISTRICT,
    //       LATITUDEY:f.SERVICEADDRESS.LATITUDEY,
    //       LONGITUDEX:f.SERVICEADDRESS.LONGITUDEX
    //     }
    //     ,distancia:Number(this.getKilometros(this.coord[1],this.coord[0],f.SERVICEADDRESS.LATITUDEY,f.SERVICEADDRESS.LONGITUDEX))})
    // })
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
  if (val && val.trim() != '' && val.length >=2 ) {
    this.activosShow = this.activos[this.region == '20' ? this.regionSelec : (Number(this.region) - 1)].filter((item) => {
      return (item.DESCRIPTION.toLowerCase().indexOf(val.toLowerCase()) > -1);
    }).splice(0,5)
  }else{
    if(val.length == 0 || val == null){
      this.inicializar()
    }
  }
}

async presentPopoverRegion(myEvent) {
  const popover = await this.popoverCtrl.create({
    component: PopoverRegionPage,
    translucent: true,
    cssClass: 'my-custom-modal-css',
    showBackdrop:true,
    mode:'ios',
    event: myEvent,
    componentProps:{
      region:this.regionSelec,
    }
  });
  popover.onDidDismiss().then(data=>{
    if(data.data){
     if(data.data.region){
      this.regionSelec = data.data.region
     }else{
      this.regionSelec = null;
     }
    }else{
      this.regionSelec = null;
    } 
  })
  return await popover.present();
}
 
selectActivo(e){
  this.modalCtrl.dismiss({data:e,regionSelect:this.regionSelec})
}


}
