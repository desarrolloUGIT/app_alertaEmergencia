import { AfterViewInit, Component, OnInit } from '@angular/core';
import {FormBuilder, Validators} from '@angular/forms';
// import IdentifyParameters from "@arcgis/core/rest/support/IdentifyParameters";
// import * as identify from "@arcgis/core/rest/identify";
// import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
// import Map from '@arcgis/core/Map';
// import MapView from '@arcgis/core/views/MapView';
// import Graphic from "@arcgis/core/Graphic";
// import GraphicsLayer from '@arcgis/core/Graphic';
import { loadModules } from 'esri-loader';
// import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { UsuarioService } from '../../services/usuario.service';
import { HttpClient } from '@angular/common/http';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { AlertController, LoadingController, MenuController } from '@ionic/angular';

const template = {
  title: "Resumen",
  content: [{
    type: "fields",
    fieldInfos:
    [
      {       
        fieldName: "NOMBRE",
        label: "Nombre"
      },
      {
        fieldName: "ESTADO",
        label: "Estado Consulta"
      },
      {
        fieldName: "DIRECCION",
        label: "Dirección MOP"
      },
      {
        fieldName: "REGION",
        label: "Región"
      },
      {
        fieldName: "COMUNAS",
        label: "Comunas"
      },
      {
        fieldName: "LINK",
        label: "Link a web MOP"
      }
    ]
  }]
};



@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit,AfterViewInit {
  firstFormGroup = this._formBuilder.group({
    firstCtrl: ['', Validators.required],
  });
  secondFormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required],
  });
  isLinear = true;

  // MAPA
  latitude: any = 0; //latitude
  longitude: any = 0; //longitude
  view;
  map;
  mapImageLayerEmergencia: any;
  currentQuery : string;
  coordenadas: any;
  basemap = 'streets-vector'
  loader;

  constructor(private _formBuilder: FormBuilder,public _us:UsuarioService, public _http:HttpClient,
    private geolocation: Geolocation,public loadctrl:LoadingController,public alertController:AlertController,public _mc:MenuController) {}

  ngOnInit(){
    this._mc.enable(true,'first')
    this.initailize()
    this._us.cargar_storage().then(()=>{
      this._us.nextmessage('usuario_logeado') 
    })
  }

  ngAfterViewInit(): void {
    this.initailize()
  }
  mapViewIdentify(mapPoint,IdentifyTask,IdentifyParameters,EmergenciasURL){
    let identifyTask = new IdentifyTask(EmergenciasURL);
    let params = new IdentifyParameters();
    params.tolerance = 15;
    params.layerIds = [0];
    params.layerDefinitions = "FECHA >= '" + '' + "'";
    params.layerOption = "visible";
    params.width = this.view.width;
    params.height = this.view.height;
    params.geometry = mapPoint;
    params.mapExtent = this.view.extent;
    identifyTask.execute(params).then((response)=>{
      // console.log(response,mapPoint)
      // this.sendIndentifyData.emit([[0],[response]]);
    });
  }

  async initailize(){
    const [Map,
      MapView,
      MapImageLayer,
      FeatureLayer,
      IdentifyTask,
      IdentifyParameters,
      Legend,
      Basemap,
      BasemapGallery,
      intl,
      Multipoint,
      Point,
      watchUtils,
      SimpleMarkerSymbol,
      StatisticDefinition,
      Graphic, ScaleBar,
      Print,
      Search,
      Locator]:any = await loadModules([
      'esri/Map',
      'esri/views/MapView',
      'esri/layers/MapImageLayer',
      'esri/layers/FeatureLayer',
      "esri/tasks/IdentifyTask",
      "esri/tasks/support/IdentifyParameters",
      'esri/widgets/Legend',
      'esri/Basemap',
      'esri/widgets/BasemapGallery',
      "esri/intl",
      'esri/geometry/Multipoint',
      "esri/geometry/Point",
      'esri/core/watchUtils',
      'esri/symbols/SimpleMarkerSymbol',
      "esri/tasks/support/StatisticDefinition",
      "esri/Graphic",
      "esri/widgets/ScaleBar",
      "esri/widgets/Print",
      "esri/widgets/Search",
      "esri/tasks/Locator"
    ])
      .catch(err => {
        console.error("ArcGIS: ", err);
      });
    this.map = new Map({
      basemap: this.basemap
    });
    const vialidadRedVialURL = 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Red_Vial_Chile/MapServer';
    this.mapImageLayerEmergencia = new MapImageLayer({
      url: vialidadRedVialURL
    })
    this.view = new MapView({
      container: "container", 
      map: this.map, 
      constraints : {
        minZoom :2,
        maxZoom:21
      },
    });
    this.view.center = [-70.673676, -33.447487]
    this.view.zoom = 10;  
    this.map.add(this.mapImageLayerEmergencia);

    await this.view.when(() => {
      this.view.on("click",(e)=>{
        this.mapViewIdentify(e.mapPoint,IdentifyTask,IdentifyParameters,vialidadRedVialURL);
      });
    });
  }

  customZoom(){
    if(this.basemap == "streets-vector"){
      this.map.basemap = 'satellite' 
      this.basemap = 'satellite' 
    }else{
      this.map.basemap = 'streets-vector' 
      this.basemap = 'streets-vector' 
    }
  }

  async presentLoader(msg) {
    this.loader = await this.loadctrl.create({message: msg,mode:'ios'});
    await this.loader.present();
  }

  obtenerGeolocalizacion(){
    this.presentLoader('Localizando ...').then(()=>{
    this.geolocation.getCurrentPosition().then((resp) => {
      loadModules(['esri/Graphic']).then(([Graphic]) => {
        this.loader.dismiss();
        this.latitude = resp.coords.latitude
        this.longitude = resp.coords.longitude
        let point = {
          type: "point",  // autocasts as new Point()
          longitude: this.longitude,
          latitude: this.latitude
        };
        let markerSymbol = {
          type: "picture-marker",  // autocasts as new PictureMarkerSymbol()
          url: "assets/img/pin.png",
          width: "50px",
          height: "40px"
        };
    
        let pointGraphic = new Graphic({
          geometry: point as any,
          symbol: markerSymbol as any,
          popupTemplate:null
        });
        this.view.graphics.add(pointGraphic);
        this.view.center = [this.longitude, this.latitude]
        this.view.zoom = 15;  
      })
     }).catch((error) => {
       console.log('Error getting location', error);
     });
    })
  }

}
