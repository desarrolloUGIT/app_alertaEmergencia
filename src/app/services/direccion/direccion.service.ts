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

@Injectable({
  providedIn: 'root'
})
export class DireccionService {
  headers = {
    'Authorization': '',
    'Accept': "text/plain",
    'Content-Type': "text/plain",
  };
  constructor(public _us:UsuarioService, public platform:Platform,public network:Network,public toastController: ToastController,private sqlite: SQLite) { }

  activos_(){ 
    this.headers['Authorization'] = "Basic " + btoa((this._us.getUser().user + ':' + this._us.getUser().password));
    // menu == 'APR' ? url = this.URL_SERVICIOS + "MOP_WS_MOP_ASSET_DOH" : url = this.URL_SERVICIOS + "MOP_WS_MOP_OPERLOCQRY_DOH";
    // menu == 'APR' ? sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'>  <soapenv:Header/>   <soapenv:Body>      <max:QueryMOP_ASSET_DOH >         <max:MOP_ASSET_DOHQuery operandMode='AND'>            <!--Optional:-->            <max:ASSET>               <!--Zero or more repetitions:-->               <max:ASSETNUM >%</max:ASSETNUM>               <!--Zero or more repetitions:-->               <max:DESCRIPTION >%</max:DESCRIPTION>               <!--Zero or more repetitions:-->               <max:ISLINEAR >0</max:ISLINEAR>               <!--Zero or more repetitions:-->               <max:REGION >%</max:REGION>               <!--Zero or more repetitions:-->               <max:SITEID operator='=' >APR</max:SITEID>               <!--Zero or more repetitions:-->               <max:STATUS operator='=' >ACTIVA</max:STATUS>               <max:SERVICEADDRESS >                  <!--Zero or more repetitions:-->                  <max:COUNTY >%</max:COUNTY>                  <!--Zero or more repetitions:-->                  <max:REGIONDISTRICT >%</max:REGIONDISTRICT>               </max:SERVICEADDRESS>            </max:ASSET>         </max:MOP_ASSET_DOHQuery>      </max:QueryMOP_ASSET_DOH>   </soapenv:Body></soapenv:Envelope>" :
    // menu == 'DGA' ?  
    // sr = "<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'><soapenv:Header/><soapenv:Body><max:QueryMOP_OPERLOC_DOH><max:MOP_OPERLOC_DOHQuery operandMode='AND'><max:LOCATIONS><max:STATUS operator='=' >ACTIVA</max:STATUS><max:SITEID operator='=' >" + menu + "</max:SITEID><max:LOCATION>14%</max:LOCATION></max:LOCATIONS></max:MOP_OPERLOC_DOHQuery></max:QueryMOP_OPERLOC_DOH></soapenv:Body></soapenv:Envelope>" : 
    // sr = "<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'><soapenv:Header/><soapenv:Body><max:QueryMOP_OPERLOC_DOH creationDateTime='2008-09-28T21:49:45'  rsStart='0'><max:MOP_OPERLOC_DOHQuery orderby='LOCATION' operandMode='AND'><max:LOCATIONS><max:ESOBRA operator='=' >1</max:ESOBRA><max:STATUS operator='=' >ACTIVA</max:STATUS><max:SITEID operator='=' >" + menu + "</max:SITEID><max:LOCATION>%</max:LOCATION></max:LOCATIONS></max:MOP_OPERLOC_DOHQuery></max:QueryMOP_OPERLOC_DOH></soapenv:Body></soapenv:Envelope>"
    // console.log('SRRRRR ->>>>> ',sr)

// ACTIVOS APR
  let sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'>"+
    "<soapenv:Header/><soapenv:Body><max:QueryMOP_ASSET_DOH ><max:MOP_ASSET_DOHQuery operandMode='AND'><max:ASSET><max:ASSETNUM >%</max:ASSETNUM><max:DESCRIPTION >%</max:DESCRIPTION>"+
    "<max:ISLINEAR >0</max:ISLINEAR><max:REGION >%</max:REGION><max:SITEID operator='=' >"+this._us.usuario.DEFSITE+"</max:SITEID><max:STATUS operator='=' >ACTIVA</max:STATUS><max:SERVICEADDRESS ><max:COUNTY >%</max:COUNTY>"+
    "<max:REGIONDISTRICT >"+this._us.usuario.PERSON.STATEPROVINCE+"</max:REGIONDISTRICT></max:SERVICEADDRESS></max:ASSET></max:MOP_ASSET_DOHQuery></max:QueryMOP_ASSET_DOH></soapenv:Body></soapenv:Envelope>"
// FIN ACTIVOS APR
    let url = URL_SERVICIOS+'MOP_WS_MOP_ASSET_DOH';
    const options: HttpOptions = {
      url:url,
      data:sr,
      headers:this.headers
    };
    return from(Http.post(options))
  }

