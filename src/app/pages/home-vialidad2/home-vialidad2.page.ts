import { Component, OnInit } from '@angular/core';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import VectorSource from 'ol/source/Vector';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import {View, Feature, Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import * as olProj from 'ol/proj';
import OSM, {ATTRIBUTION} from 'ol/source/OSM';
import { VialidadService } from 'src/app/services/vialidad/vialidad.service';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { UsuarioService } from 'src/app/services/usuario/usuario.service';
import { ActionSheetController, AlertController, AnimationController, LoadingController, MenuController, ModalController, Platform, PopoverController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';

@Component({
  selector: 'app-home-vialidad2',
  templateUrl: './home-vialidad2.page.html',
  styleUrls: ['./home-vialidad2.page.scss'],
})
export class HomeVialidad2Page implements OnInit {
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
  dataPosicion = {lat:0,lng:0,region:'13'}
  region = '13'
  firstFormGroup:FormGroup;
  secondFormGroup:FormGroup;
  thirdFormGroup:FormGroup;
  db:SQLiteObject;
  mostrarMapa = false;
  tab = 0;
  internet = false;
  footer = true;
  regionSelec;
  activosPorRegion = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]
  buscando = false;
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
  loader;
  intento = 0;
  activosDVJSON = [];
  buscandoActivos = [];
  hoy;
  home;
  km;
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

  //RECARGAR PAGINA 
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

  // INICIAR CARGAS
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
      // this.region = this.region == '20' ? '13' : this.region;
      this.dataPosicion.region = this.region;
      this._us.nextmessage('usuario_logeado') 
      // this.loadFiles()
      // this.loadMapVialidad()
    
    if(this.platform.is('capacitor')){
      this.sqlite.create({name:'mydbAlertaTemprana',location:'default',createFromLocation:1}).then((db:SQLiteObject)=>{
        db.executeSql('CREATE TABLE IF NOT EXISTS nivelAlerta (id unique, name)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS transito (id unique, name)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS elemento (id unique, name)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS restriccion (id unique, name)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS activosVialidad (id, nombre,km_i,km_f,region)',[]);
        db.executeSql('CREATE TABLE IF NOT EXISTS alertaVialidad (id, titulo, descripcion, fechaEmergencia, usuario, lat, lng, nivelalerta, region, name, date,codigo,elemento,transito,restriccion,competencia,km_i,km_f,error)',[]);
        this.db = db;
        // this.nivelAlerta();
        // this.elemento();
        // this.transitos()
        // this.restriccioN();
        if(this.region == '20'){
          // this.activosVialidad('20');
        }else{
          // this.activosVialidad(this.region);
        }
        // this.competencia = this.sortJSON(this.competencia,'VALUE','asc')
      })
    }else{
      // this.nivelAlerta();
      // this.elemento();
      // this.transitos()
      // this.restriccioN();
      // if(this.region == '20'){
      //   this.activosVialidad('20');
      // }else{
      //   this.activosVialidad(this.region);
      // }
      // this.competencia = this.sortJSON(this.competencia,'VALUE','asc')
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

  // INICIO MAPA
  loadMapVialidad(): void {
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
      setTimeout(() => {
        this.map.setTarget("map");
      }, 500);
      this._us.coordenadasRegion.forEach(c=>{
        if(c.region == this.region){
          this.view.setCenter(olProj.transform([c.lng,c.lat], 'EPSG:4326', 'EPSG:3857'))
          this.dataPosicion.lng = Number(c.lng.toFixed(6))
          this.dataPosicion.lat = Number(c.lat.toFixed(6))
          this.dataPosicion.region = this.region;
        }
      })
      this.marker.getGeometry().setCoordinates(this.view.getCenter());
      this.chile.setVisible(false)
      this.osm.setVisible(true)
      this.baseLayer.setVisible(false)
      this.regiones = this.chile.getSource().getFeatures();
      this.markers.getSource().addFeature(this.marker);
      this.map.addLayer(this.markers);
      var lonlat = olProj.toLonLat(this.view.getCenter());
      this.dataPosicion.lng = Number(lonlat[0].toFixed(6))
      this.dataPosicion.lat = Number(lonlat[1].toFixed(6))
 
      this.map.getView().on('change:center', ()=>{
        console.log(this.view.getProjection())
        this.obtenerUbicacionRegion()
      });
    })
  }

  obtenerUbicacionRegion(){
    this.marker.getGeometry().setCoordinates(this.view.getCenter());
    var curr = olProj.toLonLat(this.view.getCenter());
    this.dataPosicion.lat = Number(curr[1].toFixed(6));
    this.dataPosicion.lng = Number(curr[0].toFixed(6));
    var region;
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
