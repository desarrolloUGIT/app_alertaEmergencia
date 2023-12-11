import { Injectable } from '@angular/core';
import { Http, HttpOptions } from '@capacitor-community/http';
import { from } from 'rxjs';
import * as xml2js from 'xml2js';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { Platform, ToastController } from '@ionic/angular';
import { Network } from '@awesome-cordova-plugins/network/ngx';
import { BehaviorSubject } from 'rxjs';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { URL_SERVICIOS } from 'src/app/config/url';
import { UsuarioService } from '../usuario/usuario.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class VialidadService {

  cargandoActivos = false;
  activoRegion;
  constructor(public _us:UsuarioService, public platform:Platform,public network:Network,public toastController: ToastController,private sqlite: SQLite,public http:HttpClient) { }

  dominios(tipo){
    this._us.headers['Authorization'] = "Basic " + btoa((this._us.getUser().user + ':' + this._us.getUser().password));
    let sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'>"+
             "<soapenv:Header/><soapenv:Body><max:QueryMOP_DOMAIN_DOH ><max:MOP_DOMAIN_DOHQuery operandMode='AND'><max:MAXDOMAIN>"+
             "<max:DOMAINID >"+tipo+"</max:DOMAINID></max:MAXDOMAIN></max:MOP_DOMAIN_DOHQuery></max:QueryMOP_DOMAIN_DOH></soapenv:Body></soapenv:Envelope>";
    const options: HttpOptions = {
      url:URL_SERVICIOS+'MOP_WS_MOP_DOMAIN_DOH',
      data:sr,
      headers:this._us.headers
    };
    return from(Http.post(options))
  }

  activosVialidad(vuelta?){
    this._us.headers['Authorization'] = "Basic " + btoa((this._us.getUser().user + ':' + this._us.getUser().password));
    let sr = `<soapenv:Envelope [env]:soapenv="http://schemas.xmlsoap.org/soap/envelope/" [env]:max="http://www.ibm.com/maximo">
              <soapenv:Header/>
              <soapenv:Body>
                <max:QueryMOP_ASSET_DOH >
                    <max:MOP_ASSET_DOHQuery operandMode="AND">
                      <!--Optional:-->
                      <max:ASSET>
                          <!--Zero or more repetitions:-->
                          <max:ASSETNUM >%</max:ASSETNUM>
                          <!--Zero or more repetitions:-->
                          <max:DESCRIPTION >%</max:DESCRIPTION>
                          <!--Zero or more repetitions:-->
                          <max:ISLINEAR >1</max:ISLINEAR>
                          <max:ROL>%</max:ROL>
                          <!--Zero or more repetitions:-->
                          <max:REGION >`+(vuelta ? vuelta : this._us.usuario.PERSON.STATEPROVINCE)+`</max:REGION>
                          <!--Zero or more repetitions:-->
                          <max:SITEID operator="=" >`+this._us.usuario.DEFSITE+`</max:SITEID>
                          <!--Zero or more repetitions:-->
                          <max:STATUS operator="=" >ACTIVA</max:STATUS>
                      </max:ASSET>
                    </max:MOP_ASSET_DOHQuery>
                </max:QueryMOP_ASSET_DOH>
              </soapenv:Body>
          </soapenv:Envelope>
          `
    let url = URL_SERVICIOS+'MOP_WS_MOP_ASSET_DOH';
    const options: HttpOptions = {
      url:url,
      data:sr,
      headers:this._us.headers
    };
    return from(Http.post(options))
  }

  activoEspecificoVialidad(data){
    this._us.headers['Authorization'] = "Basic " + btoa((this._us.getUser().user + ':' + this._us.getUser().password));
    let sr = `<soapenv:Envelope [env]:soapenv="http://schemas.xmlsoap.org/soap/envelope/" [env]:max="http://www.ibm.com/maximo">
              <soapenv:Header/>
              <soapenv:Body>
                <max:QueryMOP_ASSET_DOH >
                    <max:MOP_ASSET_DOHQuery operandMode="AND">
                      <!--Optional:-->
                      <max:ASSET>
                          <!--Zero or more repetitions:-->
                          <max:ASSETNUM >`+data.codigo+`</max:ASSETNUM>
                          <!--Zero or more repetitions:-->
                          <max:DESCRIPTION >%</max:DESCRIPTION>
                          <!--Zero or more repetitions:-->
                          <max:ISLINEAR >1</max:ISLINEAR>
                          <max:ROL>%</max:ROL>
                          <!--Zero or more repetitions:-->
                          <max:REGION >`+data.region+`</max:REGION>
                          <!--Zero or more repetitions:-->
                          <max:SITEID operator="=" >`+this._us.usuario.DEFSITE+`</max:SITEID>
                          <!--Zero or more repetitions:-->
                          <max:STATUS operator="=" >ACTIVA</max:STATUS>
                      </max:ASSET>
                    </max:MOP_ASSET_DOHQuery>
                </max:QueryMOP_ASSET_DOH>
              </soapenv:Body>
          </soapenv:Envelope>
          `
          // console.log(sr)
    let url = URL_SERVICIOS+'MOP_WS_MOP_ASSET_DOH';
    const options: HttpOptions = {
      url:url,
      data:sr,
      headers:this._us.headers
    };
    return from(Http.post(options))
  }

  enviarAlerta(data){
    this._us.headers['Authorization'] = "Basic " + btoa((this._us.getUser().user + ':' + this._us.getUser().password));
    let sr = `<soapenv:Envelope [env]:soapenv="http://schemas.xmlsoap.org/soap/envelope/" [env]:max="http://www.ibm.com/maximo">
    <soapenv:Header/>
      <soapenv:Body>
        <max:SyncMOP_SR_EMER_DOH >
            <max:MOP_SR_EMER_DOHSet>
              <!--Zero or more repetitions:-->
              <max:SR action="Add">
              <max:ASSETSITEID>VIALIDAD</max:ASSETSITEID>
                  <max:STATUS maxvalue="?">NUEVO</max:STATUS>
                  <max:SRTIPO maxvalue="?">E</max:SRTIPO>
                  <max:LOCATION maxvalue="?"></max:LOCATION>
                  <max:ASSETNUM maxvalue="?">`+data.codigo+`</max:ASSETNUM>
                  <max:CLASS maxvalue="?">SR</max:CLASS>
                  <max:DESCRIPTION changed="?">`+data.titulo+`</max:DESCRIPTION>
                  <max:DESCRIPTION_LONGDESCRIPTION changed="?">`+data.descripcion+`</max:DESCRIPTION_LONGDESCRIPTION>
                  <max:FECHARE changed="?">`+data.date+`</max:FECHARE>
                  <max:CATEGORIAMOP changed="?">`+data.nivelalerta+`</max:CATEGORIAMOP>
                  <max:REPORTDATE>`+data.fechaEmergencia+`</max:REPORTDATE>
                  <max:LOCATION changed="?"></max:LOCATION>
                  <max:TRANSITO changed="?">`+data.transito+`</max:TRANSITO>
                  <max:RESTRICCION changed="?">`+(data.transito == 'Con Restricción' ?  data.restriccion : ``)+`</max:RESTRICCION>
                  <max:COMPETENCIA changed="?">`+data.competencia+`</max:COMPETENCIA>
                  <max:EVENTO changed="?"> </max:EVENTO>
                  <max:APUNTALAR changed="?">False</max:APUNTALAR>
                  <max:ALZAPRIMAR changed="?">False</max:ALZAPRIMAR>
                  <max:REMOVER changed="?">0</max:REMOVER>
                  <max:ACORDONAR changed="?">False</max:ACORDONAR>
                  <max:PROTECCION changed="?">0</max:PROTECCION>
                  <max:REMCENIZA changed="?">False</max:REMCENIZA>
                  <max:REMBARRO changed="?">False</max:REMBARRO>
                  <max:DESTTUBE changed="?">False</max:DESTTUBE>
                  <max:LIMPCUB changed="?">0</max:LIMPCUB>
                  <max:CORTESUM changed="?">False</max:CORTESUM>
                  <max:OTRO changed="?">0</max:OTRO>
                  <max:COORX changed="?">1</max:COORX>
                  <max:COORY changed="?">2</max:COORY>
                  <max:PROBLEMCODE_LONGDESCRIPTION changed="?">%</max:PROBLEMCODE_LONGDESCRIPTION >
                <max:MULTIASSETLOCCI action="Replace" relationship="string" deleteForInsert="string">
                    <max:ASSETNUM changed="?">`+data.codigo+`</max:ASSETNUM>
                    <max:STARTMEASURE changed="?">`+data.km_i+`</max:STARTMEASURE>
                    <max:ENDMEASURE changed="?">`+data.km_f+`</max:ENDMEASURE>
                    <!-- <max:STARTMEASURE changed="?">1</max:STARTMEASURE> -->
                    <!-- <max:ENDMEASURE changed="?">1.2</max:ENDMEASURE> -->
                    <max:PUNTOREFINI changed="?">Inicio</max:PUNTOREFINI>
                    <max:PUNTOREFFIN changed="?">Fin</max:PUNTOREFFIN>
                    <max:ISPRIMARY changed="?">1</max:ISPRIMARY>
                    <max:LANGCODE changed="?">ES</max:LANGCODE>
                    <max:STARTYOFSETREF changed="?">MIDLINE</max:STARTYOFSETREF>
                    <max:ENDYOFSETREF changed="?">MIDLINE</max:ENDYOFSETREF>
                    <max:STARTZOFSETREF changed="?">SURFACE</max:STARTZOFSETREF>
                    <max:ENDZOFSETREF changed="?">SURFACE</max:ENDZOFSETREF>
                      <max:ORGID changed="?">MOP</max:ORGID>
                    <max:SITEID changed="?">VIALIDAD</max:SITEID>
                </max:MULTIASSETLOCCI>               
                      <max:TKSERVICEADDRESS action="AddChange">
                      <max:CITY changed="?"></max:CITY>
                      <max:COUNTRY changed="?">CL</max:COUNTRY>
                      <max:COUNTY changed="?"></max:COUNTY>
                      <max:LATITUDEY changed="?">`+data.lat+`</max:LATITUDEY>
                    <max:LONGITUDEX changed="?">`+data.lng+`</max:LONGITUDEX>
                      <max:REFERENCEPOINT changed="?"></max:REFERENCEPOINT>
                      <max:REGIONDISTRICT changed="?">`+data.region+`</max:REGIONDISTRICT>
                      <max:STATEPROVINCE changed="?"></max:STATEPROVINCE>
                      <max:STREETADDRESS changed="?"></max:STREETADDRESS>
                      <max:ADDRESSLINE2 changed="?"></max:ADDRESSLINE2>
                      <max:ADDRESSLINE3 changed="?"></max:ADDRESSLINE3>
                  </max:TKSERVICEADDRESS>
                  <!--Zero or more repetitions:-->
                  <max:DOCLINKS action="AddChange" relationship="?" deleteForInsert="?">
                    <!--Optional:-->
                    <max:ADDINFO changed="?">1</max:ADDINFO>
                    <!--Optional:-->
                    <max:COPYLINKTOWO changed="?">0</max:COPYLINKTOWO>
                    <!--Optional:-->
                    <max:DESCRIPTION changed="Ejemplo de archivo">?</max:DESCRIPTION>
                    <!--Optional:-->
                    <max:DOCTYPE changed="?">Attachments</max:DOCTYPE>
                    <!--Optional:-->
                    <max:DOCUMENT changed="?">FOTO</max:DOCUMENT>
                    <!--Optional:-->
                    <max:DOCUMENTDATA changed="?">`+data.picture+`</max:DOCUMENTDATA>
                    <!--Optional:-->
                    <max:OWNERTABLE changed="?">SR</max:OWNERTABLE>
                    <!--Optional:-->
                    <max:UPLOAD changed="?">1</max:UPLOAD>
                    <!--Optional:-->
                    <max:URLNAME changed="?">FOTO</max:URLNAME>
                    <!--Optional:-->
                    <max:URLTYPE changed="?">FILE</max:URLTYPE>
                  </max:DOCLINKS>
                <!--Zero or more repetitions:-->
              </max:SR>
            </max:MOP_SR_EMER_DOHSet>
        </max:SyncMOP_SR_EMER_DOH>
      </soapenv:Body>
    </soapenv:Envelope>`


//  console.log(sr)
    let url = URL_SERVICIOS+'MOP_WS_MOP_SR_EMER_DOH';
    const options: HttpOptions = {
      url:url,
      data:sr,
      headers:this._us.headers
    };
    return from(Http.post(options))
  }


  recuperarXML(data){
    return  `<soapenv:Envelope [env]:soapenv="http://schemas.xmlsoap.org/soap/envelope/" [env]:max="http://www.ibm.com/maximo">
    <soapenv:Header/>
      <soapenv:Body>
        <max:SyncMOP_SR_EMER_DOH >
            <max:MOP_SR_EMER_DOHSet>
              <!--Zero or more repetitions:-->
              <max:SR action="Add">
              <max:ASSETSITEID>VIALIDAD</max:ASSETSITEID>
                  <max:STATUS maxvalue="?">NUEVO</max:STATUS>
                  <max:SRTIPO maxvalue="?">E</max:SRTIPO>
                  <max:LOCATION maxvalue="?"></max:LOCATION>
                  <max:ASSETNUM maxvalue="?">`+data.codigo+`</max:ASSETNUM>
                  <max:CLASS maxvalue="?">SR</max:CLASS>
                  <max:DESCRIPTION changed="?">`+data.titulo+`</max:DESCRIPTION>
                  <max:DESCRIPTION_LONGDESCRIPTION changed="?">`+data.descripcion+`</max:DESCRIPTION_LONGDESCRIPTION>
                  <max:FECHARE changed="?">`+data.date+`</max:FECHARE>
                  <max:CATEGORIAMOP changed="?">`+data.nivelalerta+`</max:CATEGORIAMOP>
                  <max:REPORTDATE>`+data.fechaEmergencia+`</max:REPORTDATE>
                  <max:LOCATION changed="?"></max:LOCATION>
                  <max:TRANSITO changed="?">`+data.transito+`</max:TRANSITO>
                  <max:RESTRICCION changed="?">`+(data.transito == 'Con Restricción' ?  data.restriccion : ``)+`</max:RESTRICCION>
                  <max:COMPETENCIA changed="?">`+data.competencia+`</max:COMPETENCIA>
                  <max:EVENTO changed="?"> </max:EVENTO>
                  <max:APUNTALAR changed="?">False</max:APUNTALAR>
                  <max:ALZAPRIMAR changed="?">False</max:ALZAPRIMAR>
                  <max:REMOVER changed="?">0</max:REMOVER>
                  <max:ACORDONAR changed="?">False</max:ACORDONAR>
                  <max:PROTECCION changed="?">0</max:PROTECCION>
                  <max:REMCENIZA changed="?">False</max:REMCENIZA>
                  <max:REMBARRO changed="?">False</max:REMBARRO>
                  <max:DESTTUBE changed="?">False</max:DESTTUBE>
                  <max:LIMPCUB changed="?">0</max:LIMPCUB>
                  <max:CORTESUM changed="?">False</max:CORTESUM>
                  <max:OTRO changed="?">0</max:OTRO>
                  <max:COORX changed="?">1</max:COORX>
                  <max:COORY changed="?">2</max:COORY>
                  <max:PROBLEMCODE_LONGDESCRIPTION changed="?">%</max:PROBLEMCODE_LONGDESCRIPTION >
                <max:MULTIASSETLOCCI action="Replace" relationship="string" deleteForInsert="string">
                    <max:ASSETNUM changed="?">`+data.codigo+`</max:ASSETNUM>
                    <max:STARTMEASURE changed="?">`+data.km_i+`</max:STARTMEASURE>
                    <max:ENDMEASURE changed="?">`+data.km_f+`</max:ENDMEASURE>
                    <!-- <max:STARTMEASURE changed="?">1</max:STARTMEASURE> -->
                    <!-- <max:ENDMEASURE changed="?">1.2</max:ENDMEASURE> -->
                    <max:PUNTOREFINI changed="?">Inicio</max:PUNTOREFINI>
                    <max:PUNTOREFFIN changed="?">Fin</max:PUNTOREFFIN>
                    <max:ISPRIMARY changed="?">1</max:ISPRIMARY>
                    <max:LANGCODE changed="?">ES</max:LANGCODE>
                    <max:STARTYOFSETREF changed="?">MIDLINE</max:STARTYOFSETREF>
                    <max:ENDYOFSETREF changed="?">MIDLINE</max:ENDYOFSETREF>
                    <max:STARTZOFSETREF changed="?">SURFACE</max:STARTZOFSETREF>
                    <max:ENDZOFSETREF changed="?">SURFACE</max:ENDZOFSETREF>
                      <max:ORGID changed="?">MOP</max:ORGID>
                    <max:SITEID changed="?">VIALIDAD</max:SITEID>
                </max:MULTIASSETLOCCI>               
                      <max:TKSERVICEADDRESS action="AddChange">
                      <max:CITY changed="?"></max:CITY>
                      <max:COUNTRY changed="?">CL</max:COUNTRY>
                      <max:COUNTY changed="?"></max:COUNTY>
                      <max:LATITUDEY changed="?">`+data.lat+`</max:LATITUDEY>
                    <max:LONGITUDEX changed="?">`+data.lng+`</max:LONGITUDEX>
                      <max:REFERENCEPOINT changed="?"></max:REFERENCEPOINT>
                      <max:REGIONDISTRICT changed="?">`+data.region+`</max:REGIONDISTRICT>
                      <max:STATEPROVINCE changed="?"></max:STATEPROVINCE>
                      <max:STREETADDRESS changed="?"></max:STREETADDRESS>
                      <max:ADDRESSLINE2 changed="?"></max:ADDRESSLINE2>
                      <max:ADDRESSLINE3 changed="?"></max:ADDRESSLINE3>
                  </max:TKSERVICEADDRESS>
                  <!--Zero or more repetitions:-->
                  <max:DOCLINKS action="AddChange" relationship="?" deleteForInsert="?">
                    <!--Optional:-->
                    <max:ADDINFO changed="?">1</max:ADDINFO>
                    <!--Optional:-->
                    <max:COPYLINKTOWO changed="?">0</max:COPYLINKTOWO>
                    <!--Optional:-->
                    <max:DESCRIPTION changed="Ejemplo de archivo">?</max:DESCRIPTION>
                    <!--Optional:-->
                    <max:DOCTYPE changed="?">Attachments</max:DOCTYPE>
                    <!--Optional:-->
                    <max:DOCUMENT changed="?">FOTO</max:DOCUMENT>
                    <!--Optional:-->
                    <max:DOCUMENTDATA changed="?">`+data.picture+`</max:DOCUMENTDATA>
                    <!--Optional:-->
                    <max:OWNERTABLE changed="?">SR</max:OWNERTABLE>
                    <!--Optional:-->
                    <max:UPLOAD changed="?">1</max:UPLOAD>
                    <!--Optional:-->
                    <max:URLNAME changed="?">FOTO</max:URLNAME>
                    <!--Optional:-->
                    <max:URLTYPE changed="?">FILE</max:URLTYPE>
                  </max:DOCLINKS>
                <!--Zero or more repetitions:-->
              </max:SR>
            </max:MOP_SR_EMER_DOHSet>
        </max:SyncMOP_SR_EMER_DOH>
      </soapenv:Body>
    </soapenv:Envelope>`
  }

  obtenerCapas(geometryX,geometryY,extent){
    let promesa = new Promise((resolve,reject)=>{
      return this.http.get('https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Red_Vial_Chile/MapServer/identify?f=json&returnFieldName=true&returnGeometry=true&returnUnformattedValues=false&returnZ=true&returnM=true&tolerance=10&imageDisplay=310,200,96&geometry={"x":'+geometryX+',"y":'+geometryY+'}&geometryType=esriGeometryPoint&sr=5360&mapExtent='+(extent)+'&layers=3').subscribe(res=>{
        resolve(res)
      },err=>{
        reject(err)
      })
    })
    return promesa;
  }

}