  activos(vuelta?){
    this.headers['Authorization'] = "Basic " + btoa((this._us.getUser().user + ':' + this._us.getUser().password));
    let sr = `<soapenv:Envelope [env]:soapenv="http://schemas.xmlsoap.org/soap/envelope/" [env]:max="http://www.ibm.com/maximo">
            <soapenv:Header/>
            <soapenv:Body>
              <max:QueryMOP_OPERLOC_DOH >
                  <max:MOP_OPERLOC_DOHQuery operandMode="AND">
                    <max:LOCATIONS>
                        <max:LOCATION >%</max:LOCATION>
                        <max:SITEID operator="=">`+this._us.usuario.DEFSITE+`</max:SITEID>
                        <max:TYPE operator="=">OPERATIVO</max:TYPE>
                        <max:ESOBRA operator="=">1</max:ESOBRA>
                        <max:SERVICEADDRESS >
                            <max:REGIONDISTRICT >`+(vuelta ? vuelta : this._us.usuario.PERSON.STATEPROVINCE)+`</max:REGIONDISTRICT>
                            <max:STATEPROVINCE >%</max:STATEPROVINCE>
                            <max:COUNTY >%</max:COUNTY>
                        </max:SERVICEADDRESS>              
                    </max:LOCATIONS>
                  </max:MOP_OPERLOC_DOHQuery>
              </max:QueryMOP_OPERLOC_DOH>
            </soapenv:Body>
        </soapenv:Envelope>`
      let url = URL_SERVICIOS+'MOP_WS_MOP_OPERLOCQRY_DOH';
      const options: HttpOptions = {
        url:url,
        data:sr,
        headers:this.headers
      };
      return from(Http.post(options))
  }

  enviar(data){
    this.headers['Authorization'] = "Basic " + btoa((this._us.getUser().user + ':' + this._us.getUser().password));
    let sr = `<soapenv:Envelope [env]:soapenv="http://schemas.xmlsoap.org/soap/envelope/" [env]:max="http://www.ibm.com/maximo">
    <soapenv:Header/>
    <soapenv:Body>
       <max:SyncMOP_SR_EMER_DOH >
          <max:MOP_SR_EMER_DOHSet>
             <!--Zero or more repetitions:-->
             <max:SR action="Add">
             <max:ASSETSITEID>`+this._us.usuario.DEFSITE+`</max:ASSETSITEID>
                <max:STATUS maxvalue="?">NUEVO</max:STATUS>
                <max:SRTIPO maxvalue="?">E</max:SRTIPO>
                <max:LOCATION maxvalue="?">`+data.locations+`</max:LOCATION>
                <max:ASSETNUM maxvalue="?"></max:ASSETNUM>
                <max:CLASS maxvalue="?">SR</max:CLASS>
                <max:DESCRIPTION changed="?">`+data.titulo+`</max:DESCRIPTION>
                <max:DESCRIPTION_LONGDESCRIPTION changed="?">`+data.descripcion+`</max:DESCRIPTION_LONGDESCRIPTION>
                <max:FECHARE changed="?">`+data.date+`</max:FECHARE>
                <max:CATEGORIAMOP changed="?">`+data.nivelalerta+`</max:CATEGORIAMOP>
                <max:REPORTDATE>`+data.date+`</max:REPORTDATE>
                <max:ELEMENTO changed="?"></max:ELEMENTO>
                <max:TRANSITO changed="?"></max:TRANSITO>
                <max:COMPETENCIA changed="?">`+data.competencia+`</max:COMPETENCIA>
                <max:EVENTO changed="?"></max:EVENTO>
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
                <max:COORX changed="?"></max:COORX>
                <max:COORY changed="?"></max:COORY>
                <max:PROBLEMCODE_LONGDESCRIPTION changed="?"></max:PROBLEMCODE_LONGDESCRIPTION >
                <max:TKSERVICEADDRESS action="AddChange">
                    <max:CITY changed="?"></max:CITY>
                    <max:COUNTRY changed="?">CL</max:COUNTRY>
                    <max:COUNTY changed="?"></max:COUNTY>
                    <max:LATITUDEY changed="?">`+data.lat+`</max:LATITUDEY>
                   <max:LONGITUDEX changed="?">`+data.lng+`</max:LONGITUDEX>
                    <max:REFERENCEPOINT changed="?"></max:REFERENCEPOINT>
                    <max:REGIONDISTRICT changed="?">`+this._us.usuario.PERSON.STATEPROVINCE+`</max:REGIONDISTRICT>
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
                   <max:DOCUMENT changed="?">`+data.titulo+`</max:DOCUMENT>
                   <!--Optional:-->
                   <max:DOCUMENTDATA changed="?">`+data.picture+`</max:DOCUMENTDATA>
                   <!--Optional:-->
                   <max:OWNERTABLE changed="?">SR</max:OWNERTABLE>
                   <!--Optional:-->
                   <max:UPLOAD changed="?">1</max:UPLOAD>
                   <!--Optional:-->
                   <max:URLNAME changed="?">`+data.titulo+`</max:URLNAME>
                   <!--Optional:-->
                   <max:URLTYPE changed="?">FILE</max:URLTYPE>
                </max:DOCLINKS>
               <!--Zero or more repetitions:-->
            </max:SR>
          </max:MOP_SR_EMER_DOHSet>
       </max:SyncMOP_SR_EMER_DOH>
    </soapenv:Body>
 </soapenv:Envelope>`
    let url = URL_SERVICIOS+'MOP_WS_MOP_SR_EMER_DOH';
    const options: HttpOptions = {
      url:url,
      data:sr,
      headers:this.headers
    };
    return from(Http.post(options))
  }

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
  
}
