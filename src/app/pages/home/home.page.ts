import { AfterViewInit, Component, OnInit } from '@angular/core';
import {FormBuilder, Validators} from '@angular/forms';
import IdentifyParameters from "@arcgis/core/rest/support/IdentifyParameters";
import * as identify from "@arcgis/core/rest/identify";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { UsuarioService } from '../../services/usuario.service';
import { HttpClient } from '@angular/common/http';

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
  constructor(private _formBuilder: FormBuilder,public _us:UsuarioService, public _http:HttpClient) {}

  ngOnInit(){
    this.initailize()
    this._http.get('../../../assets/usuario.xml').subscribe((res:any)=>{
     console.log(JSON.stringify((res)))
    },err=>{
      console.log(this._us.xmlToJson(err.error.text))
    })
    // this._us.doGet().subscribe(res=>{
    //   console.log('Resultado->',res)
    // },err=>{
    //   console.log('error->',err)
    // })
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
    // console.log(identifyTask)
    identifyTask.execute(params).then((response)=>{
      console.log(response,mapPoint)
      // this.sendIndentifyData.emit([[0],[response]]);
    });
  }

  async initailize(){
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
        this.mapViewIdentify(e.mapPoint,identify,IdentifyParameters,vialidadRedVialURL);
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

}
