import { AfterViewInit, Component, Input, OnInit, Output, EventEmitter, NgZone, ChangeDetectorRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { loadModules } from 'esri-loader';
import { UsuarioService } from '../../services/usuario.service';
import { HttpClient } from '@angular/common/http';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { AlertController, LoadingController, MenuController, Platform, ModalController, ToastController } from '@ionic/angular';
import TileLayer from 'ol/layer/Tile';
import {View, Feature, Map } from 'ol';
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
import { ModalActivosPage } from '../modal-activos/modal-activos.page';
import { MatStepper } from '@angular/material/stepper';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { Camera, CameraResultType, CameraSource, Photo} from '@capacitor/camera'
import { Directory, Filesystem } from '@capacitor/filesystem';
import { ActionSheetController } from '@ionic/angular';

const IMAGE_DIR = 'stored-images';

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
  db:SQLiteObject;
  images: LocalFile[] = [];
  coordenadas;
  existenActivos = true;
  picture = null;
  constructor(private _formBuilder: FormBuilder,public _us:UsuarioService, public platform:Platform,public _http:HttpClient,public _modalCtrl:ModalController,
    private geolocation: Geolocation,public loadctrl:LoadingController,public alertController:AlertController,public _mc:MenuController,private sqlite: SQLite,
    public toastController:ToastController,public actionSheetController: ActionSheetController) {}

  ngOnInit(){
    if(this.platform.is('capacitor')){
      this.sqlite.create({name:'mydbAlertaTemprana',location:'default',createFromLocation:1}).then((db:SQLiteObject)=>{
        db.executeSql('CREATE TABLE IF NOT EXISTS activos (id unique, name, cod, lugar,lat,lng)')
        db.executeSql('CREATE TABLE IF NOT EXISTS operatividad (id unique, name)')
        db.executeSql('CREATE TABLE IF NOT EXISTS nivelAlerta (id unique, name)')
        db.executeSql('CREATE TABLE IF NOT EXISTS alerta (id integer primary key autoincrement , titulo, descripcion, destino, usuario, lat, lng, nivelalerta, operatividad, region)');
        this.db = db;
        this.operatividad();
        this.nivelAlerta();
        this.destinos();
        this.activos();
      })
    }else{
      this.operatividad();
      this.nivelAlerta();
      this.destinos();
      this.activos();
    }
    this.loadFiles()
    this.firstFormGroup = this._formBuilder.group({
      activoSeleccionado: [null],
    });
    this.secondFormGroup = this._formBuilder.group({
      operatividad:[null,Validators.compose([Validators.required])],
      nivelAlerta:[null,Validators.compose([Validators.required])],
      destino:[null,Validators.compose([Validators.required])]
    })
    this.thirdFormGroup = this._formBuilder.group({
      titulo: [null,Validators.compose([Validators.maxLength(150),Validators.required])],
      descripcion: [null,Validators.compose([Validators.maxLength(1000),Validators.required])],
    });
    this._mc.enable(true,'first')
    this._us.cargar_storage().then(()=>{
      this._us.nextmessage('usuario_logeado') 
    })
    // this.loadFiles()
  }

// INICIO MAPA
  ngAfterViewInit(): void {
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
      this.obtenerUbicacionRegion()
     }).catch((error) => {
       console.log('Error getting location', error);
     });
    })
  }
  // FIN MAPA
  // CARGAS INICIALES
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
            this.nivelAlertaArray = arr;
            this.actualizarOperatividad()
          }else{
            this._http.get('assets/operatividad.xml',{ responseType: 'text' }).subscribe((res:any)=>{
              this._us.xmlToJson(res).then((result:any)=>{
                var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
                this.operatividadArray = []
                path.forEach(f=>{
                  this.operatividadArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
                })
                if(this.platform.is('capacitor')){
                  this.actualizarOperatividad()
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
                  this.actualizarOperatividad()
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
            this.actualizarOperatividad()
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
            this.actualizarOperatividad()
          }
        })
      })
    }
  }

  actualizarOperatividad(){
    this._us.operatividad().subscribe((res:any)=>{
      // console.log('OPERATIVIDAD -> ',res)
      if(res && res.status == '200'){
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result["SOAPENV:ENVELOPE"]["SOAPENV:BODY"][0].QUERYMOP_DOMAIN_DOHRESPONSE[0].MOP_DOMAIN_DOHSET[0].MAXDOMAIN[0].ALNDOMAIN
          this.operatividadArray = []
          path.forEach(f=>{
            this.operatividadArray.push({DESCRIPTION:f.DESCRIPTION[0],VALUE:f.VALUE[0]})
          })
          this.db.open().then(()=>{
            this.db.transaction(rx=>{
              rx.executeSql('delete from nivelAlerta', [], ()=>{
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
    this._us.nivelAlerta().subscribe((res:any)=>{
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
      { code: "APR", name: "Agua Potable Rural" },
      { code: "DOH-ALL", name: "Aguas Lluvias" },
      { code: "DOH-CAUC", name: "Obras Fluviales" },
      { code: "DOH-RIEG", name: "Riego" }
    ]
  }

  activos(){
    this._us.cargar_storage().then(()=>{
      if(this._us.menuType == 'DV' || this._us.menuType == 'DGA' || this._us.menuType == 'DGOP'){
        this.existenActivos = false;
      }else{
        if(!this._us.menuType || this._us.menuType == ''){
          this.existenActivos = false;
        }else{
          if(this.platform.is('capacitor')){
            this.db.open().then(()=>{
              this.db.executeSql('SELECT * FROM activos', []).then((data)=>{
                if(data.rows.length > 0){
                  var arr = []
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
                    i++;
                    arr.push(tmp)
                  })
                  this.activosEncontrados = arr;
                  this.actualizarActivos()
                }else{
                  this._http.get('assets/activos.xml',{ responseType: 'text' }).subscribe((res:any)=>{
                    this._us.xmlToJson(res).then((result:any)=>{
                      var path = result['SOAPENV:ENVELOPE']['SOAPENV:BODY'][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET;
                      var temp = []
                      path.forEach(p=>{
                        var activo = {
                          "ASSETNUM": p.ASSETNUM[0],
                          "DESCRIPTION": p.DESCRIPTION[0],
                          "SITEID": p.SITEID[0],
                          "SERVICEADDRESS": {
                            "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                            "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                            "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                          }
                        }
                        temp.push(activo)
                      })
                      this.activosEncontrados = temp;
                      if(this.platform.is('capacitor')){
                        this.actualizarActivos()
                      }
                    })
                  },err=>{
                    this._us.xmlToJson(err.error.text).then((result:any)=>{
                      var path = result['SOAPENV:ENVELOPE']['SOAPENV:BODY'][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET;
                      var temp = []
                      path.forEach(p=>{
                        var activo = {
                          "ASSETNUM": p.ASSETNUM[0],
                          "DESCRIPTION": p.DESCRIPTION[0],
                          "SITEID": p.SITEID[0],
                          "SERVICEADDRESS": {
                            "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                            "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                            "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                          }
                        }
                        temp.push(activo)
                      })
                      this.activosEncontrados = temp;
                      if(this.platform.is('capacitor')){
                        this.actualizarActivos()
                      }
                    })
                  })
                }
              }).catch(err=>{
              })
            })
          }else{
            this._http.get('assets/activos.xml',{ responseType: 'text' }).subscribe((res:any)=>{
              this._us.xmlToJson(res).then((result:any)=>{
                var path = result['SOAPENV:ENVELOPE']['SOAPENV:BODY'][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET;
                var temp = []
                path.forEach(p=>{
                  var activo = {
                    "ASSETNUM": p.ASSETNUM[0],
                    "DESCRIPTION": p.DESCRIPTION[0],
                    "SITEID": p.SITEID[0],
                    "SERVICEADDRESS": {
                      "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                      "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                      "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                    }
                  }
                  temp.push(activo)
                })
                this.activosEncontrados = temp;
                if(this.platform.is('capacitor')){
                  this.actualizarActivos()
                }else{
                  this.presentToast('Se actualizaron '+this.activosEncontrados.length+' activos.')
                }
              })
            },err=>{
              this._us.xmlToJson(err.error.text).then((result:any)=>{
                var path = result['SOAPENV:ENVELOPE']['SOAPENV:BODY'][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET;
                var temp = []
                path.forEach(p=>{
                  var activo = {
                    "ASSETNUM": p.ASSETNUM[0],
                    "DESCRIPTION": p.DESCRIPTION[0],
                    "SITEID": p.SITEID[0],
                    "SERVICEADDRESS": {
                      "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                      "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                      "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
                    }
                  }
                  temp.push(activo)
                })
                this.activosEncontrados = temp;
                if(this.platform.is('capacitor')){
                  this.actualizarActivos()
                }else{
                  this.presentToast('Se actualizaron '+this.activosEncontrados.length+' activos.')
                }
              })
            })
          }
        }
      }
    })

  }

  actualizarActivos(){ 
    this._us.activos().subscribe((res:any)=>{
      if(res && res.status == '200'){
        this._us.xmlToJson(res).then((result:any)=>{
          var path = result['SOAPENV:ENVELOPE']['SOAPENV:BODY'][0].QUERYMOP_ASSET_DOHRESPONSE[0].MOP_ASSET_DOHSET[0].ASSET;
          var temp = []
          path.forEach(p=>{
            var activo = {
              "ASSETNUM": p.ASSETNUM[0],
              "DESCRIPTION": p.DESCRIPTION[0],
              "SITEID": p.SITEID[0],
              "SERVICEADDRESS": {
                "LATITUDEY": Number(p.SERVICEADDRESS[0].LATITUDEY[0]),
                "LONGITUDEX": Number(p.SERVICEADDRESS[0].LONGITUDEX[0]),
                "REGIONDISTRICT": p.SERVICEADDRESS[0].REGIONDISTRICT[0],
              }
            }
            temp.push(activo)
          })
          this.db.open().then(()=>{
              this.db.transaction(rx=>{
                rx.executeSql('delete from activos', [], ()=>{
                  temp.forEach((activo,i)=>{
                  this.db.transaction(tx=>{
                    tx.executeSql('insert into activos (id,name,lat,lng,cod,lugar) values (?,?,?,?,?,?)', [activo.ASSETNUM, activo.DESCRIPTION, activo.SERVICEADDRESS.LATITUDEY, activo.SERVICEADDRESS.LONGITUDEX, activo.SITEID, activo.SERVICEADDRESS.REGIONDISTRICT]);
                  })
                  })
                })
              }).then(()=>{
                this.activosEncontrados = temp;
                this.presentToast('Se actualizaron '+this.activosEncontrados.length+' activos.')
            }).catch(()=>{
                this.db.executeSql('SELECT * FROM activos', []).then((data)=>{
                  if(data.rows.length > 0){
                    var arr = []
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
                      arr.push(tmp)
                    })
                    this.activosEncontrados = arr;
                    this.presentToast('Se actualizaron '+this.activosEncontrados.length+' activos.')
                  }else{
                    this.presentToast('No se han podido cargar activos')
                  }
                })     
            })
          })
        })
      }else{
        this.db.open().then(()=>{
          this.db.executeSql('SELECT * FROM activos', []).then((data)=>{
            if(data.rows.length > 0){
              var arr = []
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
                arr.push(tmp)
              })
              this.activosEncontrados = arr;
              this.presentToast('Se actualizaron '+this.activosEncontrados.length+' activos.')
            }else{
              this.presentToast('No se han podido cargar activos')
            }
          })     
        })
      }
    },err=>{
      console.log('ERRROR ->',err)
      this.db.open().then(()=>{
        this.db.executeSql('SELECT * FROM activos', []).then((data)=>{
          if(data.rows.length > 0){
            var arr = []
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
              arr.push(tmp)
            })
            this.activosEncontrados = arr;
            this.presentToast('Se actualizaron '+this.activosEncontrados.length+' activos.')
          }else{
            this.presentToast('No se han podido cargar activos')
          }
        })     
      })
    })
  }
  // FIN CARGAS INICIALES
  // OTROS
  async presentLoader(msg) {
    this.loader = await this.loadctrl.create({message: msg,mode:'ios'});
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
        activos:this.activosEncontrados,
        coord:olProj.toLonLat(this.marker.getGeometry().getCoordinates())
      }
    });
    modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.firstFormGroup.controls['activoSeleccionado'].setValue(data)
      this.view.setCenter(olProj.transform([data.activo.SERVICEADDRESS.LONGITUDEX,data.activo.SERVICEADDRESS.LATITUDEY], 'EPSG:4326', 'EPSG:3857'));
      this.obtenerUbicacionRegion()
      this.view.setZoom(15)
    }
  }

  async presentToast(message) {
    const toast = await this.toastController.create({
      message: message,
      duration: 4000
    });
    toast.present();
  }

  moverStepperr(direction){
    if(direction == 'next'){
      this.stepper.next();
    }else{
      this.stepper.previous()
    }
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
      quality:55,
      allowEditing:false,
      resultType:CameraResultType.Uri,
      source:tipe
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
        }).then(()=>{
          this.loader.dismiss()
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
  enviar(step){
    this._us.cargar_storage().then(()=>{
      let data = {
        titulo:this.thirdFormGroup.value.titulo,
        descripcion:this.thirdFormGroup.value.descripcion,
        destino:'',
        usuario:this._us.user.user,
        lat:this.dataPosicion.lat,
        lng:this.dataPosicion.lng,
        nivelalerta:this.secondFormGroup.value.nivelAlerta,
        operatividad:this.secondFormGroup.value.operatividad,
        region:this.dataPosicion.region,
        location:null,
        date:new Date(),
        // picture:this.picture
      }
      if (this._us.menuType == "DOP") {
        data.destino = "DOP";
      } else if (this._us.menuType == "DGA") {
          data.destino = "DGA";
      } else if (this._us.menuType == "DAP") {
          data.destino = "DAP";
      } else if (this._us.menuType == "APR" || this._us.menuType == "DOH-ALL" || this._us.menuType == "DOH-CAUC" || this._us.menuType == "DOH-RIEG") {
          data.destino = "APR";
      }else{
        data.destino = this._us.menuType;
      }
      if(this.firstFormGroup.value){
        if(this.firstFormGroup.value.activoSeleccionado){
          data.location = (this.firstFormGroup.value.activoSeleccionado.activo.ASSETINUM)
        }else{
          data.location = null;
        }
      }else{
        data.location = null;
      } 
      this._us.enviarAlerta(data).subscribe(res=>{
        // this.stepper.reset()
        console.log('**************** RESPUESTA AL ENVIAR FORMULARIO **************', res)
      },err=>{
        console.log('******************** ERROR ENVIAR ******************** ',err)
      })
      // this.stepper.reset()



    //   dataToSend = {
    //     destino: rep.destino,
    //     fechahora: newDate,
    //     lat: rep.lat,
    //     lng: rep.lng,
    //     msg: rep.msg,
    //     nivelalerta: rep.nivalerta,
    //     operatividad: rep.nivoperatividad,
    //     region: rep.region,
    //     seleccionado: {
    //         $$hashKey: rep.key,
    //         cod: rep.cod,
    //         distance: rep.distancia,
    //         id: rep.activoid,
    //         lat: rep.lat,
    //         lng: rep.lng,
    //         lugar: rep.lugar,
    //         name: rep.name
    //     },
    //     titulo: rep.titulo,
    //     usuario: rep.usuario
    // }

    // let token = $localstorage.getObject('tokenESRI');
    // dataToSend.esriTOKEN = token;
    // send(dataToSend, rep.id);

      // this.db.open().then(()=>{
      //   this.db.transaction(rx=>{
      //     rx.executeSql('INSERT INTO alerta ( titulo, descripcion, destino, usuario, lat, lng, nivelalerta, operatividad, 
      //       region, key, cod, distancia, lugar ,name , activoid) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
      //       [data.titulo, data.descripcion, data.destino, data.usuario, data.lat, data.lng, data.nivelalerta, data.operatividad, 
      //         data.region, data.seleccionado.$$hashKey, data.seleccionado.cod, data.seleccionado.distance, data.seleccionado.lugar, 
      //         data.seleccionado.name, data.seleccionado.id], (trans, result) => {
      //   })
      // })
    })
  }
}