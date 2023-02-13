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
import IdentifyParameters from "@arcgis/core/rest/support/IdentifyParameters";
import * as identify from "@arcgis/core/rest/identify";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
import Graphic from "@arcgis/core/Graphic";
import * as olProj from 'ol/proj';
import { IonAccordionGroup } from '@ionic/angular';
import { addIcons } from 'ionicons';
addIcons({
  'distance': 'assets/img/distance.svg',
  'ruta': 'assets/img/ruta.svg',
  'pin-3': 'assets/img/pin_3.svg',
});
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { PopoverPage } from '../popover/popover.page';

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
  @ViewChild('accordionGroup') accordionGroup: IonAccordionGroup;
  @ViewChild('modal') modal: ElementRef;

  chile = new VectorLayer({})
  dvRedVIal =  new ImageLayer({
    source: new ImageArcGISRest({
      ratio: 1,
      params: {},
      url: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Red_Vial_Chile/MapServer',
    }),
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
  basemap = "satellite"
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
  iconAccordion = 'chevron-down-outline';
  tab = 0;
  internet = false;
  footer = true;
  constructor(public _vs:VialidadService, private _formBuilder: FormBuilder,public _us:UsuarioService, public platform:Platform,public _http:HttpClient,public _modalCtrl:ModalController,
    private geolocation: Geolocation,public loadctrl:LoadingController,public _mc:MenuController,private sqlite: SQLite,public storage: NativeStorage,private keyboard: Keyboard,public popoverCtrl:PopoverController,
    public toastController:ToastController,public actionSheetController: ActionSheetController,private animationCtrl: AnimationController,public alertctrl:AlertController) { 
      this._us.message.subscribe(res=>{
        if(res == 'conexión establecida'){
          this.mostrarMapa = true;
          this.storage.setItem('seleccionMapa', 'si');
          localStorage.setItem('seleccionMapa','si')
          this.internet = true;
          this.tab = 0;
          this._us.cargar_storage().then(()=>{})
          this.loadMapVialidad()
        }
        if(res == 'conexión establecida sin mapa'){
          this.storage.setItem('conexion', 'si');
          localStorage.setItem('conexion','si')
          this.mostrarMapa = true;
          this.firstFormGroup.reset();
          this.secondFormGroup.reset();
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
      })
      this.keyboard.hideFormAccessoryBar(false)
      this.platform.keyboardDidHide.subscribe(r=>{
        // oculta teclado
        this.footer = true;
      })
      this.platform.keyboardDidShow.subscribe(r=>{
        // muestra teclado
        this.footer = false;
      })
    }

  ngOnInit() {
    this.iniciar()
  }

  async reiniciarHome(){
    const alert = await this.alertctrl.create({
      header: 'Conexión Establecida',
      message: 'Se reiniciará la página para reactivar el mapa y sus componentes',
      // buttons: ['OK'],
      mode:'ios',
      buttons: [{
          text: 'OK',
          id: 'confirm-button',
          handler: () => {
            window.location.reload()
          }
        }
      ]
    });
    await alert.present()
  }

  iniciar(){
    this._us.cargar_storage().then(()=>{
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
        this._us.cargar_storage().then(()=>{})
      }
      this.region = this._us.usuario.PERSON.STATEPROVINCE
      this.region = this.region == '20' ? '13' : this.region;
      this.dataPosicion.region = this.region;
      this._us.nextmessage('usuario_logeado') 
      this.loadFiles()
      this.loadMapVialidad()
    
    if(this.platform.is('capacitor')){
      this.sqlite.create({name:'mydbAlertaTemprana',location:'default',createFromLocation:1}).then((db:SQLiteObject)=>{
        db.executeSql('CREATE TABLE IF NOT EXISTS nivelAlerta (id unique, name)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS transito (id unique, name)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS elemento (id unique, name)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS restriccion (id unique, name)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS activosVialidad (id unique, name)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS alertaVialidad (id, titulo, descripcion, fechaEmergencia, usuario, lat, lng, nivelalerta, region, name, date,codigo,elemento,transito,restriccion,competencia,km_i,km_f,error)',[]);
        this.db = db;
        this.nivelAlerta();
        this.elemento();
        this.transitos()
        this.restriccioN();
        this.activosVialidad();
        this.activosDV();
        this.competencia = this.sortJSON(this.competencia,'VALUE','asc')
      })
    }else{
      this.nivelAlerta();
      this.elemento();
      this.transitos()
      this.restriccioN();
      this.activosDV();
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
    const [ FeatureLayer, Locate, Track, watchUtils, IdentifyTask, IdentifyParameters,Basemap]:any = await loadModules([
      'esri/layers/FeatureLayer',
      'esri/widgets/Locate',
      'esri/widgets/Track',
      'esri/core/watchUtils',
      'esri/tasks/IdentifyTask',
      'esri/rest/support/IdentifyParameters',
      "esri/Basemap"
    ])
      .catch(err => {
        console.error("ArcGIS: ", err);
      });
      let basemap = new Basemap({
        baseLayers: [
          new FeatureLayer({
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            title: "Basemap"
          })
        ],
        title: "basemap",
        id: "basemap"
      });
      this.map2 = new Map({
        basemap: 'satellite'
        // basemap:basemap
      });
      const vialidadRedVialURL = 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Red_Vial_Chile/MapServer';
      let flVialidad = new MapImageLayer({
        url: vialidadRedVialURL
      })
      this.map2.add(flVialidad);
      this.view2 = new MapView({
        container: "container", 
        center: [-70.65266161399654,-33.44286267068381],
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
      this.agregarPuntero(pointInicial,Graphic)
      this.view2.on("click", (e:any)=>{
        let point = this.view2.toMap(e);
        this.view2.center = [point.longitude, point.latitude]
        this.view2.zoom = 16
        this.agregarPuntero(point,Graphic)
        this.obtenerUbicacionRegion(point)
        this.buscarCamino(e,vialidadRedVialURL)
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
    this.agregarPuntero(this.home,Graphic)
    this.firstFormGroup.reset();
    this.secondFormGroup.reset();
    this.thirdFormGroup.reset();
    this.caminosEncontrados = []
    this.obtenerUbicacionRegion(this.home)
    this.view2.zoom = 13
  }

  async buscarCamino(e,vialidadRedVialURL){
    const [ IdentifyTask,Point]:any = await loadModules(['esri/tasks/IdentifyTask','esri/geometry/Point'])
      this.firstFormGroup.reset();
      this.secondFormGroup.reset();
      this.thirdFormGroup.reset();
      this.caminosEncontrados = []
      this.tab = 0;
      this.buscando = true;
      if(!this.firstFormGroup.value.activoSeleccionado){
        this.presentToast('Buscando camino ...',null,true)
      }
      var extent:any = Array(this.view2.extent.xmin/100000,this.view2.extent.ymin/100000,this.view2.extent.xmax/100000,this.view2.extent.ymax/100000)
      extent = (String(extent).substring(0,String(extent).length -1)).replace(/,/gi,'%2C')
      this._vs.obtenerCapas(e.mapPoint.longitude,e.mapPoint.latitude,extent).then((response:any)=>{
        this.caminosEncontrados = []
        this.firstFormGroup.controls['activoSeleccionado'].reset()
        if(response.results.length > 0){
          let fueraregion = false;
          let temp = []
          response.results.forEach(r=>{
            let region = r.attributes['REGIÓN'];
            region = this.reverseRegion(region)            
            if(region != this.region){
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
                latitude:e.mapPoint.latitude,
                longitude:e.mapPoint.longitude,
                region:region,
                puntoInicial:r.geometry.paths[0]
              })
            }
          })
          if(fueraregion){
            this.presentToast('No puedes seleccionar caminos/rutas/activos que no pertenezcan a tu región',null,true,true)
            this.caminosEncontrados = []
          }else{
            this.caminosEncontrados = temp;
          }
          this.toast.dismiss()
          this.caminosEncontrados = this.eliminarObjetosDuplicados(this.caminosEncontrados,'codigo')
          setTimeout(()=>{
            if(this.caminosEncontrados.length == 1){
              this.firstFormGroup.controls['activoSeleccionado'].setValue(this.caminosEncontrados[0])
              this.km_i = this.caminosEncontrados[0].km_i;
              this.km_f = this.caminosEncontrados[0].km_f;
              this.firstFormGroup.controls['km_i'].setValue( this.caminosEncontrados[0].km_i == 0 ? '0' : this.caminosEncontrados[0].km_i)
              this.firstFormGroup.controls['km_f'].setValue( this.caminosEncontrados[0].km_f == 0 ? '0' : this.caminosEncontrados[0].km_f)
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
              this.firstFormGroup.controls['km_i'].setValue(this.km)
              this.mostrarMapa = false;
              this.presentToast('Se encontro un camino, favor ingresar la información complementaria',null,false)
            }else{
              this.km = 0;
              this.mostrarMapa = false;
              this.tab = 1;
              this.presentToast('Se encontraron '+this.caminosEncontrados.length+' caminos, favor seleccionar el correspondiente',null,false)
            }
          },500)
          this.agregarPuntero(e.mapPoint,Graphic,true)
        }else{
          this.caminosEncontrados = []
          this.toast.dismiss().then(()=>{
            this.presentToast('No se han encontrado caminos cercanos al punto seleccionado',null,false,true)
          });
          this.buscando = false;
        }
      }).catch(err=>{
        this.caminosEncontrados = [];
        this.buscando = false; 
        if(!this.firstFormGroup.value.activoSeleccionado){
          this.toast.dismiss();
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

  customZoom(){
    if(this.basemap == "topo-vector"){
      this.map2.basemap = 'satellite' 
      this.basemap = 'satellite' 
    }else{
      this.map2.basemap = 'topo-vector' 
      this.basemap = 'topo-vector' 
    }
  }

  obtenerGeolocalizacion(){
    this.presentLoader('Localizando ...').then(()=>{
    this.geolocation.getCurrentPosition().then((resp) => {
      loadModules(['esri/Graphic']).then(([Graphic]) => {
        this.view2.graphics.removeAll();
        this.loader.dismiss();
        this.dataPosicion.lat = resp.coords.latitude
        this.dataPosicion.lng = resp.coords.longitude
        let point = {
          type: "point",
          longitude: this.dataPosicion.lng,
          latitude: this.dataPosicion.lat
        };
        let markerSymbol = {
          type: "picture-marker",
          url: "assets/img/pin.png",
          width: "50px",
          height: "40px"
        };
        let pointGraphic = new Graphic({
          geometry: point as any,
          symbol: markerSymbol as any,
          popupTemplate:null
        });
        this.view2.graphics.add(pointGraphic);
        this.view2.center = [this.dataPosicion.lng, this.dataPosicion.lat]
        this.view2.zoom = 15;  
        this.obtenerUbicacionRegion(point)
      })
    }).catch((error) => {
      console.log('Error getting location', error);
    });
    })
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

  async presentLoader(msg) {
    this.loader = await this.loadctrl.create({message: msg,mode:'ios'});
    await this.loader.present();
  }

  async presentToast(message,duration?,cerrar?,css?) {
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
      mode:'ios'
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
      this.firstFormGroup.controls['activoSeleccionado'].setValue(data)
      this.km_i = data.km_i;
      this.km_f = data.km_f;
      this.firstFormGroup.controls['km_i'].setValue( this.km_i == 0 ? '0' : this.km_i)
      this.firstFormGroup.controls['km_f'].setValue( this.km_f == 0 ? '0' : this.km_f) 
      this.firstFormGroup.controls['fechaEmergencia'].setValue(this._us.fecha(new Date()))
      this.hoy = this._us.fecha(new Date())
      var calculos = []
      data.puntoInicial.forEach((p,i)=>{
        var kilometro = Number(this.getKilometros(p[1],p[0],data.latitude,data.longitude));
        calculos.push({vertice:p,kilometro:kilometro,posicion:i})
      })
      calculos = this.sortJSON(calculos,'kilometro','asc')
      this.km = Number(calculos[0].kilometro + Number(calculos[0].vertice[3]/1000)).toFixed(1)
      this.firstFormGroup.controls['km_i'].setValue(this.km)
      this.buscando = false;
      this._us.seleccionMapa = 'si';
      this._us.cargar_storage().then(()=>{})
    }
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

  abrirModal(){
    var modal = document.querySelector('ion-modal');
    modal.present().then(()=>{})
  }

  buscarActivos(ev: any) {
    const val = ev.target.value;
    if (val && val.trim() != '' && val.length >=3 ) {
      this.buscandoActivos = this.activosDVJSON.filter((item) => {
        return (item.NOMBRE_CAMINO.toLowerCase().indexOf(val.toLowerCase()) > -1 || item.ROL.toLowerCase().indexOf(val.toLowerCase()) > -1);
      })
    }else{
      this.buscandoActivos = []
      if(val.length == 0 || val == null){
        this.activosDV()
      }
    }
  }

  seleccionarActivo(data){
    this.firstFormGroup.reset();
    this.secondFormGroup.reset();
    this.thirdFormGroup.reset();
    let body = {
      codigo:data.CODIGO_CAMINO,
      nombre_camino:data.NOMBRE_CAMINO,
      rol:data.ROL
    }
    this.firstFormGroup.controls['activoSeleccionado'].setValue(body)
    // this.firstFormGroup.controls['fechaEmergencia'].setValue(this._us.fecha(new Date()))
    // this.hoy = this._us.fecha(new Date())
    this.km = null;
    this.km_i = data.KM_I;
    this.km_f = data.KM_F;
    this.firstFormGroup.controls['km_i'].setValue( data.KM_I == 0 ? '0' : data.KM_I)
    this.firstFormGroup.controls['km_f'].setValue( data.KM_F == 0 ? '0' : data.KM_F)
    // this.mayorF = false;this.mayorI = false;this.menorF = false;this.menorI = false;this.menorFI = false;this.mayorIF = false;
    this.buscandoActivos = [];
    this.tab = 1;
    this.mostrarMapa = false;
    this._us.seleccionMapa = 'no';
    this.firstFormGroup.controls['fechaEmergencia'].setValue(this._us.fecha(new Date()))
    this.hoy = this._us.fecha(new Date())
    this._us.cargar_storage().then(()=>{})
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
          this.centrarInicial()
        }
       }
      } 
    })
    return await popover.present();
  }
  // CARGAS INICIALES

  activosDV(){
    let decimalFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    this._http.get('assets/activosDV.json',{ responseType: 'json' }).subscribe((res:any)=>{
      res = this.eliminarObjetosDuplicados(res,'CODIGO_CAMINO')
      res.forEach(f=>{
        f.REGION = this.reverseRegion(f.REGION)
        if(f.REGION == this.region){
          f.KM_I = Number(decimalFormat.format(f.KM_I / 1000));
          f.KM_F = Number(decimalFormat.format(f.KM_F / 1000));
          this.activosDVJSON.push(f)
        }
      })
    },err=>{
      err = this.eliminarObjetosDuplicados(err,'CODIGO_CAMINO')
      err.forEach(f=>{
        f.REGION = this.reverseRegion(f.REGION)
        if(f.REGION == this.region){
          f.KM_I = Number(decimalFormat.format(f.KM_I / 1000));
          f.KM_F = Number(decimalFormat.format(f.KM_F / 1000));
          this.activosDVJSON.push(f)
        }
      })
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
            this.actualizarNivelAlerta()
          }else{
            this._http.get('assets/nivelAlerta.xml',{ responseType: 'text' }).subscribe((res:any)=>{
              this._us.xmlToJson(res).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.nivelAlertaArray = [];
                path.forEach(f=>{
                  this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                })
                if(this.platform.is('capacitor')){
                  this.actualizarNivelAlerta()
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
                  this.actualizarNivelAlerta()
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
            this.actualizarNivelAlerta()
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
            this.actualizarNivelAlerta()
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
            this.actualizarElementos()
          }else{
            this._http.get('assets/elementos.xml',{ responseType: 'text' }).subscribe((res:any)=>{
              this._us.xmlToJson(res).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.elementos = [];
                path.forEach(f=>{
                  this.elementos.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                })
                if(this.platform.is('capacitor')){
                  this.actualizarElementos()
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
                  this.actualizarElementos()
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
            this.actualizarElementos()
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
            this.actualizarElementos()
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
            var arr = []
            var AR = Array.from({length: data.rows.length}, (x, i) => i);
            AR.forEach(i=>{
              var tmp = {
                VALUE:data.rows.item(i).id,
                DESCRIPTION:data.rows.item(i).name,
              }
              arr.push(tmp)
            })
            this.transito = arr;
            this.actualizarTransito()
          }else{
            this._http.get('assets/transito.xml',{ responseType: 'text' }).subscribe((res:any)=>{
              this._us.xmlToJson(res).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.transito = [];
                path.forEach(f=>{
                  this.transito.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                })
                if(this.platform.is('capacitor')){
                  this.actualizarTransito()
                }
              })
            },err=>{
              this._us.xmlToJson(err.error.text).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.transito = [];
                path.forEach(f=>{
                  this.transito.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                })
                if(this.platform.is('capacitor')){
                  this.actualizarTransito()
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
          path.forEach(f=>{
            this.transito.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          if(this.platform.is('capacitor')){
            this.actualizarTransito()
          }
        })
      },err=>{
        this._us.xmlToJson(err.error.text).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.transito = [];
          path.forEach(f=>{
            this.transito.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          if(this.platform.is('capacitor')){
            this.actualizarTransito()
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
          path.forEach(f=>{
            this.transito.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          this.transito = this.sortJSON(this.transito,'VALUE','asc')
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
                  var arr = []
                  var AR = Array.from({length: data.rows.length}, (x, i) => i);
                  AR.forEach(i=>{
                    var tmp = {
                      VALUE:data.rows.item(i).id,
                      DESCRIPTION:data.rows.item(i).name,
                    }
                    arr.push(tmp)
                  })
                  this.transito = arr;
                  this.transito = this.sortJSON(this.transito,'VALUE','asc')
                }
              })     
            })
          })
        })
      }else{
        this.db.executeSql('SELECT * FROM transito', []).then((data)=>{
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
            this.transito = arr;
            this.transito = this.sortJSON(this.transito,'VALUE','asc')
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
            this.actualizarRestriccion()
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
                  this.actualizarRestriccion()
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
                  this.actualizarRestriccion()
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
            this.actualizarRestriccion()
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
            this.actualizarRestriccion()
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

  activosVialidad(){
    if(this.platform.is('capacitor')){
      this.db.open().then(()=>{
        this.db.executeSql('SELECT * FROM activosVialidad', []).then((data)=>{
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
            this.activosVial = arr;
            this.activosVialidad()
          }else{
            this._http.get('assets/activosVialidad.xml',{ responseType: 'text' }).subscribe((res:any)=>{
              this._us.xmlToJson(res).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.activosVial = [];
                path.forEach(f=>{
                  this.activosVial.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                })
                if(this.platform.is('capacitor')){
                  this.activosVialidad()
                }
              })
            },err=>{
              this._us.xmlToJson(err.error.text).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.activosVial = [];
                path.forEach(f=>{
                  this.activosVial.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                })
                if(this.platform.is('capacitor')){
                  this.activosVialidad()
                }
              })
            })
          }
        })
      })
    }else{
      this._http.get('assets/activosVialidad.xml',{ responseType: 'text' }).subscribe((res:any)=>{
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.activosVial = [];
          path.forEach(f=>{
            this.activosVial.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          if(this.platform.is('capacitor')){
            this.activosVialidad()
          }
        })
      },err=>{
        this._us.xmlToJson(err.error.text).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.activosVial = [];
          path.forEach(f=>{
            this.activosVial.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          if(this.platform.is('capacitor')){
            this.activosVialidad()
          }
        })
      })
    }
  }

  actualizarActivosVialidad(){
    this._vs.dominios('RESTEMER').subscribe((res:any)=>{
      if(res && res.status == '200'){
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.activosVial = [];
          path.forEach(f=>{
            this.activosVial.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          this.activosVial = this.sortJSON(this.activosVial,'VALUE','asc')
          this.db.open().then(()=>{
            this.db.transaction(rx=>{
              rx.executeSql('delete from activosVialidad', [], ()=>{
                this.restriccion.forEach((activo,i)=>{
                  this.db.transaction(tx=>{
                    tx.executeSql('insert into activosVialidad (id,name) values (?,?)', [activo.VALUE, activo.DESCRIPTION]);
                  })
                })
              })
            }).then(()=>{
              // Termina de ingresar nivelAlerta
            }).catch(()=>{
              this.db.executeSql('SELECT * FROM activosVialidad', []).then((data)=>{
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
                  this.activosVial = arr;
                  this.activosVial = this.sortJSON(this.activosVial,'VALUE','asc')
                }
              })     
            })
          })
        })
      }else{
        this.db.executeSql('SELECT * FROM activosVialidad', []).then((data)=>{
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
            this.activosVial = arr;
            this.activosVial = this.sortJSON(this.activosVial,'VALUE','asc')
          }
        })  
      }
    })
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
       lat:this.dataPosicion.lat,
       lng:this.dataPosicion.lng,
       nivelalerta:this.secondFormGroup.value.nivelAlerta,
       transito:this.secondFormGroup.value.transito,
       elemento:this.secondFormGroup.value.elemento,
       restriccion:this.secondFormGroup.value.restriccion,
       competencia:this.secondFormGroup.value.competencia,
       region:this.dataPosicion.region,
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
                  if(dat.rows.length >= 20){
                    this.loader.dismiss()
                    this.alertasMaximas()
                  }else{
                    tx.executeSql('insert into alertaVialidad (id, titulo, descripcion, fechaEmergencia, usuario, lat, lng, nivelalerta, region, name, date,codigo,elemento,transito,restriccion,competencia,km_i,km_f,error) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                    [(dat.rows.item(length).id + 1), data.titulo, data.descripcion, data.fechaEmergencia, data.usuario, data.lat, data.lng,data.nivelalerta,data.region,data.name,data.date,data.codigo,data.elemento,data.transito,data.restriccion,data.competencia,data.km_i,data.km_f,'internet']);
                    this.loader.dismiss()
                    this.estadoEnvioAlerta = 'pendiente'
                    this.openModalEnvio(this.estadoEnvioAlerta)
                    this.presentToast('Se detectó que por el momento no tiene acceso a internet, la emergencia se almacenó y la podrá enviar cuando vuelvas a tener conexión estable de internet, desde el menú de la APP',null,true);
                    if(this.picture){
                      const savedFile = await Filesystem.writeFile({
                        directory:Directory.Data,
                        path:SAVE_IMAGE_DIR+"/"+'save_'+(dat.rows.item(length).id + 1)+'_foto.jpg',
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
                      path:SAVE_IMAGE_DIR+"/"+'save_1_foto.jpg',
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
           this.estadoEnvioAlerta = 'exitoso'
           this.deleteImage(this.images[0])
           this.volverInicio()
           this.openModalEnvio(this.estadoEnvioAlerta)
           this.presentToast('La emergencia fue enviada exitosamente',null,true);
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
                        path:SAVE_IMAGE_DIR+"/"+'save_'+(dat.rows.length + 1)+'_foto.jpg',
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
                        path:SAVE_IMAGE_DIR+"/"+'save_1_foto.jpg',
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
      message: 'Se ha llegado al límite de 20 emergencias almacenadas, por lo cual no se pueden guardar más emergencias para enviar con posterioridad',
      buttons: ['OK'],
      mode:'ios'
    });
    await alert.present();
  }

  volverInicio(){
    loadModules(['esri/Graphic']).then(([Graphic]) => {
      this.firstFormGroup.reset();
      this.secondFormGroup.reset();
      this.thirdFormGroup.reset();
      // this.stepper.reset();
      this.secondFormGroup.controls['competencia'].setValue('Si')
      this.view2.zoom = 13
      this.enviando = false;
      this.menorI = false;
      this.mayorI = false;
      this.menorF = false;
      this.mayorF = false;
      this.menorFI = false;
      this.mayorIF = false;
      this.intento = 0;
      this.km = null;
      this.tab = 0;
      this.mostrarMapa = true;
      this.caminosEncontrados = [];
      let pointInicial = {longitude:-70.65266161399654,latitude:-33.44286267068381};
      this._us.coordenadasRegion.forEach(c=>{
        if(c.region == this.region){
          this.view2.center = [c.lng,c.lat]
          pointInicial = {longitude:c.lng,latitude:c.lat};
          this.dataPosicion.lng = Number(c.lng.toFixed(6))
          this.dataPosicion.lat = Number(c.lat.toFixed(6))
          this.dataPosicion.region = this.region;
        }
      })
      this.agregarPuntero(pointInicial,Graphic)
    })
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
