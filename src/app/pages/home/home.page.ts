import { AfterViewInit, Component, Input, OnInit, Output, EventEmitter, NgZone, ChangeDetectorRef } from '@angular/core';
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

import Projection from 'ol/proj/Projection';
import {register}  from 'ol/proj/proj4';
import {get as GetProjection} from 'ol/proj'
import {Extent} from 'ol/extent';
import TileLayer from 'ol/layer/Tile';
import { ScaleLine, defaults as DefaultControls} from 'ol/control';
import {View, Feature, Map } from 'ol';
import {Coordinate} from 'ol/coordinate';
import OSM, {ATTRIBUTION} from 'ol/source/OSM';
import * as olProj from 'ol/proj';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import VectorSource from 'ol/source/Vector';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import GeoJSON from 'ol/format/GeoJSON';
import TileArcGISRest from 'ol/source/TileArcGISRest';
import FullScreen from 'ol/control/FullScreen';
import Zoom from 'ol/control/Zoom';
import LayerGroup from 'ol/layer/Group';


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
  activosEncontrados;
  stgo = olProj.transform([-70.673676, -33.447487], 'EPSG:4326', 'EPSG:3857')
  view3 =  new View({
    center: this.stgo, 
    zoom: 13
  })
  // projection: Projection;
  // extent: Extent = [-20026376.39, -20048966.10,20026376.39, 20048966.10];
  Map2: Map;
  // chile = new VectorLayer({
  //   source: new VectorSource({
  //       // url: 'assets/maps/chile.geojson',
  //       features: new GeoJSON().readFeature('assets/maps/chile.geojson')
  //   })
  // });

  chile = new VectorLayer({
    // source:new VectorSource({
    //   features: new GeoJSON().readFeatures(null),
    // })
  })
  baseLayer = new TileLayer({
    source: new OSM({
      attributions: ['Mapa de Esri',''],
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 23
    })
  })
  osm = new TileLayer({
    source: new OSM()
  });
  modo = 'osm'

  // dvRedVIal = new TileLayer({
  //   source: new TileArcGISRest({
  //         url: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/Pruebas/Red_Vial_Chile_Cache/MapServer'
  //     }),
  // });
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
  marker = new Feature(new Point(olProj.transform([-70.673676, -33.447487], 'EPSG:4326', 'EPSG:3857')));
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
  layer;
  mostrarMapa2 = false;
  dataPosicion = {lat:0,lng:0,region:null}

  constructor(private _formBuilder: FormBuilder,public _us:UsuarioService, public platform:Platform,public _http:HttpClient,
    private geolocation: Geolocation,public loadctrl:LoadingController,public alertController:AlertController,public _mc:MenuController,private zone: NgZone, private cd: ChangeDetectorRef) {}

  ngOnInit(){
    this._mc.enable(true,'first')
    // this.initailize()
    this._us.cargar_storage().then(()=>{
      this._us.nextmessage('usuario_logeado') 
    })

  }

  ngAfterViewInit(): void {
    // this.initailize()
    this.operatividad();
    this.nivelAlerta();
    this.activos();
    this._http.get('assets/maps/chile.geojson').subscribe((chileJSON:any)=>{
      this.Map2 = new Map({
        layers: [
         this.osm,
         this.baseLayer
        ],
        view:this.view3,
        controls: [new FullScreen(), new Zoom()],

      });
      setTimeout(() => {
        this.Map2.setTarget("map");
      }, 1000);
      this.chile = new VectorLayer({
        source:new VectorSource({
          features: new GeoJSON().readFeatures(chileJSON),
        })
      })
      this.osm.setVisible(true)
      this.baseLayer.setVisible(false)
      this.regiones = this.chile.getSource().getFeatures();
      this.markers.getSource().addFeature(this.marker);
      this.Map2.addLayer(this.markers);
      var lonlat = olProj.toLonLat(this.view3.getCenter());
      this.dataPosicion.lng = Number(lonlat[0].toFixed(6))
      this.dataPosicion.lat = Number(lonlat[1].toFixed(6))
      this.Map2.getView().on('change:center', ()=>{
        this.obtenerUbicacionRegion()
      });
    })
  }

  obtenerUbicacionRegion(){
    this.marker.getGeometry().setCoordinates(this.view3.getCenter());
    var curr = olProj.toLonLat(this.view3.getCenter());
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
    this.presentLoader('Localizando ...').then(()=>{
    this.geolocation.getCurrentPosition().then((resp) => {
      this.view3.setCenter(olProj.transform([resp.coords.longitude,resp.coords.latitude], 'EPSG:4326', 'EPSG:3857'))
      this.marker.getGeometry().setCoordinates(this.view3.getCenter());
      this.view3.setZoom(15)
      this.loader.dismiss();
      // loadModules(['esri/Graphic']).then(([Graphic]) => {
      //   this.view.graphics.removeAll();
      //   this.view2.graphics.removeAll();
      //   this.loader.dismiss();
      //   this.latitude = resp.coords.latitude
      //   this.longitude = resp.coords.longitude
      //   let point = {
      //     type: "point",
      //     longitude: this.longitude,
      //     latitude: this.latitude
      //   };
      //   let markerSymbol = {
      //     type: "picture-marker",
      //     url: "assets/img/pin.png",
      //     width: "50px",
      //     height: "40px"
      //   };
    
      //   let pointGraphic = new Graphic({
      //     geometry: point as any,
      //     symbol: markerSymbol as any,
      //     popupTemplate:null
      //   });
      //   this.view.graphics.add(pointGraphic);
      //   this.view.center = [this.longitude, this.latitude]
      //   this.view.zoom = 15;  
      //   this.view2.graphics.add(pointGraphic);
      //   this.view2.center = [this.longitude, this.latitude]
      //   this.view2.zoom = 15;  
      // })
     }).catch((error) => {
       console.log('Error getting location', error);
     });
    })
  }



  distance(y2, y1, x2, x1) {
    // return Math.round(111.139 * Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)), 0);
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
