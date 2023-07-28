import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { loadModules } from 'esri-loader';
import { UsuarioService } from '../../services/usuario/usuario.service';
import { HttpClient } from '@angular/common/http';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { AlertController, LoadingController, MenuController, Platform, ModalController, ToastController, PopoverController } from '@ionic/angular';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { ModalCaminosPage } from '../modal-caminos/modal-caminos.page';
import { MatStepper } from '@angular/material/stepper';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { Camera, CameraResultType, CameraSource, Photo} from '@capacitor/camera'
import { Directory, Filesystem } from '@capacitor/filesystem';
import { ActionSheetController } from '@ionic/angular';
import { AnimationController } from '@ionic/angular';
import {Image as ImageLayer, Tile } from 'ol/layer';
import ImageArcGISRest from 'ol/source/ImageArcGISRest';
import { ModalEnviarPage } from '../modal-enviar/modal-enviar.page';
import { VialidadService } from 'src/app/services/vialidad/vialidad.service';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import * as olProj from 'ol/proj';
import { addIcons } from 'ionicons';
addIcons({
  'distance': 'assets/img/distance.svg',
  'ruta': 'assets/img/ruta.svg',
  'pin-3': 'assets/img/pin_3.svg',
  'red-vial': 'assets/img/red-vial.svg',
  'red-vial-white': 'assets/img/ruta-white.svg',
  'red-vial-black': 'assets/img/ruta-black.svg',
});
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { PopoverPage } from '../popover/popover.page';
import { PopoverRegionPage } from '../popoverRegion/popoverRegion.page';
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { PopoverFiltroPage } from '../popover-filtro/popover-filtro.page';

const IMAGE_DIR = 'stored-images';
const SAVE_IMAGE_DIR = 'save-stored-images';

interface LocalFile {
  name:string;
  path:string;
  data:string;
}

