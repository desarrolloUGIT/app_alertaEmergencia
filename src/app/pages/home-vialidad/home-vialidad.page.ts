import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { loadModules } from 'esri-loader';
import { UsuarioService } from '../../services/usuario.service';
import { HttpClient } from '@angular/common/http';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { AlertController, LoadingController, MenuController, Platform, ModalController, ToastController } from '@ionic/angular';
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
  basemap = "topo-vector"
  operatividadArray = [];
  nivelAlertaArray = [];
  caminosEncontrados = []
  coordenadasRegion = [
    {
      region:'01',
      lat:-18.4746,
      lng:-70.29792
    },
    {
      region:'02',
      lat:-23.65236,
      lng:-70.3954
    },
    {
      region:'03',
      lat:-27.36679,
      lng:-70.3314
    },
    {
      region:'04',
      lat:-29.90453,
      lng:-71.24894
    },
    {
      region:'05',
      lat:-33.036,
      lng:-71.62963
    },
    {
      region:'06',
      lat:-34.17083,
      lng:-70.74444
    },
    {
      region:'07',
      lat:-35.4264,
      lng:-71.65542
    },
    {
      region:'08',
      lat:-36.82699,
      lng:-73.04977
    },
    {
      region:'09',
      lat:-38.73965,
      lng:-72.59842
    },
    {
      region:'10',
      lat:-41.4693,
      lng:-72.94237
    },
    {
      region:'11',
      lat:-45.57524,
      lng:-72.06619
    },
    {
      region:'12',
      lat:-53.15483,
      lng:-70.91129
    },
    {
      region:'13',
      lat:-33.44286267068381,
      lng:-70.65266161399654
    },
    {
      region:'14',
      lat:-39.81422,
      lng:-73.24589
    },
    {
      region:'15',
      lat:-18.4746,
      lng:-70.29792
    },
    {
      region:'16',
      lat:-36.60664,
      lng:-72.10344
    },
    {
      region:'20',
      lat:-33.44286267068381,
      lng:-70.65266161399654
    },
  ]
  region = '13'
  constructor(private _formBuilder: FormBuilder,public _us:UsuarioService, public platform:Platform,public _http:HttpClient,public _modalCtrl:ModalController,
    private geolocation: Geolocation,public loadctrl:LoadingController,public _mc:MenuController,private sqlite: SQLite,
    public toastController:ToastController,public actionSheetController: ActionSheetController,private animationCtrl: AnimationController,public alertctrl:AlertController) { }

  ngOnInit() {
    if(this.platform.is('capacitor')){
      this.sqlite.create({name:'mydbAlertaTemprana',location:'default',createFromLocation:1}).then((db:SQLiteObject)=>{
        db.executeSql('CREATE TABLE IF NOT EXISTS activos (id unique, name, cod, lugar,lat,lng)')
        db.executeSql('CREATE TABLE IF NOT EXISTS operatividad (id unique, name)')
        db.executeSql('CREATE TABLE IF NOT EXISTS nivelAlerta (id unique, name)')
        db.executeSql('CREATE TABLE IF NOT EXISTS alerta (id, titulo, descripcion, destino, usuario, lat, lng, nivelalerta, operatividad, region, name, date,location)');
        this.db = db;
        this.operatividad();
        this.nivelAlerta();
      })
    }else{
      this.operatividad();
      this.nivelAlerta();
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
      this.region = this._us.usuario.PERSON.STATEPROVINCE
      this.region = this.region == '20' ? '13' : this.region;
      this._us.nextmessage('usuario_logeado') 
    })
    this.loadMapVialidad()
  }

  async loadMapVialidad(){
    const [Map, MapView, FeatureLayer, Locate, Track, Graphic, watchUtils, IdentifyTask, IdentifyParameters, MapImageLayer,Basemap]:any = await loadModules([
      'esri/Map',
      'esri/views/MapView',
      'esri/layers/FeatureLayer',
      'esri/widgets/Locate',
      'esri/widgets/Track',
      'esri/Graphic',
      'esri/core/watchUtils',
      'esri/tasks/IdentifyTask',
      'esri/tasks/support/IdentifyParameters',
      'esri/layers/MapImageLayer',
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
        basemap: 'topo-vector'
        // basemap:basemap
      });
      // const vialidadRedVialURL = 'https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Red_Vial_Chile/MapServer';
      const vialidadRedVialURL = 'https://rest-sit.mop.gob.cl/arcgis/rest/services/INTEROP/SERVICIO_VIALES/MapServer';
      // const vialidadRedVialURL = 'https://rest-sit.mop.gob.cl/arcgis/rest/services/Pruebas/Red_Vial_Chile_Cache/MapServer';
      let flVialidad = new MapImageLayer({
        url: vialidadRedVialURL
      })
      this.map2.add(flVialidad);
      this.view2 = new MapView({
        container: "container", 
        center: [-70.65266161399654,-33.44286267068381],
        zoom: 13,
        map: this.map2,
        minScale: 60000,
        maxScale: 0, 
        constraints : {
          minZoom :5,
          maxZoom:18
        },
      });
      let pointInicial = {longitude:-70.65266161399654,latitude:-33.44286267068381};
      this.coordenadasRegion.forEach(c=>{
        if(c.region == this.region){
          this.view2.center = [c.lng,c.lat]
          pointInicial = {longitude:c.lng,latitude:c.lat};
          this.dataPosicion.lng = Number(c.lng.toFixed(6))
          this.dataPosicion.lat = Number(c.lat.toFixed(6))
          this.dataPosicion.region = this.region;
        }
      })
      this.agregarPuntero(pointInicial,Graphic)
      this.view2.on("click", (e:any)=>{
        let point = this.view2.toMap(e);
        this.view2.center = [point.longitude, point.latitude]
        // this.view2.zoom = 18
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

  async buscarCamino(e,vialidadRedVialURL){
    const [ IdentifyTask, IdentifyParameters]:any = await loadModules(['esri/tasks/IdentifyTask','esri/tasks/support/IdentifyParameters'])
      let identifyTask = new IdentifyTask(vialidadRedVialURL);
      let params = new IdentifyParameters();
      params.tolerance = 40;
      // params.layerIds = [0];
      params.layerOption = "all";
      params.width = this.view2.width;
      params.height = this.view2.height;
      params.geometry = e.mapPoint;
      params.mapExtent = this.view2.extent;
      identifyTask.execute(params).then((response) => {
        this.caminosEncontrados = []
        this.firstFormGroup.controls['activoSeleccionado'].reset()
        if(response.results.length > 0){
          console.log(response.results)
          response.results.forEach(r=>{
            let region = r.feature.attributes.REGION || r.feature.attributes['REGIÓN'];
            region = this.reverseRegion(region)            
            if(region != this.region){
              this.presentToast('No puedes seleccionar caminos/rutas/activos que no pertenezcan a tu región',3000)
            }else{
              this.caminosEncontrados.push({
                codigo:r.feature.attributes.CODIGO ? r.feature.attributes.CODIGO : 'codigo temporal',
                nombre_camino:r.feature.attributes.NOMBRE_CAMINO ? r.feature.attributes.NOMBRE_CAMINO : r.feature.attributes['NOMBRE DEL CAMINO'],
                km_i:r.feature.attributes.KM_I ? r.feature.attributes.KM_I : r.feature.attributes['KM INICIAL'],
                km_f:r.feature.attributes.KM_F ? r.feature.attributes.KM_F : r.feature.attributes['KM FINAL'],
                objectid:r.feature.attributes.OBJECTID,
                rol:r.feature.attributes.ROL,
                clasificacion:r.feature.attributes.CLASIFICACION ? r.feature.attributes.CLASIFICACION : r.feature.attributes['CLASIFICACIÓN'],
                tramo:r.feature.attributes['LONGITUD DEL TRAMO'] ? r.feature.attributes['LONGITUD DEL TRAMO'] : (r.feature.attributes.KM_F ? r.feature.attributes.KM_F : r.feature.attributes['KM FINAL']) - (r.feature.attributes.KM_I ? r.feature.attributes.KM_I : r.feature.attributes['KM INICIAL']) ,
                latitude:e.mapPoint.latitude,
                longitude:e.mapPoint.longitude
              })
            }
          })
          this.caminosEncontrados = this.eliminarObjetosDuplicados(this.caminosEncontrados,'codigo')
          if(this.caminosEncontrados.length == 1){
            this.firstFormGroup.controls['activoSeleccionado'].setValue(this.caminosEncontrados[0])
          }
        }else{
          this.caminosEncontrados = []
        }
      }).catch(err=>{this.caminosEncontrados = []})
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

  agregarPuntero(point,Graphic){
    this.view2.goTo({
      center:[point.longitude,point.latitude]
    })
    let point2 = {
      type: "point",
      longitude: point.longitude,
      latitude: point.latitude
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

  async presentToast(message,duration?) {
    const toast = await this.toastController.create({
      message: message,
      cssClass: 'toast-custom-class',
      keyboardClose:true,
      duration: duration ? duration : 4000,
      buttons: [
        {
          icon: 'close',
          role: 'cancel',
        }
      ]
    });
    toast.present();
  }

  async openModalCaminos() {
    const modal = await this._modalCtrl.create({
      component: ModalCaminosPage,
      showBackdrop:true,
      mode:'ios',
      swipeToClose:true,
      cssClass: 'my-custom-class',
      backdropDismiss:true,
      breakpoints:[0, 0.5, 0.75, 0.95],
      initialBreakpoint:0.75,
      componentProps:{
        caminos:this.caminosEncontrados,
      }
    });
    modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.firstFormGroup.controls['activoSeleccionado'].setValue(data)
    }
  }

  moverStepperr(direction){
    if(direction == 'next'){
      this.stepper.next();
    }else{
      this.stepper.previous()
    }
  }
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
            this.operatividadArray = arr;
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
      console.log('OPERATIVIDAD -> ',res)
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
      console.log('ALERTA -> ',res) 
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
      quality:45,
      allowEditing:true,
      resultType:CameraResultType.Uri,
      source:tipe,
      
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

  volverInicio(){
    this.firstFormGroup.reset();
    this.secondFormGroup.reset();
    this.thirdFormGroup.reset();
    this.stepper.reset();
    // this.view.setCenter(this.stgo)
    // this.view.setZoom(13)
    // this.obtenerUbicacionRegion()
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
}
