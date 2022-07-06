import { AfterViewInit, Component, Input, OnInit, Output, EventEmitter, NgZone, ChangeDetectorRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
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
import { AlertController, LoadingController, MenuController, Platform, ModalController } from '@ionic/angular';

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
import {FullScreen, defaults as defaultControls} from 'ol/control';
import Zoom from 'ol/control/Zoom';
import LayerGroup from 'ol/layer/Group';
import ZoomToExtent from 'ol/control/ZoomToExtent';
import { ModalActivosPage } from '../modal-activos/modal-activos.page';
import { MatStepper } from '@angular/material/stepper';




@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit,AfterViewInit {
  @ViewChild('stepper')  stepper: MatStepper;
  activosEncontrados;
  stgo = olProj.transform([-70.673676, -33.447487], 'EPSG:4326', 'EPSG:3857')
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
    source: new OSM()
  });
  modo = 'osm'

  dvRedVIal = new TileLayer({
    source: new TileArcGISRest({
          url: 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Red_Vial_Chile/MapServer'
      }),
  });
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
  firstFormGroup:FormGroup;
  secondFormGroup:FormGroup;
  thirdFormGroup:FormGroup;
  isLinear = true;
  loader;
  dataPosicion = {lat:0,lng:0,region:'13'}
  operatividadArray = [];
  nivelAlertaArray = [];
  destinosArray = [];

  constructor(private _formBuilder: FormBuilder,public _us:UsuarioService, public platform:Platform,public _http:HttpClient,public _modalCtrl:ModalController,
    private geolocation: Geolocation,public loadctrl:LoadingController,public alertController:AlertController,public _mc:MenuController,private zone: NgZone, private cd: ChangeDetectorRef) {}

  ngOnInit(){
    this.operatividad();
    this.nivelAlerta();
    this.destinos();
    this.firstFormGroup = this._formBuilder.group({
      activoSeleccionado: [null],
    });
    this.secondFormGroup = this._formBuilder.group({
      operatividad:[],
      nivelAlerta:[],
      destino:[]
    })
    this.thirdFormGroup = this._formBuilder.group({
      titulo: [null,Validators.compose([Validators.maxLength(120)])],
      descripcion: [null,Validators.compose([Validators.maxLength(2000)])],
    });
    this._mc.enable(true,'first')
    this._us.cargar_storage().then(()=>{
      this._us.nextmessage('usuario_logeado') 
    })
  }

  ngAfterViewInit(): void {
    this.activos();
    this._http.get('assets/maps/chile.geojson').subscribe((chileJSON:any)=>{
      this.map = new Map({
        layers: [
         this.osm,
         this.baseLayer,
         this.dvRedVIal
        ],
        view:this.view,
        // controls: defaultControls().extend([new FullScreen()]),
      });
      setTimeout(() => {
        this.map.setTarget("map");
      }, 500);
      this.chile = new VectorLayer({
        source:new VectorSource({
          features: new GeoJSON().readFeatures(chileJSON),
        })
      })
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
      this.view.setCenter(olProj.transform([resp.coords.longitude,resp.coords.latitude], 'EPSG:4326', 'EPSG:3857'))
      this.marker.getGeometry().setCoordinates(this.view.getCenter());
      this.view.setZoom(15)
      this.loader.dismiss();
     }).catch((error) => {
       console.log('Error getting location', error);
     });
    })
  }

  async presentLoader(msg) {
    this.loader = await this.loadctrl.create({message: msg,mode:'ios'});
    await this.loader.present();
  }

  operatividad(){
    if(this.platform.is('capacitor')){
      this._us.operatividad().subscribe((res:any)=>{
        if(res && res.status == '200'){
          this._us.xmlToJson(res).then((result:any)=>{
            var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
            path.forEach(f=>{
              this.operatividadArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
            })
          })
        }
      })
    }else{
      this._http.get('../../../assets/operatividad.xml').subscribe((res:any)=>{
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          path.forEach(f=>{
            this.operatividadArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
        })
      },err=>{
        this._us.xmlToJson(err.error.text).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          path.forEach(f=>{
            this.operatividadArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
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
            var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
            path.forEach(f=>{
              this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
            })
          })
        }
      })
    }else{
      this._http.get('../../../assets/nivelAlerta.xml').subscribe((res:any)=>{
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          path.forEach(f=>{
            this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
        })
      },err=>{
        this._us.xmlToJson(err.error.text).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          path.forEach(f=>{
            this.nivelAlertaArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
        })
      })
    }
  }

  destinos(){
    this.destinosArray = [
      { code: "APR", name: "Agua Potable Rural" },
      { code: "DOH-ALL", name: "Aguas Lluvias" },
      { code: "DOH-CAUC", name: "Obras Fluviales" },
      { code: "DOH-RIEG", name: "Riego" }
    ]
  }

  activos(){
    if(this.platform.is('capacitor')){
      this._us.activos().subscribe((res:any)=>{
        if(res && res.status == '200'){
          this._us.xmlToJson(res).then((result:any)=>{
            var path = result['SOAPENV:ENVELOPE']['SOAPENV:BODY'][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET;
            var temp = []
            path.forEach(p=>{
              var activo = {
                "ADMSIST": p.ADMSIST[0],
                "ADMSIST1": p.ADMSIST1[0],
                "ASSETNUM": p.ASSETNUM[0],
                "AUTOMOTORA": p.AUTOMOTORA[0],
                "BENEFEST": Boolean(String(p.BENEFEST[0]['$']['XSI:NIL']).replace(/[\\"]/gi,"")),
                "CLASART160": p.CLASART160[0],
                "CODSIAPR": p.CODSIAPR[0],
                "DESCRIPTION": p.DESCRIPTION[0],
                "FECRESOL": Boolean(String(p.FECRESOL[0]['$']['XSI:NIL']).replace(/[\\"]/gi,"")),
                "INVOICENUM": p.INVOICENUM[0],
                "ISLINEAR": p.ISLINEAR[0],
                "LOCATION": p.LOCATION[0],
                "NUMRESOL": p.NUMRESOL[0],
                "OBSERSIT": p.OBSERSIT[0],
                "PONUM": p.PONUM,
                "PRIORITY": p.PRIORITY[0],
                "PURCHASEDATE": Boolean(String(p.PURCHASEDATE[0]['$']['XSI:NIL']).replace(/[\\"]/gi,"")),
                "RAZONSOC": p.RAZONSOC[0],
                "RECASES": p.RECASES[0],
                "REGION": p.REGION[0],
                "RUT": p.RUT[0],
                "SADDRESSCODE": Number(p.SADDRESSCODE[0]),
                "SEGCOMUNA": p.SEGCOMUNA[0],
                "SITEID": p.SITEID[0],
                "SITUACION": p.SITUACION[0],
                "STATUS": p.STATUS[0]['$']['_'],
                "TIPOACT": p.TIPOACT[0],
                "TIPOTRAC": p.TIPOTRAC[0],
                "SERVICEADDRESS": {
                  "ADDRESSCODE": p.SERVICEADDRESS[0].ADDRESSCODE[0],
                  "ADDRESSLINE2": p.SERVICEADDRESS[0].ADDRESSLINE2[0],
                  "ADDRESSLINE3": p.SERVICEADDRESS[0].ADDRESSLINE3[0],
                  "CITY": p.SERVICEADDRESS[0].CITY[0],
                  "COORDX": Number(p.SERVICEADDRESS[0].COORDX[0]),
                  "COORDX1": Number(p.SERVICEADDRESS[0].COORDX1[0]),
                  "COORDY": Number(p.SERVICEADDRESS[0].COORDY[0]),
                  "COORDY1": Number(p.SERVICEADDRESS[0].COORDY1[0]),
                  "COUNTRY": p.SERVICEADDRESS[0].COUNTRY[0],
                  "COUNTY": p.SERVICEADDRESS[0].COUNTY[0],
                  "DESCRIPTION": p.SERVICEADDRESS[0].DESCRIPTION[0],
                  "DIRECTIONS": p.SERVICEADDRESS[0].DIRECTIONS[0],
                  "FORMATTEDADDRESS": p.SERVICEADDRESS[0].FORMATTEDADDRESS[0],
                  "GEOCODE": p.SERVICEADDRESS[0].GEOCODE[0],
                  "HUSO": p.SERVICEADDRESS[0].HUSO[0],
                  "ISWEATHERZONE": p.SERVICEADDRESS[0].ISWEATHERZONE[0],
                  "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                  "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                  "OBJECTNAME": p.SERVICEADDRESS[0].OBJECTNAME[0],
                  "ORGID": p.SERVICEADDRESS[0].ORGID[0],
                  "PARENT": p.SERVICEADDRESS[0].PARENT[0],
                  "PLUSSFEATURECLASS": p.SERVICEADDRESS[0].PLUSSFEATURECLASS[0],
                  "PLUSSISGIS": p.SERVICEADDRESS[0].PLUSSISGIS[0],
                  "POSTALCODE": p.SERVICEADDRESS[0].POSTALCODE[0],
                  "REFERENCEPOINT": p.SERVICEADDRESS[0].REFERENCEPOINT[0],
                  "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                  "SERVICEADDRESSID": Number(p.SERVICEADDRESS[0].SERVICEADDRESSID[0]),
                  "STADDRDIRPRFX": p.SERVICEADDRESS[0].STADDRDIRPRFX[0],
                  "STADDRDIRSFX": p.SERVICEADDRESS[0].STADDRDIRSFX[0],
                  "STADDRNUMBER": p.SERVICEADDRESS[0].STADDRNUMBER[0],
                  "STADDRSTREET": p.SERVICEADDRESS[0].STADDRSTREET[0],
                  "STADDRSTTYPE": p.SERVICEADDRESS[0].STADDRSTTYPE[0],
                  "STADDRUNITNUM": p.SERVICEADDRESS[0].STADDRUNITNUM[0],
                  "STATEPROVINCE": p.SERVICEADDRESS[0].STATEPROVINCE[0],
                  "STREETADDRESS": p.SERVICEADDRESS[0].STREETADDRESS[0],
                  "TIMEZONE": p.SERVICEADDRESS[0].TIMEZONE[0]
                }
              }
              temp.push(activo)
            })
            this.activosEncontrados = temp;
          })
        }
      })
    }else{
      this._http.get('../../../assets/activos.xml').subscribe((res:any)=>{
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result['SOAPENV:ENVELOPE']['SOAPENV:BODY'][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET;
          var temp = []
          path.forEach(p=>{
            var activo = {
              "ADMSIST": p.ADMSIST[0],
              "ADMSIST1": p.ADMSIST1[0],
              "ASSETNUM": p.ASSETNUM[0],
              "AUTOMOTORA": p.AUTOMOTORA[0],
              "BENEFEST": Boolean(String(p.BENEFEST[0]['$']['XSI:NIL']).replace(/[\\"]/gi,"")),
              "CLASART160": p.CLASART160[0],
              "CODSIAPR": p.CODSIAPR[0],
              "DESCRIPTION": p.DESCRIPTION[0],
              "FECRESOL": Boolean(String(p.FECRESOL[0]['$']['XSI:NIL']).replace(/[\\"]/gi,"")),
              "INVOICENUM": p.INVOICENUM[0],
              "ISLINEAR": p.ISLINEAR[0],
              "LOCATION": p.LOCATION[0],
              "NUMRESOL": p.NUMRESOL[0],
              "OBSERSIT": p.OBSERSIT[0],
              "PONUM": p.PONUM,
              "PRIORITY": p.PRIORITY[0],
              "PURCHASEDATE": Boolean(String(p.PURCHASEDATE[0]['$']['XSI:NIL']).replace(/[\\"]/gi,"")),
              "RAZONSOC": p.RAZONSOC[0],
              "RECASES": p.RECASES[0],
              "REGION": p.REGION[0],
              "RUT": p.RUT[0],
              "SADDRESSCODE": Number(p.SADDRESSCODE[0]),
              "SEGCOMUNA": p.SEGCOMUNA[0],
              "SITEID": p.SITEID[0],
              "SITUACION": p.SITUACION[0],
              "STATUS": p.STATUS[0]['$']['_'],
              "TIPOACT": p.TIPOACT[0],
              "TIPOTRAC": p.TIPOTRAC[0],
              "SERVICEADDRESS": {
                "ADDRESSCODE": p.SERVICEADDRESS[0].ADDRESSCODE[0],
                "ADDRESSLINE2": p.SERVICEADDRESS[0].ADDRESSLINE2[0],
                "ADDRESSLINE3": p.SERVICEADDRESS[0].ADDRESSLINE3[0],
                "CITY": p.SERVICEADDRESS[0].CITY[0],
                "COORDX": Number(p.SERVICEADDRESS[0].COORDX[0]),
                "COORDX1": Number(p.SERVICEADDRESS[0].COORDX1[0]),
                "COORDY": Number(p.SERVICEADDRESS[0].COORDY[0]),
                "COORDY1": Number(p.SERVICEADDRESS[0].COORDY1[0]),
                "COUNTRY": p.SERVICEADDRESS[0].COUNTRY[0],
                "COUNTY": p.SERVICEADDRESS[0].COUNTY[0],
                "DESCRIPTION": p.SERVICEADDRESS[0].DESCRIPTION[0],
                "DIRECTIONS": p.SERVICEADDRESS[0].DIRECTIONS[0],
                "FORMATTEDADDRESS": p.SERVICEADDRESS[0].FORMATTEDADDRESS[0],
                "GEOCODE": p.SERVICEADDRESS[0].GEOCODE[0],
                "HUSO": p.SERVICEADDRESS[0].HUSO[0],
                "ISWEATHERZONE": p.SERVICEADDRESS[0].ISWEATHERZONE[0],
                "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                "OBJECTNAME": p.SERVICEADDRESS[0].OBJECTNAME[0],
                "ORGID": p.SERVICEADDRESS[0].ORGID[0],
                "PARENT": p.SERVICEADDRESS[0].PARENT[0],
                "PLUSSFEATURECLASS": p.SERVICEADDRESS[0].PLUSSFEATURECLASS[0],
                "PLUSSISGIS": p.SERVICEADDRESS[0].PLUSSISGIS[0],
                "POSTALCODE": p.SERVICEADDRESS[0].POSTALCODE[0],
                "REFERENCEPOINT": p.SERVICEADDRESS[0].REFERENCEPOINT[0],
                "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                "SERVICEADDRESSID": Number(p.SERVICEADDRESS[0].SERVICEADDRESSID[0]),
                "STADDRDIRPRFX": p.SERVICEADDRESS[0].STADDRDIRPRFX[0],
                "STADDRDIRSFX": p.SERVICEADDRESS[0].STADDRDIRSFX[0],
                "STADDRNUMBER": p.SERVICEADDRESS[0].STADDRNUMBER[0],
                "STADDRSTREET": p.SERVICEADDRESS[0].STADDRSTREET[0],
                "STADDRSTTYPE": p.SERVICEADDRESS[0].STADDRSTTYPE[0],
                "STADDRUNITNUM": p.SERVICEADDRESS[0].STADDRUNITNUM[0],
                "STATEPROVINCE": p.SERVICEADDRESS[0].STATEPROVINCE[0],
                "STREETADDRESS": p.SERVICEADDRESS[0].STREETADDRESS[0],
                "TIMEZONE": p.SERVICEADDRESS[0].TIMEZONE[0]
              }
            }
            temp.push(activo)
          })
          this.activosEncontrados = temp;
        })
      },err=>{
        this._us.xmlToJson(err.error.text).then((result:any)=>{
          var path = result['SOAPENV:ENVELOPE']['SOAPENV:BODY'][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET;
          var temp = []
          path.forEach(p=>{
            var activo = {
              "ADMSIST": p.ADMSIST[0],
              "ADMSIST1": p.ADMSIST1[0],
              "ASSETNUM": p.ASSETNUM[0],
              "AUTOMOTORA": p.AUTOMOTORA[0],
              "BENEFEST": Boolean(String(p.BENEFEST[0]['$']['XSI:NIL']).replace(/[\\"]/gi,"")),
              "CLASART160": p.CLASART160[0],
              "CODSIAPR": p.CODSIAPR[0],
              "DESCRIPTION": p.DESCRIPTION[0],
              "FECRESOL": Boolean(String(p.FECRESOL[0]['$']['XSI:NIL']).replace(/[\\"]/gi,"")),
              "INVOICENUM": p.INVOICENUM[0],
              "ISLINEAR": p.ISLINEAR[0],
              "LOCATION": p.LOCATION[0],
              "NUMRESOL": p.NUMRESOL[0],
              "OBSERSIT": p.OBSERSIT[0],
              "PONUM": p.PONUM,
              "PRIORITY": p.PRIORITY[0],
              "PURCHASEDATE": Boolean(String(p.PURCHASEDATE[0]['$']['XSI:NIL']).replace(/[\\"]/gi,"")),
              "RAZONSOC": p.RAZONSOC[0],
              "RECASES": p.RECASES[0],
              "REGION": p.REGION[0],
              "RUT": p.RUT[0],
              "SADDRESSCODE": Number(p.SADDRESSCODE[0]),
              "SEGCOMUNA": p.SEGCOMUNA[0],
              "SITEID": p.SITEID[0],
              "SITUACION": p.SITUACION[0],
              "STATUS": p.STATUS[0]['$']['_'],
              "TIPOACT": p.TIPOACT[0],
              "TIPOTRAC": p.TIPOTRAC[0],
              "SERVICEADDRESS": {
                "ADDRESSCODE": p.SERVICEADDRESS[0].ADDRESSCODE[0],
                "ADDRESSLINE2": p.SERVICEADDRESS[0].ADDRESSLINE2[0],
                "ADDRESSLINE3": p.SERVICEADDRESS[0].ADDRESSLINE3[0],
                "CITY": p.SERVICEADDRESS[0].CITY[0],
                "COORDX": Number(p.SERVICEADDRESS[0].COORDX[0]),
                "COORDX1": Number(p.SERVICEADDRESS[0].COORDX1[0]),
                "COORDY": Number(p.SERVICEADDRESS[0].COORDY[0]),
                "COORDY1": Number(p.SERVICEADDRESS[0].COORDY1[0]),
                "COUNTRY": p.SERVICEADDRESS[0].COUNTRY[0],
                "COUNTY": p.SERVICEADDRESS[0].COUNTY[0],
                "DESCRIPTION": p.SERVICEADDRESS[0].DESCRIPTION[0],
                "DIRECTIONS": p.SERVICEADDRESS[0].DIRECTIONS[0],
                "FORMATTEDADDRESS": p.SERVICEADDRESS[0].FORMATTEDADDRESS[0],
                "GEOCODE": p.SERVICEADDRESS[0].GEOCODE[0],
                "HUSO": p.SERVICEADDRESS[0].HUSO[0],
                "ISWEATHERZONE": p.SERVICEADDRESS[0].ISWEATHERZONE[0],
                "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                "OBJECTNAME": p.SERVICEADDRESS[0].OBJECTNAME[0],
                "ORGID": p.SERVICEADDRESS[0].ORGID[0],
                "PARENT": p.SERVICEADDRESS[0].PARENT[0],
                "PLUSSFEATURECLASS": p.SERVICEADDRESS[0].PLUSSFEATURECLASS[0],
                "PLUSSISGIS": p.SERVICEADDRESS[0].PLUSSISGIS[0],
                "POSTALCODE": p.SERVICEADDRESS[0].POSTALCODE[0],
                "REFERENCEPOINT": p.SERVICEADDRESS[0].REFERENCEPOINT[0],
                "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                "SERVICEADDRESSID": Number(p.SERVICEADDRESS[0].SERVICEADDRESSID[0]),
                "STADDRDIRPRFX": p.SERVICEADDRESS[0].STADDRDIRPRFX[0],
                "STADDRDIRSFX": p.SERVICEADDRESS[0].STADDRDIRSFX[0],
                "STADDRNUMBER": p.SERVICEADDRESS[0].STADDRNUMBER[0],
                "STADDRSTREET": p.SERVICEADDRESS[0].STADDRSTREET[0],
                "STADDRSTTYPE": p.SERVICEADDRESS[0].STADDRSTTYPE[0],
                "STADDRUNITNUM": p.SERVICEADDRESS[0].STADDRUNITNUM[0],
                "STATEPROVINCE": p.SERVICEADDRESS[0].STATEPROVINCE[0],
                "STREETADDRESS": p.SERVICEADDRESS[0].STREETADDRESS[0],
                "TIMEZONE": p.SERVICEADDRESS[0].TIMEZONE[0]
              }
            }
            temp.push(activo)
          })
          this.activosEncontrados = temp;
        })
      })
    }
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
        activos:this.activosEncontrados,
        coord:olProj.toLonLat(this.marker.getGeometry().getCoordinates())
      }
    });
    modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      // console.log(data);
      this.firstFormGroup.controls['activoSeleccionado'].setValue(data)
      this.view.setCenter(olProj.transform([data.activo.SERVICEADDRESS.LONGITUDEX,data.activo.SERVICEADDRESS.LATITUDEY], 'EPSG:4326', 'EPSG:3857'));
      this.obtenerUbicacionRegion()
      this.view.setZoom(15)
    }
  }
 
  moverStepperr(direction){
    if(direction == 'next'){
      this.stepper.next();
    }else{
      this.stepper.previous()
    }
  }

}