@Component({
  selector: 'app-home-vialidad',
  templateUrl: './home-vialidad.page.html',
  styleUrls: ['./home-vialidad.page.scss'],
})
export class HomeVialidadPage implements OnInit {
  @ViewChild('stepper')  stepper: MatStepper;
  @ViewChild('modal') modal: ElementRef;
  chile = new VectorLayer({})
  vialidadRedVialURL = 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Red_Vial_Chile/MapServer';
  flVialidad = new MapImageLayer({
    url: this.vialidadRedVialURL
  })
  regiones = null;
  firstFormGroup:FormGroup;
  secondFormGroup:FormGroup;
  thirdFormGroup:FormGroup;
  isLinear = true;
  loader;
  dataPosicion = {lat:0,lng:0,region:'13'}
  db:SQLiteObject;
  images: LocalFile[] = [];
  picture = null;
  estadoEnvioAlerta = null;
  map2;
  view2:any;
  basemap = "streets-vector"
  operatividadArray = [];
  nivelAlertaArray = [];
  caminosEncontrados = []
  region = '13'
  competencia = [{valor:'No',descripcion:'Fuera del Ambito de Competencia MOP'},{valor:'Solo Técnico',descripcion:'Solo Ambito Técnico'},{valor:'Si',descripcion:'Ambito de Competencia MOP'}]
  elementos = []
  transito = []
  restriccion = []
  activosVial = []
  km_i:Number;
  km_f:Number;
  menorI:Boolean;
  mayorI:Boolean;
  mayorIF:Boolean;
  menorF:Boolean;
  menorFI:Boolean;
  mayorF:Boolean;
  toast;
  enviando = false;
  intento = 0;
  mostrarMapa = false;
  activosDVJSON = [];
  buscandoActivos = [];
  hoy;
  home;
  km;
  alturaInicial = 0.1;
  buscando = false;
  tab = 0;
  internet = false;
  footer = true;
  regionSelec;
  redactiva = false
  camino = new Graphic({});
  dibujarCamino = false;
  center;
  fechaActualizar = new Date();
  actualizar = false;
  activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]
  activosActualizar = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]
  iconEnviando = false;
  filtro = 'rol';
  cargoMapa = false;
  actualizando = false;
  constructor(public _vs:VialidadService, private _formBuilder: FormBuilder,public _us:UsuarioService, public platform:Platform,public _http:HttpClient,public _modalCtrl:ModalController,
    private geolocation: Geolocation,public loadctrl:LoadingController,public _mc:MenuController,private sqlite: SQLite,public storage: NativeStorage,private keyboard: Keyboard,public popoverCtrl:PopoverController,
    public toastController:ToastController,public actionSheetController: ActionSheetController,private animationCtrl: AnimationController,public alertctrl:AlertController) { 
      this._us.message.subscribe(res=>{
        if(res == 'conexión establecida sin mapa' || res == 'conexión establecida'){
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
        }
        if(res == 'sin conexión'){
          this.internet = false;
          this.mostrarMapa = false;
          this.buscandoActivos = [];
        }
        if(res == 'enviando'){
          this.iconEnviando = true;
        }
        if(res == 'termino de enviar'){
          this.iconEnviando = false;
        }
      })
      this.keyboard.hideFormAccessoryBar(false)
      this.fechaActualizar = new Date()
    }

  ngOnInit() {
    this.iniciar()
  }

  async reiniciarHome(){
    this.internet = true;
    this.mostrarMapa = true;
    this.tab = 0;
    this.loadMapVialidad()
    // const alert = await this.alertctrl.create({
    //   header: 'Conexión Establecida',
    //   message: 'Se recomienda reiniciar la aplicación para reactiviar todos sus componentes de manera correcta, ¿deseas realizarlo automaticamente?',
    //   // buttons: ['OK'],
    //   mode:'ios',
    //   buttons: [{
    //     text: 'No, lo haré despues',
    //     role: 'cancel',
    //     cssClass: 'secondary',
    //       handler: () => {
    //         this._us.nextmessage('buscarPendientes') 
    //       }
    //     },{
    //       text: 'Si, reiniciar',
    //       id: 'confirm-button',
    //       handler: () => {
    //         window.location.reload()
    //       }
    //     }
    //   ]
    // });
    // await alert.present()

  }

  iniciar(){
    this._us.cargar_storage().then(()=>{
      this.region = this._us.usuario.PERSON.STATEPROVINCE
      this.dataPosicion.region = this.region;
      console.log('FECHA EN EL SERVICIO ->',this._us.fechaActualizacion,this._us.puntero)
      if(!this._us.fechaActualizacion){
        //actualizar activos
        // comparar fechas y buscar la sgte fecha-hora de actualizacion
        this.actualizar = true;
        this._us.horas.forEach((h,i)=>{
          if(this._us.fechaActualizar(this.fechaActualizar,'hora') < (this._us.fechaActualizar(this.fechaActualizar,'fecha')+' '+h)){
            this._us.puntero = i;
            this._us.fechaActualizacion = (this.fechaActualizar)
            this.storage.setItem('fechaActualizacion', JSON.stringify(this._us.fechaActualizacion));
            localStorage.setItem('fechaActualizacion',JSON.stringify(this._us.fechaActualizacion))
            this.storage.setItem('puntero', String(this._us.puntero));
            localStorage.setItem('puntero',String(this._us.puntero))
          }else{
            if((i + 1) > this._us.horas.length){
              this._us.puntero = 0;
              var next = new Date()
              next.setDate(next.getDate() +1)
              this._us.fechaActualizacion = this._us.fechaActualizar(next,'fecha')
              this.storage.setItem('fechaActualizacion', JSON.stringify(this._us.fechaActualizacion));
              localStorage.setItem('fechaActualizacion',JSON.stringify(this._us.fechaActualizacion))
              this.storage.setItem('puntero', String(this._us.puntero));
              localStorage.setItem('puntero',String(this._us.puntero))
            }
          }
        })
      }else{
        // console.log('FECHA EN EL SERVICIO 2 ->',(this._us.fechaActualizar(this._us.fechaActualizacion,'fecha') < this._us.fechaActualizar(this.fechaActualizar,'fecha')),this._us.fechaActualizar(this._us.fechaActualizacion,'fecha'),this._us.fechaActualizar(this.fechaActualizar,'fecha'))
        if(this._us.fechaActualizar(this._us.fechaActualizacion,'fecha') < this._us.fechaActualizar(this.fechaActualizar,'fecha')){
          // ultima actualización fue el dia anterior
          this.actualizar = true;
          this._us.horas.forEach((h,i)=>{
            if(this._us.fechaActualizar(this.fechaActualizar,'hora') < (this._us.fechaActualizar(this.fechaActualizar,'fecha')+' '+h)){
              this._us.puntero = i;
              this._us.fechaActualizacion = (this.fechaActualizar)
              this.storage.setItem('fechaActualizacion', JSON.stringify(this._us.fechaActualizacion));
              localStorage.setItem('fechaActualizacion',JSON.stringify(this._us.fechaActualizacion))
              this.storage.setItem('puntero', String(this._us.puntero));
              localStorage.setItem('puntero',String(this._us.puntero))
            }else{
              if((i + 1) > this._us.horas.length){
                this._us.puntero = 0;
                var next = new Date()
                next.setDate(next.getDate() +1)
                this._us.fechaActualizacion = (next)
                this.storage.setItem('fechaActualizacion', JSON.stringify(this._us.fechaActualizacion));
                localStorage.setItem('fechaActualizacion',JSON.stringify(this._us.fechaActualizacion))
                this.storage.setItem('puntero', String(this._us.puntero));
                localStorage.setItem('puntero',String(this._us.puntero))
              }
            }
          })
        }else{
          // console.log('FECHA EN EL SERVICIO 3 ->',(this._us.fechaActualizar(this._us.fechaActualizacion,'fecha') == this._us.fechaActualizar(this.fechaActualizar,'fecha')),(this._us.fechaActualizar(this._us.fechaActualizacion,'fecha'), this._us.fechaActualizar(this.fechaActualizar,'fecha')))
          if((this._us.fechaActualizar(this._us.fechaActualizacion,'fecha') == this._us.fechaActualizar(this.fechaActualizar,'fecha'))){
          // buscar si hay hora disponible para actualziar el día actual
          // console.log('FECHA EN EL SERVICIO 4 ->',this._us.fechaActualizar(this.fechaActualizar,'hora') > (this._us.fechaActualizar(this.fechaActualizar,'fecha')+' '+this._us.horas[this._us.puntero]),this._us.fechaActualizar(this.fechaActualizar,'hora'), (this._us.fechaActualizar(this.fechaActualizar,'fecha')+' '+this._us.horas[this._us.puntero]))
            if(this._us.fechaActualizar(this.fechaActualizar,'hora') > (this._us.fechaActualizar(this.fechaActualizar,'fecha')+' '+this._us.horas[this._us.puntero])){
              // le toca actualizar
              this.actualizar = true;
              this._us.puntero = (this._us.puntero + 1) >= 4 ? 0 : (this._us.puntero + 1)
              if(this._us.puntero = 0){
                var next = new Date()
                next.setDate(next.getDate() +1)
                this._us.fechaActualizacion = (next)
              }else{
                this._us.fechaActualizacion = (this.fechaActualizar)
              }
              this.storage.setItem('fechaActualizacion', JSON.stringify(this._us.fechaActualizacion));
              localStorage.setItem('fechaActualizacion',JSON.stringify(this._us.fechaActualizacion))
              this.storage.setItem('puntero', String(this._us.puntero));
              localStorage.setItem('puntero',String(this._us.puntero))
            }else{
              console.log('debe esperar sgte horario para actualizar')
              this.actualizar = false;
            }
          }else{
            // debe esperar hasta mañana para actualizar
            console.log('debe esperar hasta mañana para actualizar')
            this.actualizar = false;
          }
        }
      }
      this._us.nextmessage('usuario_logeado') 
      if(this._us.conexion == 'si'){
        this.mostrarMapa = true;
        this.storage.setItem('seleccionMapa', 'si');
        localStorage.setItem('seleccionMapa','si')
        this.internet = true;
        this._us.cargar_storage().then(()=>{})
        this.loadMapVialidad()
      }else{
        this.mostrarMapa = false;
        this.storage.setItem('seleccionMapa', 'no');
        localStorage.setItem('seleccionMapa','no')
        this.internet = false;
        this._us.coordenadasRegion.forEach(c=>{
          if(c.region == this.region){
            this.dataPosicion.lng = Number(c.lng.toFixed(6))
            this.dataPosicion.lat = Number(c.lat.toFixed(6))
          }
        })
        this._us.cargar_storage().then(()=>{})
      }
      this.loadFiles()
      setTimeout(()=>{
        this.obtenerGeolocalizacion()
      },1000)
    if(this.platform.is('capacitor')){
      this.sqlite.create({name:'mydbAlertaTemprana',location:'default',createFromLocation:1}).then((db:SQLiteObject)=>{
        db.executeSql('CREATE TABLE IF NOT EXISTS nivelAlerta (id unique, name)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS transito (id unique, name)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS elemento (id unique, name)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS restriccion (id unique, name)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS activosVialidad (id, nombre,km_i,km_f,region,rol)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS alertaVialidad (id, titulo, descripcion, fechaEmergencia, usuario, lat, lng, nivelalerta, region, name, date,codigo,elemento,transito,restriccion,competencia,km_i,km_f,error)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS historial (id, titulo, descripcion, fechaEmergencia, usuario, lat, lng, nivelalerta, region, name, date,codigo,elemento,transito,restriccion,competencia,km_i,km_f,error)',[]);
        this.db = db;
        this.nivelAlerta();
        // this.elemento();
        this.transitos()
        this.restriccioN();
        if(this.region == '20'){
          this.regionSelec = null;
          this.activosVialidad('20');
        }else{
          this.regionSelec = this.region;
          this.activosVialidad(this.region);
        }
        this.competencia = this.sortJSON(this.competencia,'VALUE','asc')
      })
    }else{
      this.nivelAlerta();
      // this.elemento();
      this.transitos()
      this.restriccioN();
      if(this.region == '20'){
        this.regionSelec = null;
        this.activosVialidad('20');
      }else{
        this.regionSelec = this.region;
        this.activosVialidad(this.region);
      }
      this.competencia = this.sortJSON(this.competencia,'VALUE','asc')
    }
  })
    this.firstFormGroup = this._formBuilder.group({
      activoSeleccionado: [null,Validators.compose([Validators.required])],
      fechaEmergencia: [null,Validators.compose([Validators.required])],
      km_i: [null,Validators.compose([Validators.required])],
      km_f: [null,Validators.compose([Validators.required])],
    });
    this.secondFormGroup = this._formBuilder.group({
      elemento:[null],
      transito:[null,Validators.compose([Validators.required])],
      restriccion:[null],
      nivelAlerta:[null,Validators.compose([Validators.required])],
      competencia:['Si',Validators.compose([Validators.required])]
    })
    this.thirdFormGroup = this._formBuilder.group({
      titulo: [null,Validators.compose([Validators.maxLength(100),Validators.required])],
      descripcion: [null,Validators.compose([Validators.maxLength(300)])],
    });
  }

  myFunction(ev,lugar){
    if(lugar == 'i'){
      this.firstFormGroup.controls['km_i'].setValue(((ev.target.value).replace(/,./gi,'.')))
      if(Number(this.firstFormGroup.value.km_i) > Number(this.km_f)){
        this.mayorI = true;
        this.menorI = false;
        if(this.firstFormGroup.value.km_f && (Number(this.firstFormGroup.value.km_i) > Number(this.firstFormGroup.value.km_f))){
          this.mayorIF = true;
        }else{
          this.mayorIF = false;
        }
      }else{
        if(Number(this.firstFormGroup.value.km_i) < Number(this.km_i)){
          this.menorI = true;
          this.mayorI = false;
          if(this.firstFormGroup.value.km_f && (Number(this.firstFormGroup.value.km_i) > Number(this.firstFormGroup.value.km_f))){
            this.mayorIF = true;
          }else{
            this.mayorIF = false;
          }
        }else{
          this.menorI = false;
          this.mayorI = false;
          if(this.firstFormGroup.value.km_f && (Number(this.firstFormGroup.value.km_i) > Number(this.firstFormGroup.value.km_f))){
            this.mayorIF = true;
          }else{
            this.mayorIF = false;
          }
        }
      }
      if(this.firstFormGroup.value.km_f){
        if(Number(this.firstFormGroup.value.km_f) > Number(this.km_f)){
          this.mayorF = true;
          this.menorF = false;
          if(this.firstFormGroup.value.km_i && (Number(this.firstFormGroup.value.km_f) < Number(this.firstFormGroup.value.km_i))){
            this.menorFI = true;
          }else{
            this.menorFI = false;
          }
        }else{
          if(Number(this.firstFormGroup.value.km_f) < Number(this.km_i)){
            this.menorF = true;
            this.mayorF = false;
            if(this.firstFormGroup.value.km_i && (Number(this.firstFormGroup.value.km_f) < Number(this.firstFormGroup.value.km_i))){
              this.menorFI = true;
            }else{
              this.menorFI = false;
            }
          }else{
            this.menorF = false;
            this.mayorF = false;
            if(this.firstFormGroup.value.km_i && (Number(this.firstFormGroup.value.km_f) < Number(this.firstFormGroup.value.km_i))){
              this.menorFI = true;
            }else{
              this.menorFI = false;
            }
          }
        }
      }
    }else{
      this.firstFormGroup.controls['km_f'].setValue(((ev.target.value).replace(/,./gi,'.')))
      if(Number(this.firstFormGroup.value.km_f) > Number(this.km_f)){
        this.mayorF = true;
        this.menorF = false;
        if(this.firstFormGroup.value.km_i && (Number(this.firstFormGroup.value.km_f) < Number(this.firstFormGroup.value.km_i))){
          this.menorFI = true;
        }else{
          this.menorFI = false;
        }
      }else{
        if(Number(this.firstFormGroup.value.km_f) < Number(this.km_i)){
          this.menorF = true;
          this.mayorF = false;
          if(this.firstFormGroup.value.km_i && (Number(this.firstFormGroup.value.km_f) < Number(this.firstFormGroup.value.km_i))){
            this.menorFI = true;
          }else{
            this.menorFI = false;
          }
        }else{
          this.menorF = false;
          this.mayorF = false;
          if(this.firstFormGroup.value.km_i && (Number(this.firstFormGroup.value.km_f) < Number(this.firstFormGroup.value.km_i))){
            this.menorFI = true;
          }else{
            this.menorFI = false;
          }
        }
      }
      if(this.firstFormGroup.value.km_i){
        if(Number(this.firstFormGroup.value.km_i) > Number(this.km_f)){
          this.mayorI = true;
          this.menorI = false;
          if(this.firstFormGroup.value.km_f && (Number(this.firstFormGroup.value.km_i) > Number(this.firstFormGroup.value.km_f))){
            this.mayorIF = true;
          }else{
            this.mayorIF = false;
          }
        }else{
          if(Number(this.firstFormGroup.value.km_i) < Number(this.km_i)){
            this.menorI = true;
            this.mayorI = false;
            if(this.firstFormGroup.value.km_f && (Number(this.firstFormGroup.value.km_i) > Number(this.firstFormGroup.value.km_f))){
              this.mayorIF = true;
            }else{
              this.mayorIF = false;
            }
          }else{
            this.menorI = false;
            this.mayorI = false;
            if(this.firstFormGroup.value.km_f && (Number(this.firstFormGroup.value.km_i) > Number(this.firstFormGroup.value.km_f))){
              this.mayorIF = true;
            }else{
              this.mayorIF = false;
            }
          }
        }
      }
    }
  }

  async loadMapVialidad(){
      this.map2 = new Map({
        basemap: 'streets-vector'
      });
      this.view2 = new MapView({
        container: "container", 
        zoom: 13,
        map: this.map2,
        spatialReference:{wkid:3857},
        constraints : {
          minZoom :5,
          maxZoom:18
        },
      });
      let pointInicial = {longitude:-70.65266161399654,latitude:-33.44286267068381};
      this._us.coordenadasRegion.forEach(c=>{
        if(c.region == this.region){
          this.view2.center = [c.lng,c.lat]
          pointInicial = {longitude:c.lng,latitude:c.lat};
          this.home = pointInicial;
          this.dataPosicion.lng = Number(c.lng.toFixed(6))
          this.dataPosicion.lat = Number(c.lat.toFixed(6))
          this.dataPosicion.region = this.region;
        }
      })
      // this.agregarPuntero(pointInicial,Graphic)
      this.view2.on("click", (e:any)=>{
        let point = this.view2.toMap(e);
        // this.view2.center = [point.longitude, point.latitude]
        // this.view2.zoom = 16
        // this.agregarPuntero(point,Graphic)
        this.obtenerUbicacionRegion(point)
        // this.buscarCamino(e,this.vialidadRedVialURL)
      });
      this._http.get('assets/maps/chile.geojson').subscribe((chileJSON:any)=>{
        this.chile = new VectorLayer({
          source:new VectorSource({
            features: new GeoJSON().readFeatures(chileJSON),
          })
        })
        this.view2.on("drag",{action:'end'}, (e)=>{
            let point2 = {
              type: "point",
              longitude: this.view2.center.longitude,
              latitude: this.view2.center.latitude
            };
            this.obtenerUbicacionRegion(point2)
          })
      })
    
  }

  agregarPuntero(point,Graphics?,puntero2?){
    this.view2.goTo({
      center:[point.longitude,point.latitude]
    })
    let point2 = {
      type: "point",
      longitude: point.longitude,
      latitude: point.latitude
      // longitude: -71.015,
      // latitude: -30.004
    };
    let markerSymbol = {
      type: "picture-marker",
      url: !puntero2 ? "assets/img/pin.png" : "assets/img/pin_2.png",
      width: "50px",
      height: "40px"
    };

    let pointGraphic = new Graphic({
      geometry: point2 as any,
      symbol: markerSymbol as any,
      popupTemplate:null
    });
    if(puntero2){
      this.view2.zoom = 16
    }
    this.view2.graphics.removeAll();
    this.view2.graphics.add(pointGraphic);
  }

  obtenerUbicacionRegion(point){
    var curr =  [point.longitude,point.latitude] ;
    this.dataPosicion.lat = Number(curr[1].toFixed(6));
    this.dataPosicion.lng = Number(curr[0].toFixed(6));
    var region;
    this.regiones = this.chile.getSource().getFeatures();
    for (var i in this.regiones) {
        var polygonGeometry = this.regiones[i].getGeometry();
        var coords = [point.longitude.toFixed(3),point.latitude.toFixed(3)] ;
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
  
 async centrarInicial(){
  const [Graphic]:any = await loadModules([
    'esri/Graphic',
  ])
    .catch(err => {
      console.error("ArcGIS: ", err);
    });
  this.view2.center = [this.home.longitude,this.home.latitude]
  this.dataPosicion.lng = Number(this.home.longitude.toFixed(6))
  this.dataPosicion.lat = Number(this.home.latitude.toFixed(6))
  // this.agregarPuntero(this.home,Graphic)
  this.firstFormGroup.reset();
  this.secondFormGroup.reset();
  this.secondFormGroup.controls['competencia'].setValue('Si')
  this.thirdFormGroup.reset();
  this.caminosEncontrados = []
  this.obtenerUbicacionRegion(this.home)
  this.view2.zoom = 13
  }

  async buscarCamino(e?,vialidadRedVialURL?){
      this.view2.graphics.remove(this.camino)
      this.dibujarCamino = false;
      this.firstFormGroup.reset();
      this.secondFormGroup.reset();
      this.secondFormGroup.controls['competencia'].setValue('Si')
      this.thirdFormGroup.reset();
      this.caminosEncontrados = []
      this.tab = 0;
      this.caminosEncontrados = []
      this.menorI = false;
      this.mayorI = false;
      this.menorF = false;
      this.mayorF = false;
      this.menorFI = false;
      this.mayorIF = false;
      this.buscando = true;
      if(!this.firstFormGroup.value.activoSeleccionado){
        this.presentToast('Buscando camino ...',null,true,null)
      }
      this.center = this.view2.center
      var extent:any = Array(this.view2.extent.xmin/100000,this.view2.extent.ymin/100000,this.view2.extent.xmax/100000,this.view2.extent.ymax/100000)
      extent = (String(extent).substring(0,String(extent).length -1)).replace(/,/gi,'%2C')
      this._vs.obtenerCapas(this.center.longitude,this.center.latitude,extent).then((response:any)=>{
        this.firstFormGroup.controls['activoSeleccionado'].reset()
        this.buscando = false;
        if(response.results.length > 0){
          let fueraregion = false;
          let temp = []
          response.results.forEach(r=>{
            let region = r.attributes['REGIÓN'];
            region = this.reverseRegion(region)            
            if(region != this.region && this.region != '20'){
              fueraregion = true;
            }else{
              temp.push({
                codigo:r.attributes['CÓDIGO DEL CAMINO'],
                nombre_camino:r.attributes['NOMBRE DEL CAMINO'],
                km_i:(Number(r.attributes['KM INICIAL'])/1000) != 0 ? (Number(r.attributes['KM INICIAL'])/1000).toFixed(2) : (Number(r.attributes['KM INICIAL'])/1000),
                km_f:(Number(r.attributes['KM FINAL'])/1000) != 0 ? (Number(r.attributes['KM FINAL'])/1000).toFixed(2) : (Number(r.attributes['KM FINAL'])/1000),
                objectid:r.attributes.OBJECTID,
                rol:r.attributes.ROL,
                clasificacion:r.attributes['CLASIFICACIÓN'],
                tramo:r.attributes['LONGITUD DEL TRAMO'] ?  new Intl.NumberFormat("en-US").format(r.attributes['LONGITUD DEL TRAMO']) :  new Intl.NumberFormat("en-US").format((r.attributes['KM FINAL']) - (r.attributes['KM INICIAL'])) ,
                latitude:this.center.latitude,
                longitude:this.center.longitude,
                region:region,
                puntoInicial:r.geometry.paths[0]
              })
            }
          })
          if(fueraregion){
            this.buscando = false;
            this.caminosEncontrados = [];
            this.toast.dismiss()
            this.presentToast('No puedes seleccionar caminos/rutas/activos que no pertenezcan a tu región',null,true,true)
          }else{
            this.toast.dismiss()
            temp = this.eliminarObjetosDuplicados(temp,'codigo')
            setTimeout(()=>{
              if(temp.length == 1){
                var itemNew = temp[0].codigo
                const reg = Number(temp[0].region);
                var existeMAXIMO = this.activosPorRegion[reg - 1].filter((item) => {
                  return (item.codigo.indexOf(itemNew) > -1);
                })
                if(existeMAXIMO.length > 0){
                  this.caminosEncontrados = temp;
                  this.firstFormGroup.controls['activoSeleccionado'].setValue(this.caminosEncontrados[0])
                  this.km_i = existeMAXIMO[0].km_i;
                  this.km_f = existeMAXIMO[0].km_f;
                  this.firstFormGroup.controls['km_i'].setValue( existeMAXIMO[0].km_i == 0 ? '0' : existeMAXIMO[0].km_i)
                  this.firstFormGroup.controls['km_f'].setValue( existeMAXIMO[0].km_f == 0 ? '0' : existeMAXIMO[0].km_f)
                  this.firstFormGroup.controls['fechaEmergencia'].setValue(this._us.fecha(new Date()))
                  this.hoy = this._us.fecha(new Date())
                  var calculos = []
                  this.caminosEncontrados[0].puntoInicial.forEach((p,i)=>{
                    var kilometro = Number(this.getKilometros(p[1],p[0],this.caminosEncontrados[0].latitude,this.caminosEncontrados[0].longitude));
                    calculos.push({vertice:p,kilometro:kilometro,posicion:i})
                  })
                  calculos = this.sortJSON(calculos,'kilometro','asc')
                  this.km = Number(calculos[0].kilometro + Number(calculos[0].vertice[3]/1000)).toFixed(1)
                  this.buscando = false;
                  this.tab = 1;
                  const validacionKM = (Number(this.km) > Number(this.firstFormGroup.value.km_f)) ? this.firstFormGroup.value.km_f : (Number(this.km) < Number(this.firstFormGroup.value.km_i) ? this.firstFormGroup.value.km_i :this.km)
                  // this.myFunction({target:{value:validacionKM}},'i')
                  this.firstFormGroup.controls['km_i'].setValue(validacionKM)
                  this.mostrarMapa = false;
                  this.presentToast('Se encontro un camino, favor ingresar la información complementaria',null,false)
                  this.view2.graphics.remove(this.camino)
                  var layer = new FeatureLayer( {
                    url:this.vialidadRedVialURL+'/3',
                    definitionExpression:'',
                    outFields : [ '*' ],		});
                  let query = {
                    outFields:[],
                    returnGeometry:true,
                    where:''
                  }
                  query.outFields = ['*'];
                  query.where =  "OBJECTID = '"+this.caminosEncontrados[0].objectid+"'";
                  query.returnGeometry =  true;
                  layer.queryFeatures(query).then(result =>{
                    if(result && result.features[0]){
                      let symbolTerritory = {
                        type: "simple-fill",
                        color: [207, 226, 99, 0],
                        style: "solid",
                        outline: {
                          color: "cyan",
                          width: 3
                        }
                      };
                      this.camino = new Graphic({
                        symbol: symbolTerritory,
                        geometry: result.features[0].geometry,
                      });
                      this.view2.graphics.add(this.camino)
                      // this.view2.goTo(this.camino.geometry);
                      this.dibujarCamino = true;
                    }
                  })
                  // this.agregarPuntero(e.mapPoint,Graphic,true)
                }else{
                  this.firstFormGroup.reset();
                  this.secondFormGroup.reset();
                  this.secondFormGroup.controls['competencia'].setValue('Si')
                  this.thirdFormGroup.reset();
                  this.caminosEncontrados = []
                  this.tab = 0;
                  this.km = 0;
                  this.mostrarMapa = true;
                  this.presentToast('El codigo '+itemNew+' del camino seleccionado no se ha encontrado en la base de datos de MAXIMO',null,false,true)
                  // this.agregarPuntero(e.mapPoint,Graphic,false)
                }
              }else{
                this.caminosEncontrados = temp;
                this.km = 0;
                this.mostrarMapa = false;
                this.tab = 1;
                this.buscando = false;
                this.presentToast('Se encontraron '+this.caminosEncontrados.length+' caminos, favor seleccionar el correspondiente',null,false)
                // this.agregarPuntero(e.mapPoint,Graphic,false)
              }
            },500)
          }
        }else{
          this.buscando = false;
          this.caminosEncontrados = []
          this.toast.dismiss().then(()=>{
            this.presentToast('No se han encontrado caminos cercanos al punto seleccionado',null,false,true)
          });
          // this.agregarPuntero(e.mapPoint,Graphic,false)
        }
      }).catch(err=>{
        this.caminosEncontrados = [];
        // this.agregarPuntero(e.mapPoint,Graphic,false)
        this.buscando = false; 
        if(!this.firstFormGroup.value.activoSeleccionado){
          if(this.toast){
            this.toast.dismiss();
          }
        }
      })
  }

  getKilometros(lat1,lon1,lat2,lon2){
    // console.log(lat1,lon1,lat2,lon2)
    var rad = function(x) {return x*Math.PI/180;}
    var R = 6378.137; //Radio de la tierra en km
    var dLat = rad( lat2 - lat1 );
    var dLong = rad( lon2 - lon1 );
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLong/2) * Math.sin(dLong/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d.toFixed(5); //Retorna tres decimales
 }

  reverseRegion(CAMPO){
    if (CAMPO=='Región de Arica y Parinacota'){
      return '15'
    }else if(CAMPO == 'Región de Tarapacá'){
      return '01'
    }else if(CAMPO == 'Región de Antofagasta'){
      return '02'
    }else if(CAMPO == 'Región de Atacama'){
      return '03'
    }else if(CAMPO == 'Región de Coquimbo'){
      return '04'
    }else if(CAMPO == 'Región de Valparaíso'){
      return '05'
    }else if(CAMPO == 'Región Metropolitana de Santiago'){
      return '13'
    }else if(CAMPO == "Región del Libertador General Bernardo O'Higgins"){
      return '06'
    }else if(CAMPO == 'Región del Maule'){
      return '07'
    }else if(CAMPO == 'Región de Ñuble'){
      return '16'
    }else if(CAMPO == 'Región del Biobío'){
      return '08'
    }else if(CAMPO == 'Región de La Araucanía'){
      return '09'
    }else if(CAMPO == 'Región de Los Ríos'){
      return '14'
    }else if(CAMPO == 'Región de Los Lagos'){
      return '10'
    }else if(CAMPO == 'Región Aysén del General Carlos Ibáñez del Campo'){
      return '11'
    }else if(CAMPO == 'Región de Magallanes y La Antártica Chilena'){
      return '12'
    }
  }

  eliminarObjetosDuplicados(arr, prop) {
    var nuevoArray = [];
    var lookup  = {};
    for (var i in arr) {
        lookup[arr[i][prop]] = arr[i];
    }
  
    for (i in lookup) {
        nuevoArray.push(lookup[i]);
    }
  
    return nuevoArray;
  }

  customZoom(){
    if(this.basemap == "streets-vector"){
      this.map2.basemap = 'streets-relief-vector' 
      this.basemap = 'streets-relief-vector' 
    }else{
      this.map2.basemap = 'streets-vector' 
      this.basemap = 'streets-vector' 
    }
  }

  obtenerGeolocalizacion(){
    this.presentToast('Localizando ...').then(()=>{
      this.geolocation.getCurrentPosition().then((resp) => {
        this.dataPosicion.lat = resp.coords.latitude
        this.dataPosicion.lng = resp.coords.longitude
        let point = {
          type: "point",
          longitude: this.dataPosicion.lng,
          latitude: this.dataPosicion.lat
        };
        this.obtenerUbicacionRegion(point)
        if(this.internet){
          loadModules(['esri/Graphic']).then(([Graphic]) => {
            this.view2.graphics.removeAll();
            let markerSymbol = {
              type: "picture-marker",
              url: "assets/img/pin_2.png",
              width: "50px",
              height: "40px"
            };
            let pointGraphic = new Graphic({
              geometry: point as any,
              symbol: markerSymbol as any,
              popupTemplate:null
            });
            // this.view2.graphics.add(pointGraphic);
            this.view2.center = [this.dataPosicion.lng, this.dataPosicion.lat]
            this.view2.zoom = 15;  
            }).catch(err=>{
              console.log('err')
          })
        }
      this.toast.dismiss();          
      }).catch(async (error) => {
        this.toast.dismiss();
        const alert = await this.alertctrl.create({
          header: 'Debes activar el GPS y permitir la localización',
          buttons: ['OK'],
          mode:'ios',
        });
        await alert.present()
        console.log('Error getting location', error);
      });
      }).catch(async ()=>{
        const alert = await this.alertctrl.create({
          header: 'Debes activar el GPS y permitir la localización',
          buttons: ['OK'],
          mode:'ios',
        });
        await alert.present()
        this.toast.dismiss();
      })
  }

  async presentLoader(msg) {
    this.loader = await this.loadctrl.create({message: msg,mode:'ios'});
    await this.loader.present();
  }

  async presentToast(message,duration?,cerrar?,css?,position?) {
    this.toast = await this.toastController.create({
      message: message,
      cssClass: !css ? 'toast-custom-class' : 'toast-custom-classErr',
      duration: !cerrar ?(duration ? duration : 4000) : false,
      buttons: [
        {
          icon: 'close',
          role: 'cancel',
        }
      ],
      mode:'ios',
      color:'accordion',
      position:position ? position : 'bottom'
    });
    await this.toast.present();
  }

  async openModalCaminos() {
    const modal = await this._modalCtrl.create({
      component: ModalCaminosPage,
      showBackdrop:true,
      mode:'ios',
      swipeToClose:true,
      cssClass: 'my-custom-class',
      backdropDismiss:true,
      breakpoints:[0, 0.5, 0.75, 0.95, 1],
      initialBreakpoint:0.75,
      componentProps:{
        caminos:this.caminosEncontrados,
      }
    });
    modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.menorI = false;
      this.mayorI = false;
      this.menorF = false;
      this.mayorF = false;
      this.menorFI = false;
      this.mayorIF = false;
      var itemNew = data.codigo
      const reg = Number(data.region);
      var existeMAXIMO = this.activosPorRegion[reg - 1].filter((item) => {
        return (item.codigo.indexOf(itemNew) > -1);
      })
      if(existeMAXIMO.length > 0){
        this.firstFormGroup.controls['activoSeleccionado'].setValue(data)
        this.km_i = existeMAXIMO[0].km_i;
        this.km_f = existeMAXIMO[0].km_f;
        this.firstFormGroup.controls['km_i'].setValue( existeMAXIMO[0].km_i == 0 ? '0' : existeMAXIMO[0].km_i)
        this.firstFormGroup.controls['km_f'].setValue( existeMAXIMO[0].km_f == 0 ? '0' : existeMAXIMO[0].km_f) 
        this.firstFormGroup.controls['fechaEmergencia'].setValue(this._us.fecha(new Date()))
        this.hoy = this._us.fecha(new Date())
        var calculos = []
        data.puntoInicial.forEach((p,i)=>{
          var kilometro = Number(this.getKilometros(p[1],p[0],data.latitude,data.longitude));
          calculos.push({vertice:p,kilometro:kilometro,posicion:i})
        })
        calculos = this.sortJSON(calculos,'kilometro','asc')
        this.km = Number(calculos[0].kilometro + Number(calculos[0].vertice[3]/1000)).toFixed(1)
        console.log(this.km,this.km_i,this.km_f,Number(this.km) > Number(this.firstFormGroup.value.km_f),Number(this.km) < Number(this.firstFormGroup.value.km_i))
        const validacionKM = (Number(this.km) > Number(this.firstFormGroup.value.km_f)) ? this.firstFormGroup.value.km_f : (Number(this.km) < Number(this.firstFormGroup.value.km_i) ? this.firstFormGroup.value.km_i :this.km)
        // this.myFunction({target:{value:validacionKM}},'i')
        this.firstFormGroup.controls['km_i'].setValue(validacionKM)
        this.buscando = false;
        this._us.seleccionMapa = 'si';
        this.view2.graphics.remove(this.camino)
        var layer = new FeatureLayer( {
          url:this.vialidadRedVialURL+'/3',
          definitionExpression:'',
          outFields : [ '*' ],		});
        let query = {
          outFields:[],
          returnGeometry:true,
          where:''
        }
        query.outFields = ['*'];
        query.where =  "OBJECTID = '"+data.objectid+"'";
        query.returnGeometry =  true;
        layer.queryFeatures(query).then(result =>{
          if(result && result.features[0]){
            let symbolTerritory = {
              type: "simple-fill",
              color: [207, 226, 99, 0],
              style: "solid",
              outline: {
                color: "cyan",
                width: 3
              }
            };
            this.camino = new Graphic({
              symbol: symbolTerritory,
              geometry: result.features[0].geometry,
            });
            this.view2.graphics.add(this.camino)
            // this.view2.goTo(this.camino.geometry);
            this.dibujarCamino = true;
          }
        })
        this._us.cargar_storage().then(()=>{})
      }else{
        this.firstFormGroup.reset();
        this.secondFormGroup.reset();
        this.secondFormGroup.controls['competencia'].setValue('Si')
        this.thirdFormGroup.reset();
        this.km = 0;
        this.view2.graphics.remove(this.camino)
        this.dibujarCamino = false;
        this.presentToast('El codigo '+itemNew+' del camino seleccionado no se ha encontrado en la base de datos de MAXIMO',null,false,true)
      }      
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

  abrirModal(){
    var modal = document.querySelector('ion-modal');
    modal.present().then(()=>{})
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
        const reg = String(Number(data.data.region) + 1).length == 1 ? '0'+(Number(data.data.region) + 1) : String(Number(data.data.region) + 1);
        this._us.coordenadasRegion.forEach(c=>{
          if(c.region == reg){
            this.view2.center = [c.lng,c.lat]
            this.dataPosicion.lng = Number(c.lng.toFixed(6))
            this.dataPosicion.lat = Number(c.lat.toFixed(6))
            this.dataPosicion.region = reg;
          }
        })
       }
      } 
    })
    return await popover.present();
  }

  async presentPopoverFiltro(myEvent) {
    const popover = await this.popoverCtrl.create({
      component: PopoverFiltroPage,
      translucent: true,
      cssClass: 'my-custom-modal-css',
      showBackdrop:true,
      mode:'ios',
      event: myEvent,
      componentProps:{
        filtro:this.filtro,
      }
    });
    popover.onDidDismiss().then(data=>{
      if(data.data){
       if(data.data.filtro){
        this.filtro = data.data.filtro
       }
      } 
    })
    return await popover.present();
  }

  buscarActivos(ev: any) {
    const val = ev.target.value;
    if (this.filtro == 'nombre' ? (val && val.trim() != '' && val.length >= 3 ) : (val && val.trim() != '' && val.length >= 2 )) {
      this.buscandoActivos = this.activosPorRegion[this.region == '20' ? this.regionSelec : (Number(this.region) - 1)].filter((item) => {
        return (this.filtro == 'nombre' ? (item.nombre.toLowerCase().indexOf(val.toLowerCase()) > -1) : item.rol.toLowerCase().indexOf(val.toLowerCase()) > -1);
      })
    }else{
      this.buscandoActivos = []
    }
  }

  seleccionarActivo(data){
    this.firstFormGroup.reset();
    this.secondFormGroup.reset();
    this.secondFormGroup.controls['competencia'].setValue('Si')
    this.thirdFormGroup.reset();
    this.dibujarCamino = false;
    let body = {
      codigo:data.codigo,
      nombre_camino:data.nombre,
      region:data.region,
      rol:data.rol
    }
    if(this.internet && this.mostrarMapa){
      this.center = this.view2.center
    }else{
      this.center = {
        longitude:this.dataPosicion.lng,
        latitude:this.dataPosicion.lat
      }
    }
    this.dataPosicion.region = data.region;
    this.caminosEncontrados = [];
    this.caminosEncontrados.push(body)
    this.firstFormGroup.controls['activoSeleccionado'].setValue(body)
    this.km = null;
    this.km_i = data.km_i;
    this.km_f = data.km_f;
    this.firstFormGroup.controls['km_i'].setValue( data.km_i == 0 ? '0' : data.km_i)
    this.firstFormGroup.controls['km_f'].setValue( data.km_f == 0 ? '0' : data.km_f)
    // this.mayorF = false;this.mayorI = false;this.menorF = false;this.menorI = false;this.menorFI = false;this.mayorIF = false;
    this.buscandoActivos = [];
    this.tab = 1;
    this.mostrarMapa = false;
    this._us.seleccionMapa = 'no';
    this.firstFormGroup.controls['fechaEmergencia'].setValue(this._us.fecha(new Date()))
    this.hoy = this._us.fecha(new Date())
    this.view2.graphics.remove(this.camino)
    var layer = new FeatureLayer( {
      url:this.vialidadRedVialURL+'/3',
      definitionExpression:'',
			outFields : [ '*' ],		});
    let query = {
      outFields:[],
      returnGeometry:true,
      where:''
    }
    query.outFields = ['*'];
    query.where =  "CODIGO_CAMINO = '"+data.codigo+"'";
    query.returnGeometry =  true;
    this.camino = null;
    console.log(query)
    layer.queryFeatures(query).then(result =>{
      if(result && result.features[0]){
        let symbolTerritory = {
          type: "simple-fill",
          color: [207, 226, 99, 0],
          style: "solid",
          outline: {
            color: "cyan",
            width: 3
          }
        };
        this.camino = new Graphic({
          symbol: symbolTerritory,
          geometry: result.features[0].geometry,
        });
        this.view2.graphics.add(this.camino)
        this.view2.goTo(this.camino.geometry);
        this.dibujarCamino = true;
      }

    })


    // this._us.cargar_storage().then(()=>{})
  }

  selectTab(i){
    if(Number(i) == this.tab){
      this.tab = 0;
      this._us.cargar_storage().then(()=>{
        if(this._us.conexion == 'si'){
          this.mostrarMapa = true;
        }else{
          this.mostrarMapa = false;
        }
      })
    }else{
      this.mostrarMapa = false;
      this.tab = Number(i);
    }
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
        mapa:this.basemap,
        red:this.redactiva
      }
    });
    popover.onDidDismiss().then(data=>{
      if(data.data){
       if(data.data.mapa){
        this.customZoom()
       }else{
        if(data.data.posicion){
          this.obtenerGeolocalizacion()
        }else{
          if(data.data.red){
            if(this.redactiva){
              this.redactiva = false;
              this.map2.remove(this.flVialidad);
              // this.flVialidad.setVisible(false)
            }else{
              this.redactiva = true;
              this.map2.add(this.flVialidad);
              // this.flVialidad.setVisible(true)
            }
          }else{
            if(data.data.centrar){
              this.centrarInicial()
            }else{
              if(this.region == '20'){
                this.regionSelec = null;
                this.activosVialidad('20','manual');
              }else{
                this.regionSelec = this.region;
                this._us.cargar_storage().then(()=>{
                  if(this._us.conexion == 'si'){
                    this.activosVialidad(this.region,'manual');
                  }else{
                    this.presentToast('No tienes conexión a internet, por tanto no se pueden actualizar los activos',null,true,true)
                  }
                })
              }
            }
          }
        }
       }
      } 
    })
    return await popover.present();
  }
  // CARGAS INICIALES
  
  nivelAlerta(){
    if(this.platform.is('capacitor')){
      this.db.open().then(()=>{
        this.db.executeSql('SELECT * FROM nivelAlerta', []).then((data)=>{
          if(data.rows.length > 0){
            var arr = [,,,]
            var AR = Array.from({length: data.rows.length}, (x, i) => i);
            AR.forEach(i=>{
              var tmp = {
                VALUE:data.rows.item(i).id,
                DESCRIPTION:data.rows.item(i).name,
              }
              if(tmp.VALUE == 'Leve'){
                arr[0] = tmp
              }else{
                if(tmp.VALUE == 'Moderado'){
                  arr[1] = tmp
                }else{
                  if(tmp.VALUE == 'Grave'){
                    arr[2] = tmp
                  }else{
                    arr[3] = tmp
                  }
                }
              }
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
                var arr = [,,,]
                path.forEach(f=>{
                  var tmp = {DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]}
                  // this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                  if(f.VALUE[0] == 'Leve'){
                    arr[0] = tmp
                  }else{
                    if(f.VALUE[0] == 'Moderado'){
                      arr[1] = tmp
                    }else{
                      if(f.VALUE[0] == 'Grave'){
                        arr[2] = tmp
                      }else{
                        arr[3] = tmp
                      }
                    }
                  }
                })
                this.nivelAlertaArray = arr;
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
                var arr = [,,,]
                path.forEach(f=>{
                  var tmp = {DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]}
                  // this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                  if(f.VALUE[0] == 'Leve'){
                    arr[0] = tmp
                  }else{
                    if(f.VALUE[0] == 'Moderado'){
                      arr[1] = tmp
                    }else{
                      if(f.VALUE[0] == 'Grave'){
                        arr[2] = tmp
                      }else{
                        arr[3] = tmp
                      }
                    }
                  }
                })
                this.nivelAlertaArray = arr;
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
          var arr = [,,,]
          path.forEach(f=>{
            var tmp = {DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]}
            // this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
            if(f.VALUE[0] == 'Leve'){
              arr[0] = tmp
            }else{
              if(f.VALUE[0] == 'Moderado'){
                arr[1] = tmp
              }else{
                if(f.VALUE[0] == 'Grave'){
                  arr[2] = tmp
                }else{
                  arr[3] = tmp
                }
              }
            }
          })
          this.nivelAlertaArray = arr;
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
          var arr = [,,,]
          path.forEach(f=>{
            var tmp = {DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]}
            // this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
            if(f.VALUE[0] == 'Leve'){
              arr[0] = tmp
            }else{
              if(f.VALUE[0] == 'Moderado'){
                arr[1] = tmp
              }else{
                if(f.VALUE[0] == 'Grave'){
                  arr[2] = tmp
                }else{
                  arr[3] = tmp
                }
              }
            }
          })
          this.nivelAlertaArray = arr;
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
    this._vs.dominios('SIECATEGORIA').subscribe((res:any)=>{
      if(res && res.status == '200'){
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.nivelAlertaArray = [];
          var arr = [,,,]
          path.forEach(f=>{
            var tmp = {DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]}
            // this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
            if(f.VALUE[0] == 'Leve'){
              arr[0] = tmp
            }else{
              if(f.VALUE[0] == 'Moderado'){
                arr[1] = tmp
              }else{
                if(f.VALUE[0] == 'Grave'){
                  arr[2] = tmp
                }else{
                  arr[3] = tmp
                }
              }
            }
          })
          this.nivelAlertaArray = arr;
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
                  var arr = [,,,]
                  var AR = Array.from({length: data.rows.length}, (x, i) => i);
                  AR.forEach(i=>{
                    var tmp = {
                      VALUE:data.rows.item(i).id,
                      DESCRIPTION:data.rows.item(i).name,
                    }
                    if(tmp.VALUE == 'Leve'){
                      arr[0] = tmp
                    }else{
                      if(tmp.VALUE == 'Moderado'){
                        arr[1] = tmp
                      }else{
                        if(tmp.VALUE == 'Grave'){
                          arr[2] = tmp
                        }else{
                          arr[3] = tmp
                        }
                      }
                    }
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
            var arr = [,,,]
            var AR = Array.from({length: data.rows.length}, (x, i) => i);
            AR.forEach(i=>{
              var tmp = {
                VALUE:data.rows.item(i).id,
                DESCRIPTION:data.rows.item(i).name,
              }
              if(tmp.VALUE == 'Leve'){
                arr[0] = tmp
              }else{
                if(tmp.VALUE == 'Moderado'){
                  arr[1] = tmp
                }else{
                  if(tmp.VALUE == 'Grave'){
                    arr[2] = tmp
                  }else{
                    arr[3] = tmp
                  }
                }
              }
            })
            this.nivelAlertaArray = arr;
          }
        })  
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
              }
              arr.push(tmp)
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
                  this.elementos.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
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
                  this.elementos.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
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
            this.elementos.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
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
            this.elementos.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
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
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.elementos = [];
          path.forEach(f=>{
            this.elementos.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          this.elementos = this.sortJSON(this.elementos,'DESCRIPTION','asc')
          this.db.open().then(()=>{
            this.db.transaction(rx=>{
              rx.executeSql('delete from elemento', [], ()=>{
                this.elementos.forEach((activo,i)=>{
                  this.db.transaction(tx=>{
                    tx.executeSql('insert into elemento (id,name) values (?,?)', [activo.VALUE, activo.DESCRIPTION]);
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
                    }
                    arr.push(tmp)
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
              }
              arr.push(tmp)
            })
            this.elementos = arr;
            this.elementos = this.sortJSON(this.elementos,'DESCRIPTION','asc')
          }
        })  
      }
    })
  }

  transitos(){
    if(this.platform.is('capacitor')){
      this.db.open().then(()=>{
        this.db.executeSql('SELECT * FROM transito', []).then((data)=>{
          if(data.rows.length > 0){
            var arr = [,,,]
            var AR = Array.from({length: data.rows.length}, (x, i) => i);
            AR.forEach(i=>{
              var tmp = {
                VALUE:data.rows.item(i).id,
                DESCRIPTION:data.rows.item(i).name,
              }
              if(tmp.VALUE == 'Transitable'){
                arr[0] = tmp
              }else{
                if(tmp.VALUE == 'Con Restricción'){
                  arr[1] = tmp
                }else{
                  if(tmp.VALUE == 'Interrumpido'){
                    arr[2] = tmp
                  }else{
                    arr[3] = tmp
                  }
                }
              }
            })
            this.transito = arr;
            if(this.actualizar){
              this.actualizarTransito()
            }
          }else{
            this._http.get('assets/transito.xml',{ responseType: 'text' }).subscribe((res:any)=>{
              this._us.xmlToJson(res).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.transito = [];
                var arr = [,,,]
                path.forEach(f=>{
                  var tmp = {DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]}
                  if(f.VALUE[0] == 'Transitable'){
                    arr[0] = tmp
                  }else{
                    if(f.VALUE[0] == 'Con Restricción'){
                      arr[1] = tmp
                    }else{
                      if(f.VALUE[0] == 'Interrumpido'){
                        arr[2] = tmp
                      }else{
                        arr[3] = tmp
                      }
                    }
                  }
                })
                this.transito = arr;
                if(this.platform.is('capacitor')){
                  if(this.actualizar){
                    this.actualizarTransito()
                  }                
                }
              })
            },err=>{
              this._us.xmlToJson(err.error.text).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.transito = [];
                var arr = [,,,]
                path.forEach(f=>{
                  var tmp = {DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]}
                  if(f.VALUE[0] == 'Transitable'){
                    arr[0] = tmp
                  }else{
                    if(f.VALUE[0] == 'Con Restricción'){
                      arr[1] = tmp
                    }else{
                      if(f.VALUE[0] == 'Interrumpido'){
                        arr[2] = tmp
                      }else{
                        arr[3] = tmp
                      }
                    }
                  }
                })
                this.transito = arr;
                if(this.platform.is('capacitor')){
                  if(this.actualizar){
                    this.actualizarTransito()
                  }                
                }
              })
            })
          }
        })
      })
    }else{
      this._http.get('assets/transito.xml',{ responseType: 'text' }).subscribe((res:any)=>{
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.transito = [];
          var arr = [,,,]
          path.forEach(f=>{
            var tmp = {DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]}
            if(f.VALUE[0] == 'Transitable'){
              arr[0] = tmp
            }else{
              if(f.VALUE[0] == 'Con Restricción'){
                arr[1] = tmp
              }else{
                if(f.VALUE[0] == 'Interrumpido'){
                  arr[2] = tmp
                }else{
                  arr[3] = tmp
                }
              }
            }
          })
          this.transito = arr;
          if(this.platform.is('capacitor')){
            if(this.actualizar){
              this.actualizarTransito()
            }
          }
        })
      },err=>{
        this._us.xmlToJson(err.error.text).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.transito = [];
          var arr = [,,,]
          path.forEach(f=>{
            var tmp = {DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]}
            if(f.VALUE[0] == 'Transitable'){
              arr[0] = tmp
            }else{
              if(f.VALUE[0] == 'Con Restricción'){
                arr[1] = tmp
              }else{
                if(f.VALUE[0] == 'Interrumpido'){
                  arr[2] = tmp
                }else{
                  arr[3] = tmp
                }
              }
            }
          })
          this.transito = arr;
          if(this.platform.is('capacitor')){
            if(this.actualizar){
              this.actualizarTransito()
            }
          }
        })
      })
    }
  }

  actualizarTransito(){
    this._vs.dominios('TRANSEMER').subscribe((res:any)=>{
      if(res && res.status == '200'){
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.transito = [];
          var arr = [,,,]
          path.forEach(f=>{
            var tmp = {DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]}
            if(f.VALUE[0] == 'Transitable'){
              arr[0] = tmp
            }else{
              if(f.VALUE[0] == 'Con Restricción'){
                arr[1] = tmp
              }else{
                if(f.VALUE[0] == 'Interrumpido'){
                  arr[2] = tmp
                }else{
                  arr[3] = tmp
                }
              }
            }
          })
          this.transito = arr;
          // this.transito = this.sortJSON(this.transito,'VALUE','asc')
          this.db.open().then(()=>{
            this.db.transaction(rx=>{
              rx.executeSql('delete from transito', [], ()=>{
                this.transito.forEach((activo,i)=>{
                  this.db.transaction(tx=>{
                    tx.executeSql('insert into transito (id,name) values (?,?)', [activo.VALUE, activo.DESCRIPTION]);
                  })
                })
              })
            }).then(()=>{
              // Termina de ingresar nivelAlerta
            }).catch(()=>{
              this.db.executeSql('SELECT * FROM transito', []).then((data)=>{
                if(data.rows.length > 0){
                  var arr = [,,,]
                  var AR = Array.from({length: data.rows.length}, (x, i) => i);
                  AR.forEach(i=>{
                    var tmp = {
                      VALUE:data.rows.item(i).id,
                      DESCRIPTION:data.rows.item(i).name,
                    }
                    if(tmp.VALUE == 'Transitable'){
                      arr[0] = tmp
                    }else{
                      if(tmp.VALUE == 'Con Restricción'){
                        arr[1] = tmp
                      }else{
                        if(tmp.VALUE == 'Interrumpido'){
                          arr[2] = tmp
                        }else{
                          arr[3] = tmp
                        }
                      }
                    }
                  })
                  this.transito = arr;
                  // this.transito = this.sortJSON(this.transito,'VALUE','asc')
                }
              })     
            })
          })
        })
      }else{
        this.db.executeSql('SELECT * FROM transito', []).then((data)=>{
          if(data.rows.length > 0){
            var arr = [,,,]
            var AR = Array.from({length: data.rows.length}, (x, i) => i);
            AR.forEach(i=>{
              var tmp = {
                VALUE:data.rows.item(i).id,
                DESCRIPTION:data.rows.item(i).name,
              }
              if(tmp.VALUE == 'Transitable'){
                arr[0] = tmp
              }else{
                if(tmp.VALUE == 'Con Restricción'){
                  arr[1] = tmp
                }else{
                  if(tmp.VALUE == 'Interrumpido'){
                    arr[2] = tmp
                  }else{
                    arr[3] = tmp
                  }
                }
              }
            })
            this.transito = arr;
            // this.transito = this.sortJSON(this.transito,'VALUE','asc')
          }
        })  
      }
    })
  }

  restriccioN(){
    if(this.platform.is('capacitor')){
      this.db.open().then(()=>{
        this.db.executeSql('SELECT * FROM restriccion', []).then((data)=>{
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
            this.restriccion = arr;
            if(this.actualizar){
              this.actualizarRestriccion()
            }
          }else{
            this._http.get('assets/restriccion.xml',{ responseType: 'text' }).subscribe((res:any)=>{
              this._us.xmlToJson(res).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.restriccion = [];
                path.forEach(f=>{
                  if(f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDV'){
                    this.restriccion.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                  }
                })
                if(this.platform.is('capacitor')){
                  if(this.actualizar){
                    this.actualizarRestriccion()
                  }
                }
              })
            },err=>{
              this._us.xmlToJson(err.error.text).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.restriccion = [];
                path.forEach(f=>{
                  if(f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDV'){
                    this.restriccion.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                  }
                })
                if(this.platform.is('capacitor')){
                  if(this.actualizar){
                    this.actualizarRestriccion()
                  }
                }
              })
            })
          }
        })
      })
    }else{
      this._http.get('assets/restriccion.xml',{ responseType: 'text' }).subscribe((res:any)=>{
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.restriccion = [];
          path.forEach(f=>{
            if(f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDV'){
              this.restriccion.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
            }
          })
          if(this.platform.is('capacitor')){
            if(this.actualizar){
              this.actualizarRestriccion()
            }
          }
        })
      },err=>{
        this._us.xmlToJson(err.error.text).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.restriccion = [];
          path.forEach(f=>{
            if(f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDV'){
              this.restriccion.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
            }
          })
          if(this.platform.is('capacitor')){
            if(this.actualizar){
              this.actualizarRestriccion()
            }
          }
        })
      })
    }
  }

  actualizarRestriccion(){
    this._vs.dominios('RESTEMER').subscribe((res:any)=>{
      if(res && res.status == '200'){
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.restriccion = [];
          path.forEach(f=>{
            if(f.MAXDOMVALCOND[0].CONDITIONNUM[0] == 'SRPLTDV'){
              this.restriccion.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
            }
          })
          this.restriccion = this.sortJSON(this.restriccion,'VALUE','asc')
          this.db.open().then(()=>{
            this.db.transaction(rx=>{
              rx.executeSql('delete from restriccion', [], ()=>{
                this.restriccion.forEach((activo,i)=>{
                  this.db.transaction(tx=>{
                    tx.executeSql('insert into restriccion (id,name) values (?,?)', [activo.VALUE, activo.DESCRIPTION]);
                  })
                })
              })
            }).then(()=>{
              // Termina de ingresar nivelAlerta
            }).catch(()=>{
              this.db.executeSql('SELECT * FROM restriccion', []).then((data)=>{
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
                  this.restriccion = arr;
                  this.restriccion = this.sortJSON(this.restriccion,'VALUE','asc')
                }
              })     
            })
          })
        })
      }else{
        this.db.executeSql('SELECT * FROM restriccion', []).then((data)=>{
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
            this.restriccion = arr;
            this.restriccion = this.sortJSON(this.restriccion,'VALUE','asc')
          }
        })  
      }
    })
  }

  activosVialidad(region,manual?){
    if(this.platform.is('capacitor')){
      this.db.open().then(()=>{
        this.db.executeSql('SELECT * FROM activosVialidad', []).then((data)=>{
          if(data.rows.length > 0){
            var AR = Array.from({length: data.rows.length}, (x, i) => i);
            AR.forEach(i=>{
              var tmp = {
                codigo:data.rows.item(i).id,
                nombre:data.rows.item(i).nombre,
                km_i:data.rows.item(i).km_i,
                km_f:data.rows.item(i).km_f,
                region:data.rows.item(i).region,
                rol:data.rows.item(i).rol,
              }
              this.activosPorRegion[Number(data.rows.item(i).region) - 1].push(tmp)
            })
            this._us.cargar_storage().then(()=>{
              if(this._us.conexion == 'si'){
                if(region == '20'){
                  if(this.actualizar || manual){
                    this._vs.cargandoActivos = true;
                    this._vs.activoRegion = 1;
                    this.actualizarActivosVialidad(this.region,1)
                  }
                }else{
                  if(this.actualizar || manual){
                    this._vs.cargandoActivos = true;
                    this._vs.activoRegion = this.region;
                    this.actualizarActivosVialidad(this.region)
                  }
                }
              }
            })
          }else{ 
            this._us.cargar_storage().then(()=>{
              if(this._us.conexion == 'si'){
                if(region == '20'){
                  if(this.actualizar || manual){
                    this._vs.cargandoActivos = true;
                    this._vs.activoRegion = 1;
                    this.actualizarActivosVialidad(this.region,1)
                  }                
                }else{
                  if(this.platform.is('capacitor')){
                    if(this.actualizar || manual){
                      this._vs.cargandoActivos = true;
                      this._vs.activoRegion = this.region;
                      this.actualizarActivosVialidad(this.region)
                    }
                  }
                }
              }else{
                if(region == '20'){
                  this.activosNacional(1)
                }else{
                  this._http.get('assets/vialidad/'+this.region+'.xml',{ responseType: 'text' }).subscribe((res:any)=>{
                    this._us.xmlToJson(res).then((result:any)=>{
                      var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET
                      path.forEach(f=>{
                        this.activosActualizar[Number(f.REGION[0]) - 1].push({nombre:f.DESCRIPTION[0],codigo:f.ASSETNUM[0],km_i:f.STARTMEASURE[0],km_f:f.ENDMEASURE[0],region:f.REGION[0],rol:f.ROL[0]})
                      })
                      this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
                      this.activosPorRegion = this.activosActualizar;
                    })
                  },err=>{
                    this._us.xmlToJson(err.error.text).then((result:any)=>{
                      var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET
                      path.forEach(f=>{
                        this.activosActualizar[Number(f.REGION[0]) - 1].push({nombre:f.DESCRIPTION[0],codigo:f.ASSETNUM[0],km_i:f.STARTMEASURE[0],km_f:f.ENDMEASURE[0],region:f.REGION[0],rol:f.ROL[0]})
                      })
                      this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
                      this.activosPorRegion = this.activosActualizar;
                    })
                  })
                }
              }
            })
          }
        })
      })
    }else{
      if(this.actualizar || manual){
        if(region == '20'){
          if(this.actualizar || manual){
            this._vs.cargandoActivos = true;
            this._vs.activoRegion = 1;
            this.activosNacional(1)
          }
        }else{
          if(this.actualizar || manual){
            this._vs.cargandoActivos = true;
            this._vs.activoRegion = this.region;
            this._http.get('assets/vialidad/'+this.region+'.xml',{ responseType: 'text' }).subscribe((res:any)=>{
              this._us.xmlToJson(res).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET
                path.forEach(f=>{
                  this.activosActualizar[Number(f.REGION[0]) - 1].push({nombre:f.DESCRIPTION[0],codigo:f.ASSETNUM[0],km_i:f.STARTMEASURE[0],km_f:f.ENDMEASURE[0],region:f.REGION[0],rol:f.ROL[0]})
                })
                this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
                this.activosPorRegion = this.activosActualizar;
              })
            },err=>{
              this._us.xmlToJson(err.error.text).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET
                path.forEach(f=>{
                  this.activosActualizar[Number(f.REGION[0]) - 1].push({nombre:f.DESCRIPTION[0],codigo:f.ASSETNUM[0],km_i:f.STARTMEASURE[0],km_f:f.ENDMEASURE[0],region:f.REGION[0],rol:f.ROL[0]})
                })
                this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
                this.activosPorRegion = this.activosActualizar;
              })
            })
          }
        }
      }


    }
  }

  activosNacional(vuelta){
    this._http.get('assets/vialidad/'+(String(vuelta).length == 1 ? '0'+vuelta : vuelta)+'.xml',{ responseType: 'text' }).subscribe((res:any)=>{
      this._us.xmlToJson(res).then((result:any)=>{
        var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET
        path.forEach(f=>{
          this.activosActualizar[Number(f.REGION[0]) - 1].push({nombre:f.DESCRIPTION[0],codigo:f.ASSETNUM[0],km_i:f.STARTMEASURE[0],km_f:f.ENDMEASURE[0],region:f.REGION[0],rol:f.ROL[0]})
        })
        const newVuelta = vuelta + 1;
        if(newVuelta <= 16){
          this._vs.activoRegion = newVuelta;
          this.activosNacional(newVuelta)
        }else{
          this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
          this.activosPorRegion = this.activosActualizar;
          this._vs.activoRegion = null;
          this._vs.cargandoActivos = false;
        }
      })
    },err=>{
      this._us.xmlToJson(err.error.text).then((result:any)=>{
        var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET
        path.forEach(f=>{
          this.activosActualizar[Number(f.REGION[0]) - 1].push({nombre:f.DESCRIPTION[0],codigo:f.ASSETNUM[0],km_i:f.STARTMEASURE[0],km_f:f.ENDMEASURE[0],region:f.REGION[0],rol:f.ROL[0]})
        })
        const newVuelta = vuelta + 1;
        if(newVuelta <= 16){
          this._vs.activoRegion = newVuelta;
          this.activosNacional(newVuelta)
        }else{
          this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
          this.activosPorRegion = this.activosActualizar;
          this._vs.activoRegion = null;
          this._vs.cargandoActivos = false;
        }
      })
    })
  }

  actualizarActivosVialidad(region,vuelta?){
    if(region == '20'){
      if(vuelta && vuelta < 16){
        // console.log('ACTUALIZANDO ACTIVOS DE LA REGIÓN '+vuelta)
        this._vs.activosVialidad((String(vuelta).length == 1 ? '0'+vuelta : vuelta)).subscribe((res:any)=>{
          if(res && res.status == '200'){
            this._us.xmlToJson(res).then((result:any)=>{
              var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET
              path.forEach(f=>{
                this.activosActualizar[Number(f.REGION[0]) - 1].push({nombre:f.DESCRIPTION[0],codigo:f.ASSETNUM[0],km_i:f.STARTMEASURE[0],km_f:f.ENDMEASURE[0],region:f.REGION[0],rol:f.ROL[0]})
              })
              const newVuelta = vuelta + 1;
              if(newVuelta > 16){
                this._vs.cargandoActivos = false;
                this._vs.activoRegion = null;
                this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
                this.activosPorRegion = this.activosActualizar;
                this.db.open().then(()=>{
                  this.db.transaction(rx=>{
                    rx.executeSql('delete from activosVialidad', [], ()=>{
                      this.activosActualizar.forEach((a,i)=>{
                        this.activosActualizar[i].forEach(activo=>{
                          this.db.transaction(tx=>{
                            tx.executeSql('insert into activosVialidad (id, nombre,km_i,km_f,region,rol) values (?,?,?,?,?,?)', [activo.codigo, activo.nombre,activo.km_i,activo.km_f,activo.region,activo.rol]);
                          })
                        })
                      })
                    })
                  }).catch(()=>{
                    this.db.executeSql('SELECT * FROM activosVialidad', []).then((data)=>{
                      if(data.rows.length > 0){
                        var AR = Array.from({length: data.rows.length}, (x, i) => i);
                        AR.forEach(i=>{
                          var tmp = {
                            codigo:data.rows.item(i).id,
                            nombre:data.rows.item(i).nombre,
                            km_i:data.rows.item(i).km_i,
                            km_f:data.rows.item(i).km_f,
                            region:data.rows.item(i).region,
                            rol:data.rows.item(i).rol,
                          }
                          this.activosPorRegion[Number(data.rows.item(i).region) - 1].push(tmp)
                        })
                      }
                    })     
                  })
                })
              }else{
                this._vs.activoRegion = newVuelta
                this.actualizarActivosVialidad(region,newVuelta)
              }
            })
          }else{
            const newVuelta = vuelta + 1;
            if(newVuelta > 16){
              this._vs.cargandoActivos = false;
              this._vs.activoRegion = null;
              this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
              this.activosPorRegion = this.activosActualizar;
              this.db.open().then(()=>{
                this.db.transaction(rx=>{
                  rx.executeSql('delete from activosVialidad', [], ()=>{
                    this.activosActualizar.forEach((a,i)=>{
                      this.activosActualizar[i].forEach(activo=>{
                        this.db.transaction(tx=>{
                          tx.executeSql('insert into activosVialidad (id, nombre,km_i,km_f,region,rol) values (?,?,?,?,?,?)', [activo.codigo, activo.nombre,activo.km_i,activo.km_f,activo.region,activo.rol]);
                        })
                      })
                    })
                  })
                }).catch(()=>{
                  this.db.executeSql('SELECT * FROM activosVialidad', []).then((data)=>{
                    if(data.rows.length > 0){
                      var arr = []
                      var AR = Array.from({length: data.rows.length}, (x, i) => i);
                      AR.forEach(i=>{
                        var tmp = {
                          codigo:data.rows.item(i).id,
                          nombre:data.rows.item(i).nombre,
                          km_i:data.rows.item(i).km_i,
                          km_f:data.rows.item(i).km_f,
                          region:data.rows.item(i).region,
                          rol:data.rows.item(i).rol,
                        }
                        // arr.push(tmp)
                        this.activosPorRegion[Number(data.rows.item(i).region) - 1].push(tmp)

                      })
                      // this.activosVial = arr;
                    }
                  })     
                })
              })
            }else{
              this._vs.activoRegion = newVuelta
              this.actualizarActivosVialidad(region,newVuelta)
            }
          }
        })
      }else{
        this._vs.cargandoActivos = false;
        this._vs.activoRegion = null;
        this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
        this.activosPorRegion = this.activosActualizar;
        this.db.open().then(()=>{
          this.db.transaction(rx=>{
            rx.executeSql('delete from activosVialidad', [], ()=>{
              this.activosActualizar.forEach((a,i)=>{
                this.activosActualizar[i].forEach(activo=>{
                  this.db.transaction(tx=>{
                    tx.executeSql('insert into activosVialidad (id, nombre,km_i,km_f,region,rol) values (?,?,?,?,?,?)', [activo.codigo, activo.nombre,activo.km_i,activo.km_f,activo.region,activo.rol]);
                  })
                })
              })
            })
          }).catch(()=>{
            this.db.executeSql('SELECT * FROM activosVialidad', []).then((data)=>{
              if(data.rows.length > 0){
                var arr = []
                var AR = Array.from({length: data.rows.length}, (x, i) => i);
                AR.forEach(i=>{
                  var tmp = {
                    codigo:data.rows.item(i).id,
                    nombre:data.rows.item(i).nombre,
                    km_i:data.rows.item(i).km_i,
                    km_f:data.rows.item(i).km_f,
                    region:data.rows.item(i).region,
                    rol:data.rows.item(i).rol,
                  }
                  // arr.push(tmp)
                  this.activosPorRegion[Number(data.rows.item(i).region) - 1].push(tmp)
                })
                // this.activosVial = arr;
              }
            })     
          })
        })
      }
    }else{
    // console.log('ACTUALIZANDO ACTIVOS DE LA REGIÓN '+region)
      this._vs.activosVialidad().subscribe((res:any)=>{
        if(res && res.status == '200'){
          this._us.xmlToJson(res).then((result:any)=>{
            var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET
            path.forEach(f=>{
              this.activosActualizar[Number(f.REGION[0]) - 1].push({nombre:f.DESCRIPTION[0],codigo:f.ASSETNUM[0],km_i:f.STARTMEASURE[0],km_f:f.ENDMEASURE[0],region:f.REGION[0],rol:f.ROL[0]})
            })
            this._vs.cargandoActivos = false;
            this._vs.activoRegion = null;
            this.activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
            this.activosPorRegion = this.activosActualizar;
            this.db.open().then(()=>{
              this.db.transaction(rx=>{
                rx.executeSql('delete from activosVialidad', [], ()=>{
                  this.activosActualizar.forEach((a,i)=>{
                    this.activosActualizar[i].forEach(activo=>{
                      this.db.transaction(tx=>{
                        tx.executeSql('insert into activosVialidad (id, nombre,km_i,km_f,region,rol) values (?,?,?,?,?,?)', [activo.codigo, activo.nombre,activo.km_i,activo.km_f,activo.region,activo.rol]);
                      })
                    })
                  })
                })
              }).catch(()=>{
                this.db.executeSql('SELECT * FROM activosVialidad', []).then((data)=>{
                  if(data.rows.length > 0){
                    var AR = Array.from({length: data.rows.length}, (x, i) => i);
                    AR.forEach(i=>{
                      var tmp = {
                        codigo:data.rows.item(i).id,
                        nombre:data.rows.item(i).nombre,
                        km_i:data.rows.item(i).km_i,
                        km_f:data.rows.item(i).km_f,
                        region:data.rows.item(i).region,
                        rol:data.rows.item(i).rol,
                      }
                      this.activosPorRegion[Number(data.rows.item(i).region) - 1].push(tmp)
                    })
                  }
                })     
              })
            })
          })
        }
      })
    }

  }

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
  // FIN SECCIÓN FOTO
  // ENVIAR ALERTA
  enviar(){
    this._us.cargar_storage().then(()=>{
     let data = {
       titulo:this.thirdFormGroup.value.titulo,
       descripcion:this.thirdFormGroup.value.descripcion,
       fechaEmergencia:JSON.stringify(new Date(this.firstFormGroup.value.fechaEmergencia)).replace(/[\\"]/gi,''),
       km_i:this.firstFormGroup.value.km_i,
       km_f:this.firstFormGroup.value.km_f,
       usuario:this._us.user.user,
       lat:this.center.latitude,
       lng:this.center.longitude,
      //  region:
       nivelalerta:this.secondFormGroup.value.nivelAlerta,
       transito:this.secondFormGroup.value.transito,
       elemento:this.secondFormGroup.value.elemento,
       restriccion:this.secondFormGroup.value.restriccion,
       competencia:this.secondFormGroup.value.competencia,
       region:this.firstFormGroup.value.activoSeleccionado.region,
       codigo:this.firstFormGroup.value.activoSeleccionado.codigo,
       date:JSON.stringify(new Date()).replace(/[\\"]/gi,''),
       picture:this.picture,
       name:this.firstFormGroup.value.activoSeleccionado.nombre_camino
     }
     this.presentLoader('Enviando Emergencia ...').then(()=>{
      if(this._us.conexion == 'no'){
        this.db.open().then(()=>{
          this.db.transaction( tx1=>{
            this.db.executeSql('SELECT * FROM alertaVialidad', []).then((dat)=>{
              this.db.transaction(async tx=>{
                if(dat.rows.length > 0){
                  if(dat.rows.length >= 10){
                    this.loader.dismiss()
                    this.alertasMaximas()
                  }else{
                    tx.executeSql('insert into alertaVialidad (id, titulo, descripcion, fechaEmergencia, usuario, lat, lng, nivelalerta, region, name, date,codigo,elemento,transito,restriccion,competencia,km_i,km_f,error) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                    [(dat.rows.length + 1), data.titulo, data.descripcion, data.fechaEmergencia, data.usuario, data.lat, data.lng,data.nivelalerta,data.region,data.name,data.date,data.codigo,data.elemento,data.transito,data.restriccion,data.competencia,data.km_i,data.km_f,'internet']);
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
                  tx.executeSql('insert into alertaVialidad (id, titulo, descripcion, fechaEmergencia, usuario, lat, lng, nivelalerta, region, name, date,codigo,elemento,transito,restriccion,competencia,km_i,km_f,error) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                  [1, data.titulo, data.descripcion, data.fechaEmergencia, data.usuario, data.lat, data.lng,data.nivelalerta,data.region,data.name,data.date,data.codigo,data.elemento,data.transito,data.restriccion,data.competencia,data.km_i,data.km_f,'internet']);
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
        this._vs.enviarAlerta(data).subscribe((res:any)=>{
          console.log('**************** RESPUESTA AL ENVIAR FORMULARIO **************', res)
          this.loader.dismiss()
          if(res && res.status == '200'){
            this.db.open().then(()=>{
              this.db.transaction( tx1=>{
                this.db.executeSql('SELECT * FROM historial', []).then((dat)=>{
                  this.db.transaction(async tx=>{
                    if(dat.rows.length > 0){
                      tx.executeSql('insert into historial (id, titulo, descripcion, fechaEmergencia, usuario, lat, lng, nivelalerta, region, name, date,codigo,elemento,transito,restriccion,competencia,km_i,km_f,error) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                      [(dat.rows.length + 1), data.titulo, data.descripcion, data.fechaEmergencia, data.usuario, data.lat, data.lng,data.nivelalerta,data.region,data.name,data.date,data.codigo,data.elemento,data.transito,data.restriccion,data.competencia,data.km_i,data.km_f,'vialidad']);
                      this.estadoEnvioAlerta = 'exitoso'
                      if(this.picture){
                        this.deleteImage(this.images[0])
                      }
                      this.volverInicio()
                      this.openModalEnvio(this.estadoEnvioAlerta)
                      this.presentToast('La emergencia fue enviada exitosamente',null,true);
                    }else{
                      tx.executeSql('insert into historial (id, titulo, descripcion, fechaEmergencia, usuario, lat, lng, nivelalerta, region, name, date,codigo,elemento,transito,restriccion,competencia,km_i,km_f,error) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                      [1, data.titulo, data.descripcion, data.fechaEmergencia, data.usuario, data.lat, data.lng,data.nivelalerta,data.region,data.name,data.date,data.codigo,data.elemento,data.transito,data.restriccion,data.competencia,data.km_i,data.km_f,'vialidad']);
                      this.estadoEnvioAlerta = 'exitoso'
                      if(this.picture){
                        this.deleteImage(this.images[0])
                      }
                      this.volverInicio()
                      this.openModalEnvio(this.estadoEnvioAlerta)
                      this.presentToast('La emergencia fue enviada exitosamente',null,true);
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
                this.db.executeSql('SELECT * FROM alertaVialidad', []).then((dat)=>{
                  this.db.transaction(async tx=>{
                    if(dat.rows.length > 0){
                      tx.executeSql('insert into alertaVialidad (id, titulo, descripcion, fechaEmergencia, usuario, lat, lng, nivelalerta, region, name, date,codigo,elemento,transito,restriccion,competencia,km_i,km_f,error) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                      [(dat.rows.length + 1), data.titulo, data.descripcion, data.fechaEmergencia, data.usuario, data.lat, data.lng,data.nivelalerta,data.region,data.name,data.date,data.codigo,data.elemento,data.transito,data.restriccion,data.competencia,data.km_i,data.km_f,'desconocido']);
                      const savedFile = await Filesystem.writeFile({
                        directory:Directory.Data,
                        path:SAVE_IMAGE_DIR+"/"+'save_'+(data.date)+'_foto.jpg',
                        data:this.images[0].data
                        }).then(()=>{
                        this.deleteImage(this.images[0])
                        this.volverInicio()
                        this._us.nextmessage('pendiente') 
                      }).catch(()=>{
                        this.deleteImage(this.images[0])
                        this.volverInicio()
                        this._us.nextmessage('pendiente') 
                      })
                    }else{
                      tx.executeSql('insert into alertaVialidad (id, titulo, descripcion, fechaEmergencia, usuario, lat, lng, nivelalerta, region, name, date,codigo,elemento,transito,restriccion,competencia,km_i,km_f,error) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                      [1, data.titulo, data.descripcion, data.fechaEmergencia, data.usuario, data.lat, data.lng,data.nivelalerta,data.region,data.name,data.date,data.codigo,data.elemento,data.transito,data.restriccion,data.competencia,data.km_i,data.km_f,'desconocido']);
                      const savedFile = await Filesystem.writeFile({
                        directory:Directory.Data, 
                        path:SAVE_IMAGE_DIR+"/"+'save_'+(data.date)+'_foto.jpg',
                        data:this.images[0].data
                        }).then(()=>{
                        this.deleteImage(this.images[0])
                        this.volverInicio()
                        this._us.nextmessage('pendiente') 
                      }).catch(()=>{
                        this.deleteImage(this.images[0])
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

  async alertasMaximas() {
    const alert = await this.alertctrl.create({
      header: 'Límite de emergencias',
      message: 'Se ha llegado al límite de 10 emergencias almacenadas, por lo cual no se pueden guardar más emergencias para enviar con posterioridad',
      buttons: ['OK'],
      mode:'ios'
    });
    await alert.present();
  }

  volverInicio(){
      this.firstFormGroup.reset();
      this.secondFormGroup.reset();
      this.thirdFormGroup.reset();
      // this.stepper.reset();
      this.secondFormGroup.controls['competencia'].setValue('Si')
      this.enviando = false;
      this.menorI = false;
      this.mayorI = false;
      this.menorF = false;
      this.mayorF = false;
      this.menorFI = false;
      this.mayorIF = false;
      this.picture = null;
      this.intento = 0;
      this.km = null;
      this.tab = 0;
      // console.log('internet->',this.internet)
      if(this.internet){
        this.mostrarMapa = true;
        this.view2.graphics.remove(this.camino)
        this.view2.zoom = 13
      }else{
        this.mostrarMapa = false;
      }
      this.dibujarCamino = false;
      this.caminosEncontrados = [];
      // this._us.coordenadasRegion.forEach(c=>{
      //   if(c.region == this.region){
      //     // this.view2.setCenter(olProj.transform([c.lng,c.lat], 'EPSG:4326', 'EPSG:3857'))
      //     this.view2.center = [c.lng,c.lat]
      //     this.dataPosicion.lng = Number(c.lng.toFixed(6))
      //     this.dataPosicion.lat = Number(c.lat.toFixed(6))
      //     this.dataPosicion.region = this.region;
      //   }
      // })
    
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

  async openModalEnvio(estado) {
    const modal = await this._modalCtrl.create({
      component: ModalEnviarPage,
      showBackdrop:true,
      mode:'ios',
      swipeToClose:false,
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
}
