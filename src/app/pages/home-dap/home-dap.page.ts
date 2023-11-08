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
import { VialidadService } from 'src/app/services/vialidad/vialidad.service';
import { SelectPage } from '../select/select.page';
import { NavigationExtras } from '@angular/router';

const IMAGE_DIR = 'stored-images';
const SAVE_IMAGE_DIR = 'save-stored-images';

interface LocalFile {
  name:string;
  path:string;
  data:string;
}
@Component({
  selector: 'app-home-dap',
  templateUrl: './home-dap.page.html',
  styleUrls: ['./home-dap.page.scss'],
})
export class HomeDapPage implements OnInit {
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
  constructor(public _ds:DireccionService,private _formBuilder: FormBuilder,public _us:UsuarioService, public platform:Platform,public _http:HttpClient,public _modalCtrl:ModalController,public _navCtrl:NavController,
    private geolocation: Geolocation,public loadctrl:LoadingController,public alertController:AlertController,public _mc:MenuController,private sqlite: SQLite,private keyboard: Keyboard,public _vs:VialidadService,
    public toastController:ToastController,public actionSheetController: ActionSheetController,private animationCtrl: AnimationController,public alertctrl:AlertController,public popoverCtrl:PopoverController,
    public storage: NativeStorage) { 
      
    }

  ngOnInit() {
  }

}
