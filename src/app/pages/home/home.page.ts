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
import { AlertController, LoadingController, MenuController, Platform } from '@ionic/angular';

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
  latitude: any = 0;
  longitude: any = 0;
  view;
  view2;
  map;
  mapImageLayerEmergencia: any;
  currentQuery : string;
  coordenadas: any;
  basemap = 'streets-vector'
  loader;
  mostrarMapa2 = false;
  constructor(private _formBuilder: FormBuilder,public _us:UsuarioService, public platform:Platform,public _http:HttpClient,
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
    this.operatividad();
    this.nivelAlerta();
    this.activos();
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
      "esri/rest/support/IdentifyParameters",
      'esri/widgets/Legend',
      'esri/Basemap',
      'esri/widgets/BasemapGallery',
      "esri/intl",
      'esri/geometry/Multipoint',
      "esri/geometry/Point",
      'esri/core/watchUtils',
      'esri/symbols/SimpleMarkerSymbol',
      "esri/rest/support/StatisticDefinition",
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
    this.view2 = new MapView({
      container: "container2", 
      map: this.map, 
      constraints : {
        minZoom :2,
        maxZoom:21
      },
    });
    this.view.center = [-70.673676, -33.447487]
    this.view.zoom = 10;
    this.view2.center = [-70.673676, -33.447487]
    this.view2.zoom = 10  
    this.map.add(this.mapImageLayerEmergencia);

    await this.view.when(() => {
      this.view.on("click",(e)=>{
        this.mapViewIdentify(e.mapPoint,IdentifyTask,IdentifyParameters,vialidadRedVialURL);
      });
    });

    this.view.on("pointer-move", (e:any)=>{
      let point = this.view.toMap(e);
      this.coordenadas = ("X: " +point.longitude.toFixed(3) + " Y: " + point.latitude.toFixed(3))
      console.log('coordenadas-> ',this.coordenadas)
      let point2 = {
        type: "point",
        longitude: point.longitude.toFixed(3),
        latitude: point.latitude.toFixed(3)
      };
      let markerSymbol = {
        type: "picture-marker",
        url: "assets/img/pin.png",
        width: "50px",
        height: "40px"
      };
  
      let pointGraphic = new Graphic({
        geometry: point2 as any,
        symbol: markerSymbol as any,
        popupTemplate:null
      });
      this.view.graphics.removeAll();
      this.view.graphics.add(pointGraphic);
      setTimeout(()=>{
        this.view.center = [point.longitude.toFixed(3), point.latitude.toFixed(3)]
      },1000)
      // this.view.center = [point.longitude.toFixed(3), point.latitude.toFixed(3)]
      // var point = this.getCenterPoint();
     
      // // var newPoint = webMercatorUtils.webMercatorToGeographic(point);
     
      // console.log("current map center point is x: " + point.getLatitude() + ", y: " + point.getLongitude());
      // console.log("current map center is x: " + newPoint.x + ", y: " + newPoint.y);
    });
    
  }

  getCenterPoint()
{
  return this.map.extent.getCenter();
}

  expandir(){
    if(this.mostrarMapa2){
      this.mostrarMapa2 = false;
    }else{
      this.mostrarMapa2 = true;
    }
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
        this.view.graphics.removeAll();
        this.view2.graphics.removeAll();
        this.loader.dismiss();
        this.latitude = resp.coords.latitude
        this.longitude = resp.coords.longitude
        let point = {
          type: "point",
          longitude: this.longitude,
          latitude: this.latitude
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
        this.view.graphics.add(pointGraphic);
        this.view.center = [this.longitude, this.latitude]
        this.view.zoom = 15;  
        this.view2.graphics.add(pointGraphic);
        this.view2.center = [this.longitude, this.latitude]
        this.view2.zoom = 15;  
      })
     }).catch((error) => {
       console.log('Error getting location', error);
     });
    })
  }

  operatividad(){
    if(this.platform.is('capacitor')){
      this._us.operatividad().subscribe((res:any)=>{
        if(res && res.status == '200'){
          this._us.xmlToJson(res).then((result:any)=>{
            // console.log(result)
          })
        }
      })
    }else{
      this._http.get('../../../assets/operatividad.xml').subscribe((res:any)=>{
        this._us.xmlToJson(res).then((result:any)=>{
          // console.log(result)
        })
      },err=>{
        this._us.xmlToJson(err.error.text).then((result:any)=>{
          // console.log(result)
        })
      })
    }
  }

  nivelAlerta(){
    if(this.platform.is('capacitor')){
      this._us.nivelAlerta().subscribe((res:any)=>{
        // console.log('ALERTA-> ',res)
        if(res && res.status == '200'){
          this._us.xmlToJson(res).then((result:any)=>{
            // console.log(result)
          })
        }
      })
    }else{
      this._http.get('../../../assets/nivelAlerta.xml').subscribe((res:any)=>{
        this._us.xmlToJson(res).then((result:any)=>{
          // console.log(result)
        })
      },err=>{
        this._us.xmlToJson(err.error.text).then((result:any)=>{
          // console.log(result)
        })
      })
    }
  }

  activos(){
    if(this.platform.is('capacitor')){
      this._us.activos().subscribe((res:any)=>{
        console.log('ACTIVOS-> ',res)
        if(res && res.status == '200'){
          this._us.xmlToJson(res).then((result:any)=>{
            // console.log(result)
          })
        }
      })
    }else{
      this._http.get('../../../assets/nivelAlerta.xml').subscribe((res:any)=>{
        this._us.xmlToJson(res).then((result:any)=>{
          // console.log(result)
        })
      },err=>{
        this._us.xmlToJson(err.error.text).then((result:any)=>{
          // console.log(result)
        })
      })
    }
  }

}
