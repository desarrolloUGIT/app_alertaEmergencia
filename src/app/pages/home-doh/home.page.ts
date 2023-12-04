import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { UsuarioService } from '../../services/usuario/usuario.service';
import { HttpClient } from '@angular/common/http';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { AlertController, LoadingController, MenuController, Platform, ModalController, ToastController, PopoverController, NavController } from '@ionic/angular';
import TileLayer from 'ol/layer/Tile';
import {View, Feature, Map } from 'ol';
import OSM, {ATTRIBUTION} from 'ol/source/OSM';
import * as olProj from 'ol/proj';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import VectorSource from 'ol/source/Vector';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { ModalActivosPage } from '../modal-activos/modal-activos.page';
import { MatStepper } from '@angular/material/stepper';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { Camera, CameraResultType, CameraSource, Photo} from '@capacitor/camera'
import { Directory, Filesystem } from '@capacitor/filesystem';
import { ActionSheetController } from '@ionic/angular';
import { AnimationController } from '@ionic/angular';
import { ModalEnviarPage } from '../modal-enviar/modal-enviar.page';
import { DireccionService } from '../../services/direccion/direccion.service';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { PopoverPage } from '../popover/popover.page';
import {FullScreen, defaults as defaultControls} from 'ol/control.js';
import { VialidadService } from 'src/app/services/vialidad/vialidad.service';
import { SelectPage } from '../select/select.page';
import { HelpPage } from '../help/help.page';
import { NavigationExtras } from '@angular/router';
// import { LocationAccuracy } from '@awesome-cordova-plugins/location-accuracy/ngx';

const IMAGE_DIR = 'stored-images';
const SAVE_IMAGE_DIR = 'save-stored-images';


interface LocalFile {
  name:string;
  path:string;
  data:string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  @ViewChild('stepper')  stepper: MatStepper;
  activosEncontrados = false;
  nohayActivos = false;
  stgo = olProj.transform([-70.65266161399654,-33.44286267068381], 'EPSG:4326', 'EPSG:3857')
  view =  new View({
    center: this.stgo, 
    zoom: 13
  })
  map: Map;
  chile = new VectorLayer({})
  baseLayer = new TileLayer({
    source: new OSM({
      attributions: ['Mapa de Esri',''],
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    })
  })
  osm = new TileLayer({
    source: new OSM({
      url:'https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
    })
  });
  modo = 'osm'
  regiones = null;
  iconFeature = new Feature({
    geometry: new Point(this.stgo),
    name: 'Mi ubicación'
  });
  markers = new VectorLayer({
    source: new VectorSource(),
    style: new Style({
      image: new Icon({
        anchor: [0.5, 1],
        src: 'assets/img/pin.png',
        scale:0.08
      })
    })
  });
  competencia = [{valor:'No',descripcion:'Fuera del Ambito de Competencia MOP'},{valor:'Solo Técnico',descripcion:'Solo Ambito Técnico'},{valor:'Si',descripcion:'Ambito de Competencia MOP'}]
  marker = new Feature(new Point(olProj.transform([-70.65266161399654,-33.44286267068381], 'EPSG:4326', 'EPSG:3857')));
  firstFormGroup:FormGroup;
  secondFormGroup:FormGroup;
  thirdFormGroup:FormGroup;
  isLinear = true;
  loader;
  dataPosicion = {lat:0,lng:0,region:'13'}
  operatividadArray = [];
  nivelAlertaArray = [];
  destinosArray = [];
  db:SQLiteObject;
  images: LocalFile[] = [];
  coordenadas;
  existenActivos = true;
  picture = null;
  estadoEnvioAlerta = null;
  region = ''
  defsite;
  toast;
  intento = 0;
  tab = 0;
  internet = false;
  footer = true;
  mostrarMapa = false;
  activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]
  activosActualizar = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]
  tabActual = 0;
  fechaActualizar = new Date();
  actualizar = false;
  regionesAll = [];
  provinciasAll = [];
  comunasAll = [];
  elementos = [];
  iconEnviando = false;
  provinciaSelect = []
  comunaSelect = []
  reiniciar = false;
  elementFinal = [];
  cargoMapa = false;
  regionSelect;
  constructor(public _ds:DireccionService,private _formBuilder: FormBuilder,public _us:UsuarioService, public platform:Platform,public _http:HttpClient,public _modalCtrl:ModalController,public _navCtrl:NavController,
    private geolocation: Geolocation,public loadctrl:LoadingController,public alertController:AlertController,public _mc:MenuController,private sqlite: SQLite,private keyboard: Keyboard,public _vs:VialidadService,
    public toastController:ToastController,public actionSheetController: ActionSheetController,private animationCtrl: AnimationController,public alertctrl:AlertController,public popoverCtrl:PopoverController,
    public storage: NativeStorage) {
      this._us.message.subscribe(res=>{
        if(res == 'conexión establecida'){
          this.mostrarMapa = true;
          this.storage.setItem('seleccionMapa', 'si');
          localStorage.setItem('seleccionMapa','si')
          this.internet = true;
          this.tab = 0;
          this._us.cargar_storage().then(()=>{})
          this.reiniciarHome()
        }
        if(res == 'conexión establecida sin mapa'){
          this.storage.setItem('conexion', 'si');
          localStorage.setItem('conexion','si')
          this.mostrarMapa = true;
          this.firstFormGroup.reset();
          this.secondFormGroup.reset();
          this.secondFormGroup.controls['competencia'].setValue('Si')
          this.thirdFormGroup.reset();
          this.storage.setItem('seleccionMapa', 'si');
          localStorage.setItem('seleccionMapa','si')
          this.internet = true;
          this.tab = 0;
          this._us.cargar_storage().then(()=>{})
          this.reiniciarHome()
          // this.loadMapNotVialidad()
        }
        if(res == 'sin conexión'){
          this.internet = false;
          this.mostrarMapa = false;
        }
        if(res == 'enviando'){
          this.iconEnviando = true;
        }
        if(res == 'termino de enviar'){
          this.iconEnviando = false;
        }
      })
      this.keyboard.hideFormAccessoryBar(false)
    }
  async reset(){
    const alert = await this.alertctrl.create({
      header: 'Reiniciar APP',
      message: '¿Deseas reiniciar ahora la APP?',
      // buttons: ['OK'],
      mode:'ios',
      buttons: [{
        text: 'No, lo haré despues',
        role: 'cancel',
        cssClass: 'secondary',
          handler: () => {
          }
        },{
          text: 'Si, reiniciar',
          id: 'confirm-button',
          handler: () => {
            this.reiniciar = false;
            window.location.reload()
          }
        }
      ]
    });
    await alert.present()
  }

  async reiniciarHome(){
    this.internet = true;
    this.mostrarMapa = true;
    this.tab = 0;
    if(this.cargoMapa){
      this.map.updateSize();
    }else{
      this.loadMapNotVialidad()
    }
  }

  ngOnInit(){
   this.iniciar()
  }

  
  iniciar(){
    this._us.cargar_storage().then(()=>{
      this.region = this._us.usuario.PERSON.STATEPROVINCE
      this.dataPosicion.region = this.region == '20' ? '13' : this.region;
      if(!this._us.fechaActualizacion){
        //actualizar activos
        // comparar fechas y buscar la sgte fecha-hora de actualizacion
        this.actualizar = true;
        var next = new Date()
        next.setDate(next.getDate() +1)
        this._us.fechaActualizacion = this._us.fechaActualizar(next,'fecha')
        this.storage.setItem('fechaActualizacion', JSON.stringify(this._us.fechaActualizacion));
        localStorage.setItem('fechaActualizacion',JSON.stringify(this._us.fechaActualizacion))
      }else{
        var hoyFecha = new Date()
        if(this._us.fechaActualizar(this._us.fechaActualizacion,'fecha') < this._us.fechaActualizar(hoyFecha,'fecha')){
          this.actualizar = true;
          var next = new Date()
          next.setDate(next.getDate() +1)
          this._us.fechaActualizacion = this._us.fechaActualizar(next,'fecha')
          this.storage.setItem('fechaActualizacion', JSON.stringify(this._us.fechaActualizacion));
          localStorage.setItem('fechaActualizacion',JSON.stringify(this._us.fechaActualizacion))
        }else{
          console.log('debe esperar hasta mañana para actualizar')
          this.actualizar = false;
        }
      }
      this._us.coordenadasRegion.forEach(c=>{
        if(c.region == this.region){
          this.dataPosicion.lng = Number(c.lng.toFixed(6))
          this.dataPosicion.lat = Number(c.lat.toFixed(6))
        }
      })
      if(this._us.conexion == 'si'){
        this.mostrarMapa = true;
        this.storage.setItem('seleccionMapa', 'si');
        localStorage.setItem('seleccionMapa','si')
        this.internet = true;
        this._us.cargar_storage().then(()=>{})
        this.loadMapNotVialidad()
      }else{
        this.mostrarMapa = false;
        this.storage.setItem('seleccionMapa', 'no');
        localStorage.setItem('seleccionMapa','no')
        this.internet = false;
        this._us.cargar_storage().then(()=>{})
      }
      this._us.nextmessage('usuario_logeado') 
      this.loadFiles()
      setTimeout(()=>{
        this.geolocate()
      },1000)
      if(this.platform.is('capacitor')){
        this.sqlite.create({name:'mydbAlertaTempranaPROD',location:'default',createFromLocation:1}).then((db:SQLiteObject)=>{
          db.executeSql('CREATE TABLE IF NOT EXISTS activos (id unique, name, cod, lugar,lat,lng)',[])
          db.executeSql('CREATE TABLE IF NOT EXISTS operatividad (id unique, name)',[])
          db.executeSql('CREATE TABLE IF NOT EXISTS elemento (id unique, name,condition)',[]);
          db.executeSql('CREATE TABLE IF NOT EXISTS nivelAlerta (id unique, name)',[])
          db.executeSql('CREATE TABLE IF NOT EXISTS alerta (id, titulo, descripcion, usuario, lat, lng, nivelalerta, competencia,operatividad,region, name, date,location,error,provincia,comuna,elemento,destino)',[]);
          db.executeSql('CREATE TABLE IF NOT EXISTS historial (id, titulo, descripcion, usuario, lat, lng, nivelalerta, competencia,operatividad,region, name, date,location,error,provincia,comuna,elemento,destino)',[]);
          this.db = db;
          this.operatividad();
          this.nivelAlerta();
          this.destinos(); 
          if(this.region == '20'){
            this.activosDOH('20');
          }else{
            this.activosDOH(this.region);
          }
          // this._ds.activos('16').subscribe((res:any)=>{
          //   console.log('ACTIVOS->>>',res)
          // })
          this.elemento()
        })
      }else{
        this.operatividad();
        this.nivelAlerta();
        this.destinos();
        this.elemento()
        if(this.region == '20'){
          this.activosDOH('20');
        }else{
          this.activosDOH(this.region);
        }
      }
      this.cargarRegiones()
      this.cargarProvincias()
      this.cargarComunas()
      // if(this._us.usuario.DEFSITE == 'DOH-CAUC' || this._us.usuario.DEFSITE == 'DOH-ALL'){
      //   this.elemento()
      // }
 
    })
   
    this.competencia = this.sortJSON(this.competencia,'VALUE','asc')
    this.firstFormGroup = this._formBuilder.group({
      activoSeleccionado: [null],
    });
    this.secondFormGroup = this._formBuilder.group({
      operatividad:[null,Validators.compose([Validators.required])],
      nivelAlerta:[null,Validators.compose([Validators.required])],
      competencia:['Si',Validators.compose([Validators.required])],
      destino:[null,Validators.compose([Validators.required])],
      elemento:[null,Validators.compose([])],
    })
    this.thirdFormGroup = this._formBuilder.group({
      titulo: [null,Validators.compose([Validators.maxLength(100),Validators.required])],
      descripcion: [null],
      infraestructura: [null],
      acciones: [null],
    });  
  }

// INICIO MAPA
  loadMapNotVialidad(): void {
    this._http.get('assets/maps/chile.geojson').subscribe((chileJSON:any)=>{
      this.chile = new VectorLayer({
        source:new VectorSource({
          features: new GeoJSON().readFeatures(chileJSON),
        })
      })
      this.map = new Map({
        layers: [
         this.osm,
         this.baseLayer,
        //  this.chile
        ],
        view:this.view,
      });
      // this.map.addControl(new FullScreen)
      setTimeout(() => {
        this.map.setTarget("map");
      }, 500);
      this.cargoMapa = true;
      this._us.coordenadasRegion.forEach(c=>{
        if(c.region == this.region){
          this.view.setCenter(olProj.transform([c.lng,c.lat], 'EPSG:4326', 'EPSG:3857'))
          this.dataPosicion.lng = Number(c.lng.toFixed(6))
          this.dataPosicion.lat = Number(c.lat.toFixed(6))
          this.dataPosicion.region = this.region == '20' ? '13' : this.region;
        }
      })
      this.marker.getGeometry().setCoordinates(this.view.getCenter());
      this.chile.setVisible(true)
      this.osm.setVisible(true)
      this.baseLayer.setVisible(false)
      this.regiones = this.chile.getSource().getFeatures();
      this.markers.getSource().addFeature(this.marker);
      this.map.addLayer(this.markers);
      var lonlat = olProj.toLonLat(this.view.getCenter());
      this.dataPosicion.lng = Number(lonlat[0].toFixed(6))
      this.dataPosicion.lat = Number(lonlat[1].toFixed(6))
 
      this.map.getView().on('change:center', ()=>{
        this.obtenerUbicacionRegion()
      });
      // this.map.on('click',(e)=>{
      //   this.map.forEachLayerAtPixel(e.pixel,(feature,layer)=>{
      //     console.log(feature);
      //   })
      // })
    })
  }

  centralInicial(){
    this._us.coordenadasRegion.forEach(c=>{
      if(c.region == this.region){
        this.view.setCenter(olProj.transform([c.lng,c.lat], 'EPSG:4326', 'EPSG:3857'))
        this.dataPosicion.lng = Number(c.lng.toFixed(6))
        this.dataPosicion.lat = Number(c.lat.toFixed(6))
        this.dataPosicion.region = this.region == '20' ? '13' : this.region;
      }
    })
    this.marker.getGeometry().setCoordinates(this.view.getCenter());
    this.view.setZoom(13)
    this.obtenerUbicacionRegion()
  }

  obtenerUbicacionRegion(){
    this.marker.getGeometry().setCoordinates(this.view.getCenter());
    var curr = olProj.toLonLat(this.view.getCenter());
    this.dataPosicion.lat = Number(curr[1].toFixed(6));
    this.dataPosicion.lng = Number(curr[0].toFixed(6));
    var region;
    if (this.mostrarMapa && this.internet){
      this.regiones = this.chile.getSource().getFeatures();
      for (var i in this.regiones) {
          var polygonGeometry = this.regiones[i].getGeometry();
          var coords = olProj.toLonLat(this.marker.getGeometry().getCoordinates());
          if (polygonGeometry && typeof polygonGeometry != "undefined") {
              if (polygonGeometry.intersectsCoordinate(coords)) {
                  region = this.regiones[i].get("region") + "";
                  if (region.length == 1) region = "0" + region;
                  this.dataPosicion.region = region;
              }
          }else{
            console.log('fuera de regiones')
          }
      }
    }

  }

  changeMap(){
    if(this.modo == 'osm'){
      this.osm.setVisible(false)
      this.baseLayer.setVisible(true)
      this.modo = 'satelite'
    }else{
      this.osm.setVisible(true)
      this.baseLayer.setVisible(false)
      this.modo = 'osm'
    }
  }

  geolocate(){
      this.presentToast('Localizando ...',null,null,true).then(()=>{
      this.geolocation.getCurrentPosition().then((resp) => {
        this.view.setCenter(olProj.transform([resp.coords.longitude,resp.coords.latitude], 'EPSG:4326', 'EPSG:3857'))
        this.marker.getGeometry().setCoordinates(this.view.getCenter());
        this.view.setZoom(15)
        this.toast.dismiss();
        this.obtenerUbicacionRegion()
      }).catch(async (error) => {
        this.toast.dismiss();
        this.obtenerUbicacionRegion()
        console.log('Error getting location', error);
        const alert = await this.alertctrl.create({
          header: 'Debes activar el GPS y permitir la localización',
          buttons: ['OK'],
          mode:'ios',
        });
        await alert.present()
      });
      }).catch(()=>{
        this.toast.dismiss();
      })
  }

  selectTab(i,sumar?,restar?){
      if(sumar){
        this.tab = Number(i) + 1;
      }else{
        if(restar){
          this.tab = Number(i) - 1;
        }else{
          if(this.tab ==  Number(i)){
            this.tab = 0;
          }else{
            this.tab = Number(i);
          }
        }
      }
      this._us.cargar_storage().then(()=>{
        if(this._us.conexion == 'si'){
          this.mostrarMapa = true;
        }else{
          this.mostrarMapa = false;
        }
      })
    
  }

  async presentPopover(myEvent) {
    const popover = await this.popoverCtrl.create({
      component: PopoverPage,
      translucent: true,
      cssClass: 'my-custom-modal-css',
      showBackdrop:true,
      mode:'ios',
      event: myEvent,
      componentProps:{
        mapa:this.modo,
        novialidad:true
      }
    });
    popover.onDidDismiss().then(data=>{
      if(data.data){
       if(data.data.mapa){
        this.changeMap()
       }else{
        if(data.data.posicion){
          this.geolocate()
        }else{
          this.centralInicial()
        }
       }
      } 
    })
    return await popover.present();
  }
  // FIN MAPA
  // CARGAS INICIALES

  cargarRegiones(){
    this._http.get('assets/regiones.xml',{ responseType: 'text' }).subscribe((res:any)=>{
      this._us.xmlToJson(res).then((result:any)=>{
        var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
        this.regionesAll = [];
        path.forEach(f=>{
          this.regionesAll.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
        })
      })
    },err=>{
      this._us.xmlToJson(err.error.text).then((result:any)=>{
        var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
        this.regionesAll = [];
        path.forEach(f=>{
          this.regionesAll.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
        })
      })
    })
  }

  cargarProvincias(){
    this._http.get('assets/provincias.xml',{ responseType: 'text' }).subscribe((res:any)=>{
      this._us.xmlToJson(res).then((result:any)=>{
        var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
        this.provinciasAll = [];
        path.forEach(f=>{
          this.provinciasAll.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
        })
      })
    },err=>{
      this._us.xmlToJson(err.error.text).then((result:any)=>{
        var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
        this.provinciasAll = [];
        path.forEach(f=>{
          this.provinciasAll.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
        })
      })
    })
  }

  cargarComunas(){
    this._http.get('assets/comunas.xml',{ responseType: 'text' }).subscribe((res:any)=>{
      this._us.xmlToJson(res).then((result:any)=>{
        var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
        this.comunasAll = [];
        path.forEach(f=>{
          this.comunasAll.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
        })
      })
    },err=>{
      this._us.xmlToJson(err.error.text).then((result:any)=>{
        var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
        this.comunasAll = [];
        path.forEach(f=>{
          this.comunasAll.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
        })
      })
    })
  }

  elementChange(){
    this.elementFinal = []
    this.elementos.forEach(e=>{
       if((this.secondFormGroup.value.destino == 'DOH-CAUC' && e.CONDITIONNUM == 'SRPLTDOHCAUC') || (this.secondFormGroup.value.destino == 'DOH-ALL' && e.CONDITIONNUM == 'SRPLTDOHALL')){
        this.elementFinal.push(e)
        }
    })
  }

  elemento(){
    if(this.platform.is('capacitor')){
      this.db.open().then(()=>{
        this.db.executeSql('SELECT * FROM elemento', []).then((data)=>{
          if(data.rows.length > 0){
            var arr = []
            var AR = Array.from({length: data.rows.length}, (x, i) => i);
            AR.forEach(i=>{
              var tmp = {
                VALUE:data.rows.item(i).id,
                DESCRIPTION:data.rows.item(i).name,
                CONDITIONNUM:data.rows.item(i).condition
              }
              // if((this._us.usuario.DEFSITE == 'DOH-CAUC' && tmp.CONDITIONNUM == 'SRPLTDOHCAUC') || (this._us.usuario.DEFSITE == 'DOH-ALL' && tmp.CONDITIONNUM == 'SRPLTDOHALL')){
                arr.push(tmp)
              // }
            })
            this.elementos = arr;
            if(this.actualizar){
              this.actualizarElementos()
            }
          }else{
            this._http.get('assets/elementos.xml',{ responseType: 'text' }).subscribe((res:any)=>{
              this._us.xmlToJson(res).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.elementos = [];
                path.forEach(f=>{
                  // if((f.MAXDOMVALCOND && this._us.usuario.DEFSITE == 'DOH-CAUC' && f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDOHCAUC') || (f.MAXDOMVALCOND && this._us.usuario.DEFSITE == 'DOH-ALL' && f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDOHALL')){
                  if(f.MAXDOMVALCOND && f.MAXDOMVALCOND[0].CONDITIONNUM[0] ){  
                    this.elementos.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0],CONDITIONNUM:f.MAXDOMVALCOND[0].CONDITIONNUM[0]})
                  }
                })
                if(this.platform.is('capacitor')){
                  if(this.actualizar){
                    this.actualizarElementos()
                  }
                }
              })
            },err=>{
              this._us.xmlToJson(err.error.text).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.elementos = [];
                path.forEach(f=>{
                  // if((f.MAXDOMVALCOND && this._us.usuario.DEFSITE == 'DOH-CAUC' && f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDOHCAUC') || (f.MAXDOMVALCOND && this._us.usuario.DEFSITE == 'DOH-ALL' && f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDOHALL')){
                  if(f.MAXDOMVALCOND && f.MAXDOMVALCOND[0].CONDITIONNUM[0] ){  
                    this.elementos.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0],CONDITIONNUM:f.MAXDOMVALCOND[0].CONDITIONNUM[0]})
                  }
                })
                if(this.platform.is('capacitor')){
                  if(this.actualizar){
                    this.actualizarElementos()
                  }
                }
              })
            })
          }
        })
      })
    }else{
      this._http.get('assets/elementos.xml',{ responseType: 'text' }).subscribe((res:any)=>{
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.elementos = [];
          path.forEach(f=>{
            // if((f.MAXDOMVALCOND && this._us.usuario.DEFSITE == 'DOH-CAUC' && f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDOHCAUC') || (f.MAXDOMVALCOND && this._us.usuario.DEFSITE == 'DOH-ALL' && f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDOHALL')){
            if(f.MAXDOMVALCOND && f.MAXDOMVALCOND[0].CONDITIONNUM[0] ){ 
              this.elementos.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0],CONDITIONNUM:f.MAXDOMVALCOND[0].CONDITIONNUM[0]})
            }
          })
          if(this.platform.is('capacitor')){
            if(this.actualizar){
              this.actualizarElementos()
            }
          }
        })
      },err=>{
        this._us.xmlToJson(err.error.text).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.elementos = [];
          path.forEach(f=>{
            // if((f.MAXDOMVALCOND && this._us.usuario.DEFSITE == 'DOH-CAUC' && f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDOHCAUC') || (f.MAXDOMVALCOND && this._us.usuario.DEFSITE == 'DOH-ALL' && f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDOHALL')){
            if(f.MAXDOMVALCOND && f.MAXDOMVALCOND[0].CONDITIONNUM[0] ){  
             this.elementos.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0],CONDITIONNUM:f.MAXDOMVALCOND[0].CONDITIONNUM[0]})
            }
          })
          if(this.platform.is('capacitor')){
            if(this.actualizar){
              this.actualizarElementos()
            }
          }
        })
      })
    }
  }

  actualizarElementos(){
    this._vs.dominios('ELEMENTOSIE').subscribe((res:any)=>{
      if(res && res.status == '200'){
        // console.log('ELEMENTOS->>>>>',res)
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.elementos = [];
          path.forEach(f=>{
            // if((f.MAXDOMVALCOND && this._us.usuario.DEFSITE == 'DOH-CAUC' && f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDOHCAUC') || (f.MAXDOMVALCOND && this._us.usuario.DEFSITE == 'DOH-ALL' && f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDOHALL')){
            if(f.MAXDOMVALCOND && f.MAXDOMVALCOND[0].CONDITIONNUM[0] ){  
              this.elementos.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0],CONDITIONNUM:f.MAXDOMVALCOND[0].CONDITIONNUM[0]})
            }
          })
          this.elementos = this.sortJSON(this.elementos,'DESCRIPTION','asc')
          this.db.open().then(()=>{
            this.db.transaction(rx=>{
              rx.executeSql('delete from elemento', [], ()=>{
                this.elementos.forEach((activo,i)=>{
                  this.db.transaction(tx=>{
                    tx.executeSql('insert into elemento (id,name,condition) values (?,?,?)', [activo.VALUE, activo.DESCRIPTION,activo.CONDITIONNUM]);
                  })
                })
              })
            }).then(()=>{
              // Termina de ingresar nivelAlerta
            }).catch(()=>{
              this.db.executeSql('SELECT * FROM elemento', []).then((data)=>{
                if(data.rows.length > 0){
                  var arr = []
                  var AR = Array.from({length: data.rows.length}, (x, i) => i);
                  AR.forEach(i=>{
                    var tmp = {
                      VALUE:data.rows.item(i).id,
                      DESCRIPTION:data.rows.item(i).name,
                      CONDITIONNUM:data.rows.item(i).condition
                    }
                    // if((this._us.usuario.DEFSITE == 'DOH-CAUC' && tmp.CONDITIONNUM == 'SRPLTDOHCAUC') || (this._us.usuario.DEFSITE == 'DOH-ALL' && tmp.CONDITIONNUM == 'SRPLTDOHALL')){
                      arr.push(tmp)
                    // }
                  })
                  this.elementos = arr;
                  this.elementos = this.sortJSON(this.elementos,'DESCRIPTION','asc')
                }
              })     
            })
          })
        })
      }else{
        this.db.executeSql('SELECT * FROM elemento', []).then((data)=>{
          if(data.rows.length > 0){
            var arr = []
            var AR = Array.from({length: data.rows.length}, (x, i) => i);
            AR.forEach(i=>{
              var tmp = {
                VALUE:data.rows.item(i).id,
                DESCRIPTION:data.rows.item(i).name,
                CONDITIONNUM:data.rows.item(i).condition
              }
              // if((this._us.usuario.DEFSITE == 'DOH-CAUC' && tmp.CONDITIONNUM == 'SRPLTDOHCAUC') || (this._us.usuario.DEFSITE == 'DOH-ALL' && tmp.CONDITIONNUM == 'SRPLTDOHALL')){
                arr.push(tmp)
              // }
            })
            this.elementos = arr;
            this.elementos = this.sortJSON(this.elementos,'DESCRIPTION','asc')
          }
        })  
      }
    })
  }

  operatividad(){
    if(this.platform.is('capacitor')){
      this.db.open().then(()=>{
        this.db.executeSql('SELECT * FROM operatividad', []).then((data)=>{
          if(data.rows.length > 0){
            var arr = []
            var AR = Array.from({length: data.rows.length}, (x, i) => i);
            AR.forEach(i=>{
              var tmp = {
                VALUE:data.rows.item(i).id,
                DESCRIPTION:data.rows.item(i).name,
              }
              arr.push(tmp)
            })
            this.operatividadArray = arr;
            if(this.actualizar){
              this.actualizarOperatividad()
            }
          }else{
            this._http.get('assets/operatividad.xml',{ responseType: 'text' }).subscribe((res:any)=>{
              this._us.xmlToJson(res).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.operatividadArray = []
                path.forEach(f=>{
                  this.operatividadArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                })
                if(this.platform.is('capacitor')){
                  if(this.actualizar){
                    this.actualizarOperatividad()
                  }
                }
              })
            },err=>{
              this._us.xmlToJson(err.error.text).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.operatividadArray = []
                path.forEach(f=>{
                  this.operatividadArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                })
                if(this.platform.is('capacitor')){
                  if(this.actualizar){
                    this.actualizarOperatividad()
                  }
                }
              })
            })
          }
        })
      })
    }else{
      this._http.get('assets/operatividad.xml',{ responseType: 'text' }).subscribe((res:any)=>{
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.operatividadArray = []
          path.forEach(f=>{
            this.operatividadArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          if(this.platform.is('capacitor')){
            if(this.actualizar){
              this.actualizarOperatividad()
            }
          }
        })
      },err=>{
        this._us.xmlToJson(err.error.text).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.operatividadArray = []
          path.forEach(f=>{
            this.operatividadArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          if(this.platform.is('capacitor')){
            if(this.actualizar){
             this.actualizarOperatividad()
            }
          }
        })
      })
    }
  }

  actualizarOperatividad(){
    this._ds.dominios('ESTADOUB').subscribe((res:any)=>{
      if(res && res.status == '200'){
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.operatividadArray = []
          path.forEach(f=>{
            this.operatividadArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          this.db.open().then(()=>{
            this.db.transaction(rx=>{
              rx.executeSql('delete from operatividad', [], ()=>{
                this.operatividadArray.forEach((activo,i)=>{
                  this.db.transaction(tx=>{
                    tx.executeSql('insert into operatividad (id,name) values (?,?)', [activo.VALUE, activo.DESCRIPTION]);
                  })
                })
              })
            }).then(()=>{
              // Termina de ingresar nivelAlerta
            }).catch(()=>{
              this.db.executeSql('SELECT * FROM operatividad', []).then((data)=>{
                if(data.rows.length > 0){
                  var arr = []
                  var AR = Array.from({length: data.rows.length}, (x, i) => i);
                  AR.forEach(i=>{
                    var tmp = {
                      VALUE:data.rows.item(i).id,
                      DESCRIPTION:data.rows.item(i).name,
                    }
                    arr.push(tmp)
                  })
                  this.operatividadArray = arr;
                }
              })     
            })
          })
        })
      }else{
        this.db.executeSql('SELECT * FROM operatividad', []).then((data)=>{
          if(data.rows.length > 0){
            var arr = []
            var AR = Array.from({length: data.rows.length}, (x, i) => i);
            AR.forEach(i=>{
              var tmp = {
                VALUE:data.rows.item(i).id,
                DESCRIPTION:data.rows.item(i).name,
              }
              arr.push(tmp)
            })
            this.operatividadArray = arr;
          }
        })  
      }
    },err=>{
      console.log('ERRRRRRRR POR ACA')
    })
  }

  nivelAlerta(){
    if(this.platform.is('capacitor')){
      this.db.open().then(()=>{
        this.db.executeSql('SELECT * FROM nivelAlerta', []).then((data)=>{
          if(data.rows.length > 0){
            var arr = []
            var AR = Array.from({length: data.rows.length}, (x, i) => i);
            AR.forEach(i=>{
              var tmp = {
                VALUE:data.rows.item(i).id,
                DESCRIPTION:data.rows.item(i).name,
              }
              arr.push(tmp)
            })
            this.nivelAlertaArray = arr;
            if(this.actualizar){
              this.actualizarNivelAlerta()
            }
          }else{
            this._http.get('assets/nivelAlerta.xml',{ responseType: 'text' }).subscribe((res:any)=>{
              this._us.xmlToJson(res).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.nivelAlertaArray = [];
                path.forEach(f=>{
                  this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                })
                if(this.platform.is('capacitor')){
                  if(this.actualizar){
                    this.actualizarNivelAlerta()
                  }
                }
              })
            },err=>{
              this._us.xmlToJson(err.error.text).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.nivelAlertaArray = [];
                path.forEach(f=>{
                  this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                })
                if(this.platform.is('capacitor')){
                  if(this.actualizar){
                    this.actualizarNivelAlerta()
                  }
                }
              })
            })
          }
        })
      })
    }else{
      this._http.get('assets/nivelAlerta.xml',{ responseType: 'text' }).subscribe((res:any)=>{
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.nivelAlertaArray = [];
          path.forEach(f=>{
            this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          if(this.platform.is('capacitor')){
            if(this.actualizar){
              this.actualizarNivelAlerta()
            }
          }
        })
      },err=>{
        this._us.xmlToJson(err.error.text).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.nivelAlertaArray = [];
          path.forEach(f=>{
            this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          if(this.platform.is('capacitor')){
            if(this.actualizar){
              this.actualizarNivelAlerta()
            }
          }
        })
      })
    }
  }

  actualizarNivelAlerta(){
    this._ds.dominios('SIECATEGORIA').subscribe((res:any)=>{
      // console.log('ALERTA -> ',res) 
      if(res && res.status == '200'){
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.nivelAlertaArray = [];
          path.forEach(f=>{
            this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          this.db.open().then(()=>{
            this.db.transaction(rx=>{
              rx.executeSql('delete from nivelAlerta', [], ()=>{
                this.nivelAlertaArray.forEach((activo,i)=>{
                  this.db.transaction(tx=>{
                    tx.executeSql('insert into nivelAlerta (id,name) values (?,?)', [activo.VALUE, activo.DESCRIPTION]);
                  })
                })
              })
            }).then(()=>{
              // Termina de ingresar nivelAlerta
            }).catch(()=>{
              this.db.executeSql('SELECT * FROM nivelAlerta', []).then((data)=>{
                if(data.rows.length > 0){
                  var arr = []
                  var AR = Array.from({length: data.rows.length}, (x, i) => i);
                  AR.forEach(i=>{
                    var tmp = {
                      VALUE:data.rows.item(i).id,
                      DESCRIPTION:data.rows.item(i).name,
                    }
                    arr.push(tmp)
                  })
                  this.nivelAlertaArray = arr;
                }
              })     
            })
          })
        })
      }else{
        this.db.executeSql('SELECT * FROM nivelAlerta', []).then((data)=>{
          if(data.rows.length > 0){
            var arr = []
            var AR = Array.from({length: data.rows.length}, (x, i) => i);
            AR.forEach(i=>{
              var tmp = {
                VALUE:data.rows.item(i).id,
                DESCRIPTION:data.rows.item(i).name,
              }
              arr.push(tmp)
            })
            this.nivelAlertaArray = arr;
          }
        })  
      }
    })
  }

  destinos(){
    this.destinosArray = [
      { VALUE: "APR", DESCRIPTION: "Servicio Sanitario Rural" },
      { VALUE: "DOH-ALL", DESCRIPTION: "Aguas Lluvias" },
      { VALUE: "DOH-CAUC", DESCRIPTION: "Obras Fluviales" },
      { VALUE: "DOH-RIEG", DESCRIPTION: "Riego" }
    ]
  }

  activosDOH(region){
    if(this.platform.is('capacitor')){
      this.db.open().then(()=>{
        this.db.executeSql('SELECT * FROM activos', []).then((data)=>{
          if(data.rows.length > 0){
            var arr = []
            var AR = Array.from({length: data.rows.length}, (x, i) => i);
            AR.forEach(i=>{
              // console.log('ACA??->>>',data.rows.item(i).id)
              var tmp = {
                ASSETNUM:data.rows.item(i).id,
                DESCRIPTION:data.rows.item(i).name,
                SITEID:data.rows.item(i).cod,
                SERVICEADDRESS:{
                  REGIONDISTRICT:data.rows.item(i).lugar,
                  LATITUDEY:data.rows.item(i).lat,
                  LONGITUDEX:data.rows.item(i).lng
                }
              }
              this.activosPorRegion[Number(data.rows.item(i).lugar) - 1].push(tmp)
            })
            this.activosEncontrados = true;
            // this.activosVial = arr;
          }else{
            if(region == '20'){
              this._ds.cargandoActivos = true;
              this._ds.activoRegion = 1;
              this.activosNacional(1)
            }else{
              this._http.get('assets/doh/'+this.region+'.xml',{ responseType: 'text' }).subscribe((res:any)=>{
                this._us.xmlToJson(res).then((result:any)=>{
                  if(result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0]){
                    var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0].LOCATIONS
                    path.forEach(p=>{
                      if(Number(p.SERVICEADDRESS[0].LATITUDEY[0]) && String(p.LOCATION[0]).includes('SS')){
                        this.activosActualizar[Number(p.SERVICEADDRESS[0].REGIONDISTRICT[0]) - 1].push({
                          "ASSETNUM": p.LOCATION[0],
                          "DESCRIPTION": p.DESCRIPTION[0],
                          "SITEID": p.SITEID[0],
                          "SERVICEADDRESS": {
                            "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                            "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                            "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                          }
                        })
                      }

                    })
                    this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
                    this.activosPorRegion = this.activosActualizar;
                    this.activosEncontrados = true;
                  }else{
                    this.nohayActivos = true;
                  }
                  if(this.platform.is('capacitor')){
                    if(this.actualizar){
                      this._ds.cargandoActivos = true;
                      this._ds.activoRegion = this.region;
                      this.actualizarActivosDOH(this.region)
                    }else{
                      this._ds.cargandoActivos = false;
                      this._ds.activoRegion = null;
                    }
                  }
                })
              },err=>{
                this._us.xmlToJson(err.error.text).then((result:any)=>{
                  if(result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0]){
                    var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0].LOCATIONS
                    path.forEach(p=>{
                      if(Number(p.SERVICEADDRESS[0].LATITUDEY[0]) && String(p.LOCATION[0]).includes('SS')){
                        this.activosActualizar[Number(p.REGION[0] - 1)].push({
                          "ASSETNUM": p.LOCATION[0],
                          "DESCRIPTION": p.DESCRIPTION[0],
                          "SITEID": p.SITEID[0],
                          "SERVICEADDRESS": {
                            "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                            "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                            "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                          }
                        })
                      }
  
                    })
                    this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
                    this.activosPorRegion = this.activosActualizar;
                    this.activosEncontrados = true;
                  }else{
                    this.nohayActivos = true;
                  }
                  if(this.platform.is('capacitor')){
                    if(this.actualizar){
                      this._ds.cargandoActivos = true;
                      this._ds.activoRegion = this.region;
                      this.actualizarActivosDOH(this.region)
                    }else{
                      this._ds.cargandoActivos = false;
                      this._ds.activoRegion = null;
                    }
                  }
                })
              })
            }
          }
        })
      })
    }else{
      if(region == '20'){
        this._ds.cargandoActivos = true;
        this._ds.activoRegion = 1;
        this.activosNacional(1)
      }else{
        this._ds.cargandoActivos = true;
        this._ds.activoRegion = this.region;
        this._http.get('assets/doh/'+this.region+'.xml',{ responseType: 'text' }).subscribe((res:any)=>{
          this._us.xmlToJson(res).then((result:any)=>{
            if(result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0]){
              var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0].LOCATIONS
              path.forEach(p=>{
                if(Number(p.SERVICEADDRESS[0].LATITUDEY[0]) && String(p.LOCATION[0]).includes('SS')){
                  this.activosActualizar[Number(p.SERVICEADDRESS[0].REGIONDISTRICT[0]) - 1].push({
                    "ASSETNUM": p.LOCATION[0],
                    "DESCRIPTION": p.DESCRIPTION[0],
                    "SITEID": p.SITEID[0],
                    "SERVICEADDRESS": {
                      "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                      "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                      "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                    }
                  })
                }

              })
              this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
              this.activosPorRegion = this.activosActualizar;
              this.activosEncontrados = true;
            }else{
              this.nohayActivos = true;
            }
            if(this.platform.is('capacitor')){
              if(this.actualizar){
                this.actualizarActivosDOH(this.region)
              }
            }else{
              this._ds.cargandoActivos = false;
              this._ds.activoRegion = null;
            }
          })
        },err=>{
          this._us.xmlToJson(err.error.text).then((result:any)=>{
            if(result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0]){
              var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0].LOCATIONS
              path.forEach(p=>{
                if(Number(p.SERVICEADDRESS[0].LATITUDEY[0]) && String(p.LOCATION[0]).includes('SS')){
                  this.activosActualizar[Number(p.SERVICEADDRESS[0].REGIONDISTRICT[0]) - 1].push({
                    "ASSETNUM": p.LOCATION[0],
                    "DESCRIPTION": p.DESCRIPTION[0],
                    "SITEID": p.SITEID[0],
                    "SERVICEADDRESS": {
                      "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                      "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                      "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                    }
                  })
                }
              })
              this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
              this.activosPorRegion = this.activosActualizar;
              this.activosEncontrados = true;
            }else{
              this.nohayActivos = true;
            }
            if(this.platform.is('capacitor')){
              if(this.actualizar){
                this.actualizarActivosDOH(this.region)
              }
            }else{
              this._ds.cargandoActivos = false;
              this._ds.activoRegion = null;
            }
          })
        })
      }
    }
  }

  activosNacional(vuelta){
    this._http.get('assets/doh/'+(String(vuelta).length == 1 ? '0'+vuelta : vuelta)+'.xml',{ responseType: 'text' }).subscribe((res:any)=>{
      this._us.xmlToJson(res).then((result:any)=>{
       if(result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0]){
        var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0].LOCATIONS
        path.forEach(p=>{
          if(Number(p.SERVICEADDRESS[0].LATITUDEY[0]) && String(p.LOCATION[0]).includes('SS')){
            // console.log(Number(p.SERVICEADDRESS[0].LATITUDEY[0]),Number(p.SERVICEADDRESS[0].LONGITUDEX[0]))
            this.activosActualizar[Number(p.SERVICEADDRESS[0].REGIONDISTRICT[0]) - 1].push({
              "ASSETNUM": p.LOCATION[0],
              "DESCRIPTION": p.DESCRIPTION[0],
              "SITEID": p.SITEID[0],
              "SERVICEADDRESS": {
                "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
              }
            })
          }


        })
       }
        const newVuelta = vuelta + 1;
        if(newVuelta > 16){
          this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
          this.activosPorRegion = this.activosActualizar;
          this.activosEncontrados = true;      
          if(this.platform.is('capacitor')){
            if(this.actualizar){
              this.actualizarActivosDOH(this.region,1)
            }
          }else{
            this._ds.cargandoActivos = false;
            this._ds.activoRegion = null;
          }
        }else{
          this._ds.activoRegion = newVuelta;
          this.activosNacional(newVuelta)
        }
        
      })
    },err=>{
      this._us.xmlToJson(err.error.text).then((result:any)=>{
        if(result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0]){
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0].LOCATIONS
          path.forEach(p=>{
            if(Number(p.SERVICEADDRESS[0].LATITUDEY[0]) && String(p.LOCATION[0]).includes('SS')){
              this.activosActualizar[Number(p.SERVICEADDRESS[0].REGIONDISTRICT[0]) - 1].push({
                "ASSETNUM": p.LOCATION[0],
                "DESCRIPTION": p.DESCRIPTION[0],
                "SITEID": p.SITEID[0],
                "SERVICEADDRESS": {
                  "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                  "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                  "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                }
              })
            }

          })
        }
        const newVuelta = vuelta + 1;
        if(newVuelta > 16){
          this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
          this.activosPorRegion = this.activosActualizar;
          this.activosEncontrados = true;      
          if(this.platform.is('capacitor')){
            if(this.actualizar){
              this.actualizarActivosDOH(this.region,1)
            }
          }else{
            this._ds.cargandoActivos = false;
            this._ds.activoRegion = null;
          }
        }else{
          this._ds.activoRegion = newVuelta;
          this.activosNacional(newVuelta)
        }
      })
    })
  }

  actualizarActivosDOH(region,vuelta?){
    if(region == '20'){
      if(vuelta && vuelta < 16){
        this._ds.activos((String(vuelta).length == 1 ? '0'+vuelta : vuelta)).subscribe((res:any)=>{
          if(res && res.status == '200'){
            this._us.xmlToJson(res).then((result:any)=>{
              if(result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0]){
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0].LOCATIONS
                path.forEach(p=>{
                  if(Number(p.SERVICEADDRESS[0].LATITUDEY[0]) && String(p.LOCATION[0]).includes('SS')){
                    this.activosActualizar[Number(p.SERVICEADDRESS[0].REGIONDISTRICT[0]) - 1].push({
                      "ASSETNUM": p.LOCATION[0],
                      "DESCRIPTION": p.DESCRIPTION[0],
                      "SITEID": p.SITEID[0],
                      "SERVICEADDRESS": {
                        "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                        "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                        "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                      }
                    })
                  }

                })
              }
              const newVuelta = vuelta + 1;
              if(newVuelta > 16){
                this._ds.cargandoActivos = false;
                this._ds.activoRegion = null;
                this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
                this.activosPorRegion = this.activosActualizar;
                this.db.open().then(()=>{
                  this.db.transaction(rx=>{
                    rx.executeSql('delete from activos', [], ()=>{
                      this.activosPorRegion.forEach((a,i)=>{
                        this.activosPorRegion[i].forEach(activo=>{
                          this.db.transaction(tx=>{
                            tx.executeSql('insert into activos (id,name,lat,lng,cod,lugar) values (?,?,?,?,?,?)', [activo.ASSETNUM, activo.DESCRIPTION, activo.SERVICEADDRESS.LATITUDEY, activo.SERVICEADDRESS.LONGITUDEX, activo.SITEID, activo.SERVICEADDRESS.REGIONDISTRICT]);
                          })
                        })
                      })
                    })
                  }).catch(()=>{
                    this.db.executeSql('SELECT * FROM activos', []).then((data)=>{
                      if(data.rows.length > 0){
                        var arr = []
                        var AR = Array.from({length: data.rows.length}, (x, i) => i);
                        this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
                        AR.forEach(i=>{
                          var tmp = {
                            ASSETNUM:data.rows.item(i).id,
                            DESCRIPTION:data.rows.item(i).name,
                            SITEID:data.rows.item(i).cod,
                            SERVICEADDRESS:{
                              REGIONDISTRICT:data.rows.item(i).lugar,
                              LATITUDEY:data.rows.item(i).lat,
                              LONGITUDEX:data.rows.item(i).lng
                            }
                          }
                          this.activosPorRegion[Number(data.rows.item(i).region - 1)].push(tmp)
                        })
                        // this.activosVial = arr;
                      }
                    })     
                  })
                })
              }else{
                this._ds.activoRegion = newVuelta
                this.actualizarActivosDOH(region,newVuelta)
              }
            })
          }else{
            const newVuelta = vuelta + 1;
            if(newVuelta > 16){
              this._ds.cargandoActivos = false;
              this._ds.activoRegion = null;
              this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
              this.activosPorRegion = this.activosActualizar;
              this.db.open().then(()=>{
                this.db.transaction(rx=>{
                  rx.executeSql('delete from activos', [], ()=>{
                    this.activosPorRegion.forEach((a,i)=>{
                      this.activosPorRegion[i].forEach(activo=>{
                        this.db.transaction(tx=>{
                          tx.executeSql('insert into activos (id,name,lat,lng,cod,lugar) values (?,?,?,?,?,?)', [activo.ASSETNUM, activo.DESCRIPTION, activo.SERVICEADDRESS.LATITUDEY, activo.SERVICEADDRESS.LONGITUDEX, activo.SITEID, activo.SERVICEADDRESS.REGIONDISTRICT]);
                        })
                      })
                    })
                  })
                }).catch(()=>{
                  this.db.executeSql('SELECT * FROM activos', []).then((data)=>{
                    if(data.rows.length > 0){
                      var arr = []
                      this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
                      var AR = Array.from({length: data.rows.length}, (x, i) => i);
                      AR.forEach(i=>{
                        var tmp = {
                          ASSETNUM:data.rows.item(i).id,
                          DESCRIPTION:data.rows.item(i).name,
                          SITEID:data.rows.item(i).cod,
                          SERVICEADDRESS:{
                            REGIONDISTRICT:data.rows.item(i).lugar,
                            LATITUDEY:data.rows.item(i).lat,
                            LONGITUDEX:data.rows.item(i).lng
                          }
                        }
                        // arr.push(tmp)
                        this.activosPorRegion[Number(data.rows.item(i).region - 1)].push(tmp)

                      })
                      // this.activosVial = arr;
                    }
                  })     
                })
              })
            }else{
              this._ds.activoRegion = newVuelta
              this.actualizarActivosDOH(region,vuelta+1)
            }
          }
        })
      }else{
        this._ds.cargandoActivos = false;
        this._ds.activoRegion = null;
        this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
        this.activosPorRegion = this.activosActualizar;
        this.db.open().then(()=>{
          this.db.transaction(rx=>{
            rx.executeSql('delete from activos', [], ()=>{
              this.activosPorRegion.forEach((a,i)=>{
                this.activosPorRegion[i].forEach(activo=>{
                  this.db.transaction(tx=>{
                    tx.executeSql('insert into activos (id,name,lat,lng,cod,lugar) values (?,?,?,?,?,?)', [activo.ASSETNUM, activo.DESCRIPTION, activo.SERVICEADDRESS.LATITUDEY, activo.SERVICEADDRESS.LONGITUDEX, activo.SITEID, activo.SERVICEADDRESS.REGIONDISTRICT]);
                  })
                })
              })
            })
          }).then(()=>{
            // Termina de ingresar nivelAlerta
          }).catch(()=>{
            this.db.executeSql('SELECT * FROM activos', []).then((data)=>{
              if(data.rows.length > 0){
                var arr = []
                this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
                var AR = Array.from({length: data.rows.length}, (x, i) => i);
                AR.forEach(i=>{
                  var tmp = {
                    ASSETNUM:data.rows.item(i).id,
                    DESCRIPTION:data.rows.item(i).name,
                    SITEID:data.rows.item(i).cod,
                    SERVICEADDRESS:{
                      REGIONDISTRICT:data.rows.item(i).lugar,
                      LATITUDEY:data.rows.item(i).lat,
                      LONGITUDEX:data.rows.item(i).lng
                    }
                  }
                  // arr.push(tmp)
                  this.activosPorRegion[Number(data.rows.item(i).region - 1)].push(tmp)
                })
                // this.activosVial = arr;
              }
            })     
          })
        })
      }
    }else{
      this._ds.activos().subscribe((res:any)=>{
        if(res && res.status == '200'){
          this._us.xmlToJson(res).then((result:any)=>{
            if(result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0]){
              var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_OPERLOC_DOHRESPONSE[0].MOP_OPERLOC_DOHSET[0].LOCATIONS
              path.forEach(p=>{
                if(Number(p.SERVICEADDRESS[0].LATITUDEY[0]) && String(p.LOCATION[0]).includes('SS')){
                  this.activosActualizar[Number(p.SERVICEADDRESS[0].REGIONDISTRICT[0]) - 1].push({
                    "ASSETNUM": p.LOCATION[0],
                    "DESCRIPTION": p.DESCRIPTION[0],
                    "SITEID": p.SITEID[0],
                    "SERVICEADDRESS": {
                      "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                      "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                      "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                    }
                  })
                }

              })
              this._ds.cargandoActivos = false;
              this._ds.activoRegion = null;
              this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
              this.activosPorRegion = this.activosActualizar;
              this.db.open().then(()=>{
                this.db.transaction(rx=>{
                  rx.executeSql('delete from activos', [], ()=>{
                    this.activosPorRegion.forEach((a,i)=>{
                      this.activosPorRegion[i].forEach(activo=>{
                        this.db.transaction(tx=>{
                          tx.executeSql('insert into activos (id,name,lat,lng,cod,lugar) values (?,?,?,?,?,?)', [activo.ASSETNUM, activo.DESCRIPTION, activo.SERVICEADDRESS.LATITUDEY, activo.SERVICEADDRESS.LONGITUDEX, activo.SITEID, activo.SERVICEADDRESS.REGIONDISTRICT]);
                        })
                      })
                    })
                  })
                }).then(()=>{
                  // Termina de ingresar nivelAlerta
                }).catch(()=>{
                  this.db.executeSql('SELECT * FROM activos', []).then((data)=>{
                    if(data.rows.length > 0){
                      var arr = []
                      this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
                      var AR = Array.from({length: data.rows.length}, (x, i) => i);
                      AR.forEach(i=>{
                        var tmp = {
                          ASSETNUM:data.rows.item(i).id,
                          DESCRIPTION:data.rows.item(i).name,
                          SITEID:data.rows.item(i).cod,
                          SERVICEADDRESS:{
                            REGIONDISTRICT:data.rows.item(i).lugar,
                            LATITUDEY:data.rows.item(i).lat,
                            LONGITUDEX:data.rows.item(i).lng
                          }
                        }
                        // arr.push(tmp)
                        this.activosPorRegion[Number(data.rows.item(i).region - 1)].push(tmp)
                      })
                      // this.activosVial = arr;
                    }
                  })     
                })
              })
            }else{
              this.nohayActivos = true;
            }
          })
        }
      })
    }

  }

  async openSelect(titulo,atributo){
    const modal = await this._modalCtrl.create({
      component: SelectPage,
      showBackdrop:true,
      mode:'ios',
      swipeToClose:true,
      cssClass: 'select-css',
      backdropDismiss:true,
      componentProps:{
        lista:this.nivelAlertaArray,
        titulo:titulo,
      }
    });
    modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      console.log(data)
    }
  }

  seleccionarProvincia(region){
    this.provinciaSelect = []
    this.secondFormGroup.controls['provincia'].reset()
    this.provinciasAll.forEach(p=>{
      if(String(p.VALUE).startsWith(region.VALUE)){
      this.provinciaSelect.push(p)
      }
    })
  }

  seleccionarComuna(provincia){
    this.comunaSelect = []
    this.secondFormGroup.controls['comuna'].reset()
    if(provincia){
      this.comunasAll.forEach(p=>{
        if(String(p.VALUE).startsWith(provincia.VALUE)){
        this.comunaSelect.push(p)
        }
      })
    }
  }

  // FIN CARGAS INICIALES
  // OTROS
  async presentLoader(msg,mode?) {
    this.loader = await this.loadctrl.create({message: msg,mode:!mode ? 'ios' : 'md'});
    await this.loader.present();
  }

  async openModalActivos() {
    const modal = await this._modalCtrl.create({
      component: ModalActivosPage,
      showBackdrop:true,
      mode:'ios',
      swipeToClose:true,
      cssClass: 'my-custom-class',
      backdropDismiss:true,
      breakpoints:[0, 0.5, 0.75, 0.95],
      initialBreakpoint:0.75,
      componentProps:{
        activos:this.activosPorRegion,
        region:this.region,
        posicion:this.dataPosicion.region,
        coord:olProj.toLonLat(this.marker.getGeometry().getCoordinates()),
        regionSelect:this.regionSelect
      }
    });
    if(this.region == '20' || this.region == this.dataPosicion.region){
      modal.present();
      const { data } = await modal.onWillDismiss();
      if (data) {
        this.regionSelect = data.regionSelect
        this.firstFormGroup.controls['activoSeleccionado'].setValue(data.data)
        this.dataPosicion.lat = data.data.SERVICEADDRESS.LATITUDEY;
        this.dataPosicion.lng = data.data.SERVICEADDRESS.LONGITUDEX;
        this.dataPosicion.region = data.data.SERVICEADDRESS.REGIONDISTRICT;
        this.view.setCenter(olProj.transform([data.data.SERVICEADDRESS.LONGITUDEX,data.data.SERVICEADDRESS.LATITUDEY], 'EPSG:4326', 'EPSG:3857'));
        this.obtenerUbicacionRegion()
        this.view.setZoom(15)
      }
    }else{
      this.presentToast('No puedes seleccionar caminos/rutas/activos que no pertenezcan a tu región')
    }
  
  }

  async presentToast(message,duration?,cerrar?,position?) {
    this.toast = await this.toastController.create({
      header:message,
      // message: message,
      cssClass: 'toast-custom-class',
      duration: !cerrar ?(duration ? duration : 4000) : false,
      buttons: !cerrar ? [
        {
          icon: 'close',
          role: 'cancel',
        }
      ] : null,
      position:position ? 'bottom' : 'bottom',
      color:'accordion',
      mode:'ios'
    });
    await this.toast.present();
  }

  moverStepperr(direction){
    if(direction == 'next'){
      this.stepper.next();
    }else{
      this.stepper.previous()
    }
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
  // FIN OTROS
  // CAMARA Y FOTO
  async presentActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Adjuntar Imagen',
      cssClass: 'my-custom-class',
      mode:'ios',
      buttons: [ {
        text: 'Tomar Fotografía',
        icon: 'camera-outline',
        data: 'Camera',
        handler: () => {
          this.selectImage(CameraSource.Camera)
        }
      }, {
        text: 'Adjuntar de la galería',
        icon: 'images-outline',
        data: 'Photo',
        handler: () => {
          this.selectImage(CameraSource.Photos)
        }
      }, {
        text: 'Cancelar',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      }]
    });
    await actionSheet.present();

    const { role, data } = await actionSheet.onDidDismiss();
  }

  async selectImage(tipe:CameraSource){
    const image = await Camera.getPhoto({
      quality:40,
      allowEditing:false,
      resultType:CameraResultType.Uri,
      source:tipe,
      width:700,
      height:700
    });
    if(image){
      this.saveImage(image)
    }
  }

  async saveImage(photo:Photo){
    const base64Data = await this.readAsBase64(photo);
   const fileName = 'foto.jpeg';
   const savedFile = await Filesystem.writeFile({
    directory:Directory.Data,
    path:IMAGE_DIR+"/"+fileName,
    data:base64Data
   })
   this.loadFiles()
  }

  async readAsBase64(photo:Photo){
    if(this.platform.is('capacitor')){
      const file = await Filesystem.readFile({
        path:photo.path
      });
      return file.data
    }else{
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      return await this.convertBlobToBase64(blob) as string;
    }
  }

  convertBlobToBase64 = (blob:Blob) => new Promise((resolve,reject)=>{
    const reader = new FileReader;
    reader.onerror = reject;
    reader.onload = ()=>{
      resolve(reader.result);
    };
    reader.readAsDataURL(blob)
  });

  async loadFiles(){
    this.images = [];
    this.presentLoader('Cargando imagenes ...').then(()=>{
      Filesystem.readdir({
        directory:Directory.Data,
        path:IMAGE_DIR
      }).then(res=>{
        this.loadFileData(res.files)
        this.loader.dismiss()
      }, async err=>{
        this.loader.dismiss()
        await Filesystem.mkdir({
          directory:Directory.Data,
          path:IMAGE_DIR
        }).then(async ()=>{
          await Filesystem.mkdir({
            directory:Directory.Data,
            path:SAVE_IMAGE_DIR
          }).then(()=>{
            this.loader.dismiss()
          }).catch(()=>{
            this.loader.dismiss()
          })
        }).catch(()=>{this.loader.dismiss()})
      })
    }).catch(()=>{
      this.loader.dismiss()
    })
  }

  async loadFileData(fileNames:string[]){
    for (let f of fileNames){
      const filePath = IMAGE_DIR+'/'+f;
      const readFile = await Filesystem.readFile({
        directory:Directory.Data,
        path:filePath
      });
      this.images.push({
        name:f,
        path:filePath,
        data:'data:image/jpeg;base64,'+readFile.data
      })
      this.picture = readFile.data;
    }
  }

  async deleteImage(file:LocalFile){
    await Filesystem.deleteFile({
      directory:Directory.Data,
      path:file.path
    });
    this.loadFiles()
  }

  async crearAlerta(title, msg){
    const alert = await this.alertctrl.create({
      header: title,
      message: msg,
      buttons: ['OK'],
      mode:'ios',
    })
    alert.present()
  }
  // FIN SECCIÓN FOTO
  // ENVIAR ALERTA
   enviar(){
     this._us.cargar_storage().then(()=>{
      let data = {
        titulo:this.thirdFormGroup.value.titulo,
        descripcion:this.thirdFormGroup.value.descripcion ? 'Descripción:\n'+this.thirdFormGroup.value.descripcion : '',
        usuario:this._us.user.user,
        lat:this.dataPosicion.lat,
        lng:this.dataPosicion.lng,
        nivelalerta:this.secondFormGroup.value.nivelAlerta,
        competencia:this.secondFormGroup.value.competencia,
        operatividad:this.secondFormGroup.value.operatividad,
        region:this.dataPosicion.region,
        locations:'',
        date:JSON.stringify(new Date()).replace(/[\\"]/gi,''),
        picture:this.picture,
        name:JSON.stringify(new Date()).replace(/[\\"]/gi,''),
        provincia:'',
        comuna:'',
        elemento:this.secondFormGroup.value.elemento ? this.secondFormGroup.value.elemento : '',
        destino:this.secondFormGroup.value.destino
      }
      data.descripcion = this.thirdFormGroup.value.infraestructura ? data.descripcion+'\n\nInfraestructura Comprometida:\n'+this.thirdFormGroup.value.infraestructura : data.descripcion;
      data.descripcion = this.thirdFormGroup.value.acciones ? data.descripcion+'\n\nAcciones:\n'+this.thirdFormGroup.value.acciones : data.descripcion;
      if(this.firstFormGroup.value.activoSeleccionado){
        data.locations = this.firstFormGroup.value.activoSeleccionado.ASSETNUM
      }else{ 
        data.locations = '';
      } 
      data.locations = ((data.destino == 'DOH-RIEG' || data.destino == 'DOH-ALL' || data.destino == 'DOH-CAUC') ? '' : (data.locations ? data.locations : ''))
      if(this.region != '20' && this.region != this.dataPosicion.region){
        this.crearAlerta('Región no disponible','No se puede enviar emergencia a una región distinta a la configurada para el usuario')
      }else{
        this.presentLoader('Enviando Emergencia ...').then(()=>{
          if(this._us.conexion == 'no'){
            this.db.open().then(()=>{
              this.db.transaction( tx1=>{
                this.db.executeSql('SELECT * FROM alerta', []).then((dat)=>{
                  this.db.transaction(async tx=>{
                    if(dat.rows.length > 0){
                      if(dat.rows.length >= 10){
                        this.loader.dismiss()
                        this.alertasMaximas()
                      }else{
                        tx.executeSql('insert into alerta (id, titulo, descripcion, usuario, lat, lng, nivelalerta, competencia,operatividad, region, name, date,location,error,provincia,comuna,elemento,destino) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                        [(dat.rows.length + 1), data.titulo, data.descripcion, data.usuario, data.lat, data.lng,data.nivelalerta,data.competencia,data.operatividad,data.region,data.name,data.date,data.locations,'internet',data.provincia,data.comuna,data.elemento,data.destino]);
                        this.loader.dismiss()
                        this.estadoEnvioAlerta = 'pendiente'
                        this.openModalEnvio(this.estadoEnvioAlerta)
                        this.presentToast('Se detectó que por el momento no tiene acceso a internet, la emergencia se almacenó y la podrá enviar cuando vuelvas a tener conexión estable de internet, desde el menú de la APP',null,true);
                        if(this.picture){
                          const savedFile = await Filesystem.writeFile({
                            directory:Directory.Data,
                            path:SAVE_IMAGE_DIR+"/"+'save_'+(data.date)+'_foto.jpg',
                            data:this.images[0].data
                            }).then(()=>{
                            this.deleteImage(this.images[0])
                            this.volverInicio()
                            this._us.nextmessage('pendiente') 
                          })
                        }else{
                          this.volverInicio()
                          this._us.nextmessage('pendiente') 
                        }       
                      }
                    }else{
                      tx.executeSql('insert into alerta (id, titulo, descripcion, usuario, lat, lng, nivelalerta,competencia, operatividad,region, name, date,location,error,provincia,comuna,elemento,destino) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                      [1, data.titulo, data.descripcion, data.usuario, data.lat, data.lng,data.nivelalerta,data.competencia,data.operatividad, data.region,data.name,data.date,data.locations,'internet',data.provincia,data.comuna,data.elemento,data.destino]);
                      this.loader.dismiss()
                      this.estadoEnvioAlerta = 'pendiente'
                      this.openModalEnvio(this.estadoEnvioAlerta)
                      this.presentToast('Se detectó que por el momento no tiene acceso a internet, la emergencia se almacenó y la podrá enviar cuando vuelvas a tener conexión estable de internet, desde el menú de la APP',null,true);
                      if(this.picture){
                        const savedFile = await Filesystem.writeFile({
                          directory:Directory.Data, 
                          path:SAVE_IMAGE_DIR+"/"+'save_'+(data.date)+'_foto.jpg',
                          data:this.images[0].data
                          }).then(()=>{
                          this.deleteImage(this.images[0])
                          this.volverInicio()
                          this._us.nextmessage('pendiente') 
                        })
                      }else{
                        this.volverInicio()
                        this._us.nextmessage('pendiente') 
                      }
                      
                    }
                  })
                })
              })
            })
          }else{
            this._ds.enviar(data).subscribe((res:any)=>{
              console.log('**************** RESPUESTA AL ENVIAR FORMULARIO **************', res)
              this.loader.dismiss()
              if(res && res.status == '200'){
                this.db.open().then(()=>{
                  this.db.transaction( tx1=>{
                    this.db.executeSql('SELECT * FROM historial', []).then((dat)=>{
                      this.db.transaction(async tx=>{
                        if(dat.rows.length > 0){
                          tx.executeSql('insert into historial (id, titulo, descripcion, usuario, lat, lng, nivelalerta, competencia,operatividad, region, name, date,location,error,provincia,comuna,elemento,destino) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                          [(dat.rows.length + 1), data.titulo, data.descripcion, data.usuario, data.lat, data.lng,data.nivelalerta,data.competencia,data.operatividad,data.region,data.name,data.date,data.locations,'doh',data.provincia,data.comuna,data.elemento,data.destino]);
                          this.estadoEnvioAlerta = 'exitoso'
                          if(this.picture){
                            this.deleteImage(this.images[0])
                          }
                          this.volverInicio()
                          this.openModalEnvio(this.estadoEnvioAlerta)
                          this.presentToast('Emergencia enviada exitosamente',null,true);
                        }else{
                          tx.executeSql('insert into historial (id, titulo, descripcion, usuario, lat, lng, nivelalerta,competencia, operatividad,region, name, date,location,error,provincia,comuna,elemento,destino) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                          [1, data.titulo, data.descripcion, data.usuario, data.lat, data.lng,data.nivelalerta,data.competencia,data.operatividad, data.region,data.name,data.date,data.locations,'doh',data.provincia,data.comuna,data.elemento,data.destino]);
                          this.estadoEnvioAlerta = 'exitoso'
                          if(this.picture){
                            this.deleteImage(this.images[0])
                          }
                          this.volverInicio()
                          this.openModalEnvio(this.estadoEnvioAlerta)
                          this.presentToast('Emergencia enviada exitosamente',null,true);
                        }
                      })
                    })
                  })
                })
              }else{
                this.intento++
                this.estadoEnvioAlerta = 'fallido'
                this.openModalEnvio(this.estadoEnvioAlerta)
                if(this.intento > 1){
                  this.guardarAlerta(data)
                }else{
                  this.presentToast('La emergencia no pudo ser enviada, favor interlo nuevamente',null,true);
                }
                console.log('******************** ERROR ENVIAR ******************** ')
              }
            },err=>{
              console.log('ERROR DOH-> ',err)
              this.loader.dismiss()
              this.intento++
              this.estadoEnvioAlerta = 'fallido'
              this.openModalEnvio(this.estadoEnvioAlerta)
              if(this.intento > 1){
                this.guardarAlerta(data)
              }else{
                this.presentToast('La emergencia no pudo ser enviada, favor interlo nuevamente',null,true);
              }
              console.log('******************** ERROR ENVIAR ******************** ',err)
            })
          }
        })
      }
     
      // this.stepper.reset()
    })
  }
  
  async guardarAlerta(data){
    const alert = await this.alertctrl.create({
      header: 'Guardar Emergencia',
      message: 'Se ha intentado mas de una vez enviar la emergencia sin resultado exitoso, ¿quisieras guardar la emergencia para enviar con posterioridad?',
      mode:'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
          }
        }, {
          text: 'Si, guardar',
          id: 'confirm-button',
          handler: () => {
            this.db.open().then(()=>{
              this.db.transaction( tx1=>{
                this.db.executeSql('SELECT * FROM alerta', []).then((dat)=>{
                  this.db.transaction(async tx=>{
                    if(dat.rows.length > 0){
                      tx.executeSql('insert into alerta (id, titulo, descripcion, usuario, lat, lng, nivelalerta ,competencia,operatividad, region, name, date,location,error,provincia,comuna,elemento,destino) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                      [(dat.rows.length + 1), data.titulo, data.descripcion, data.usuario, data.lat, data.lng,data.nivelalerta,data.competencia,data.operatividad,data.region,data.name,data.date,data.locations,'desconocido',data.provincia,data.comuna,data.elemento,data.destino]);
                      const savedFile = await Filesystem.writeFile({
                        directory:Directory.Data,
                        path:SAVE_IMAGE_DIR+"/"+'save_'+(dat.rows.length + 1)+'_foto.jpg',
                        data:this.images[0].data
                        }).then(()=>{
                          console.log('ACA GUARDO')
                        if(this.picture){
                          this.deleteImage(this.images[0])
                        }
                        this.volverInicio()
                        this._us.nextmessage('pendiente') 
                      }).catch((err)=>{
                        console.log('NO GUARDO ->',JSON.stringify(err))
                if(this.picture){
                  this.deleteImage(this.images[0])
                }
                                this.volverInicio()
                        this._us.nextmessage('pendiente') 
                      })
                    }else{
                      tx.executeSql('insert into alerta (id, titulo, descripcion, usuario, lat, lng, nivelalerta, competencia,operatividad, region, name, date,location,error,provincia,comuna,elemento,destino) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                      [1, data.titulo, data.descripcion, data.usuario, data.lat, data.lng,data.nivelalerta,data.competencia,data.operatividad,data.region,data.name,data.date,data.locations,'desconocido',data.provincia,data.comuna,data.elemento,data.destino]);
                      const savedFile = await Filesystem.writeFile({
                        directory:Directory.Data, 
                        path:SAVE_IMAGE_DIR+"/"+'save_1_foto.jpg',
                        data:this.images[0].data
                        }).then(()=>{
                          if(this.picture){
                            this.deleteImage(this.images[0])
                          }
                        this.volverInicio()
                        this._us.nextmessage('pendiente') 
                      }).catch(()=>{
                        if(this.picture){
                          this.deleteImage(this.images[0])
                        }
                        this.volverInicio()
                        this._us.nextmessage('pendiente') 
                      })
                    }
                    this.presentToast('La emergencia se almacenó y podras volver a intentarlo nuevamente desde el módulo de pendientes en el menú de la APP',null,true);
                    this.intento = 0;
                  })
                })
              })
            })
          }
        }
      ]
    })
    await alert.present();
  }

  async openModalEnvio(estado) {
    const modal = await this._modalCtrl.create({
      component: ModalEnviarPage,
      showBackdrop:true,
      mode:'ios',
      swipeToClose:true,
      cssClass: 'my-custom-class',
      backdropDismiss:false,
      componentProps:{
        estadoEnvioAlerta:estado,
      }
    });
    modal.present();
    const { data } = await modal.onWillDismiss();
    this.toast.dismiss()
  }

  verAyuda() {
    let navigationExtras: NavigationExtras = {
      queryParams: {
        nomostrar:true            
      }
    }
    this._navCtrl.navigateForward('/help',navigationExtras)
  }

  async alertasMaximas() {
    const alert = await this.alertctrl.create({
      header: 'Límite de alertas',
      message: 'Se ha llegado al límite de 10 alertas almacenadas, por lo cual no se pueden guardar más alertas para enviar con posterioridad',
      buttons: ['OK'],
      mode:'ios'
    });
    await alert.present();
  }

  volverInicio(){
    this.firstFormGroup.reset();
    this.secondFormGroup.reset();
    this.thirdFormGroup.reset();
    this.secondFormGroup.controls['competencia'].setValue('Si')
    // this.stepper.reset();
    this.intento = 0;
    this.picture = null;
    this.tab = 0;
    this._us.cargar_storage().then(()=>{
      if(this._us.conexion == 'si'){
        this.mostrarMapa = true;
        this.internet = true;
      }else{
        this.mostrarMapa = false;
      }
    })
    // this.view.setCenter(this.stgo)
    // this._us.coordenadasRegion.forEach(c=>{
    //   if(c.region == this.region){
    //     this.view.setCenter(olProj.transform([c.lng,c.lat], 'EPSG:4326', 'EPSG:3857'))
    //     this.dataPosicion.lng = Number(c.lng.toFixed(6))
    //     this.dataPosicion.lat = Number(c.lat.toFixed(6))
    //     this.dataPosicion.region = this.region == '20' ? '13' : this.region;
    //   }
    // })
    this.marker.getGeometry().setCoordinates(this.view.getCenter());
    this.view.setZoom(13)
    this.obtenerUbicacionRegion()
  }
  // Animación para modal de envio de alerta
  enterAnimation = (baseEl: HTMLElement) => {
    const root = baseEl.shadowRoot;
    const backdropAnimation = this.animationCtrl
      .create()
      .addElement(root.querySelector('ion-backdrop')!)
      .fromTo('opacity', '0.01', 'var(--backdrop-opacity)');
    const wrapperAnimation = this.animationCtrl
      .create()
      .addElement(root.querySelector('.modal-wrapper')!)
      .keyframes([
        { offset: 0, opacity: '0', transform: 'scale(0)' },
        { offset: 1, opacity: '0.99', transform: 'scale(1)' },
      ]);
    return this.animationCtrl
      .create()
      .addElement(baseEl)
      .easing('ease-out')
      .duration(300)
      .addAnimation([backdropAnimation, wrapperAnimation]);
  };
  leaveAnimation = (baseEl: HTMLElement) => {
    return this.enterAnimation(baseEl).direction('reverse');
  };
  // FIN Animación para modal de envio de alerta
}