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
export class VialidadService {

  constructor(public _us:UsuarioService, public platform:Platform,public network:Network,public toastController: ToastController,private sqlite: SQLite) { }

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


  activosVialidad(){
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
                          <!--Zero or more repetitions:-->
                          <max:REGION >`+this._us.usuario.PERSON.STATEPROVINCE+`</max:REGION>
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

  enviarAlerta(data){
    this._us.headers['Authorization'] = "Basic " + btoa((this._us.getUser().user + ':' + this._us.getUser().password));
//     let sr = `<soapenv:Envelope [env]:soapenv="http://schemas.xmlsoap.org/soap/envelope/" [env]:max="http://www.ibm.com/maximo">
//     <soapenv:Header/>
//     <soapenv:Body>
//        <max:SyncMOP_SR_EMER_DOH >
//           <max:MOP_SR_EMER_DOHSet>
//              <!--Zero or more repetitions:-->
//              <max:SR action="Add">
//              <max:ASSETSITEID>VIALIDAD</max:ASSETSITEID>
//                 <max:STATUS maxvalue="?">NUEVO</max:STATUS>
//                 <max:LOCATION maxvalue="?"></max:LOCATION>
//                 <max:ASSETNUM maxvalue="?">`+data.codigo+`</max:ASSETNUM>
//                 <max:CLASS maxvalue="?">SR</max:CLASS>
//                 <max:DESCRIPTION changed="?">`+data.titulo+`</max:DESCRIPTION>
//                 <max:DESCRIPTION_LONGDESCRIPTION changed="?">`+data.descripcion+`</max:DESCRIPTION_LONGDESCRIPTION>
//                 <max:FECHARE changed="?">`+data.date+`</max:FECHARE>
//                 <max:CATEGORIAMOP changed="?">`+data.nivelalerta+`</max:CATEGORIAMOP>
//                 <max:REPORTDATE>`+data.fechaEmergencia+`</max:REPORTDATE>
//                 <max:LOCATION changed="?"></max:LOCATION>
//                 <max:TRANSITO changed="?">`+data.transito+`</max:TRANSITO>
//                 <max:ELEMENTO changed="?">`+data.elemento+`</max:ELEMENTO>
//                 <max:COMPETENCIA changed="?">`+data.competencia+`</max:COMPETENCIA>
//                 <max:EVENTO changed="?"></max:EVENTO>
//                 <max:APUNTALAR changed="?">False</max:APUNTALAR>
//                 <max:ALZAPRIMAR changed="?">False</max:ALZAPRIMAR>
//                 <max:REMOVER changed="?">0</max:REMOVER>
//                 <max:ACORDONAR changed="?">False</max:ACORDONAR>
//                 <max:PROTECCION changed="?">0</max:PROTECCION>
//                 <max:REMCENIZA changed="?">False</max:REMCENIZA>
//                 <max:REMBARRO changed="?">False</max:REMBARRO>
//                 <max:DESTTUBE changed="?">False</max:DESTTUBE>
//                 <max:LIMPCUB changed="?">0</max:LIMPCUB>
//                 <max:CORTESUM changed="?">False</max:CORTESUM>
//                 <max:OTRO changed="?">0</max:OTRO>
//                 <max:COORX changed="?">1</max:COORX>
//                 <max:COORY changed="?">2</max:COORY>
//                 <max:PROBLEMCODE_LONGDESCRIPTION changed="?"></max:PROBLEMCODE_LONGDESCRIPTION >
//                 <max:MULTIASSETLOCCI action="Replace" relationship="string" deleteForInsert="string">
//                     <max:ASSETNUM changed="?">`+data.codigo+`</max:ASSETNUM>
//                     <max:STARTMEASURE changed="?">`+data.km_i+`</max:STARTMEASURE>
//                     <max:ENDMEASURE changed="?">`+data.km_f+`</max:ENDMEASURE>
//                     <max:PUNTOREFINI changed="?">Inicio</max:PUNTOREFINI>
//                     <max:PUNTOREFFIN changed="?">Fin</max:PUNTOREFFIN>
//                     <max:ISPRIMARY changed="?">1</max:ISPRIMARY>
//                     <max:LANGCODE changed="?">ES</max:LANGCODE>
//                     <max:STARTYOFSETREF changed="?">MIDLINE</max:STARTYOFSETREF>
//                     <max:ENDYOFSETREF changed="?">MIDLINE</max:ENDYOFSETREF>
//                     <max:STARTZOFSETREF changed="?">SURFACE</max:STARTZOFSETREF>
//                     <max:ENDZOFSETREF changed="?">SURFACE</max:ENDZOFSETREF>
//                       <max:ORGID changed="?">MOP</max:ORGID>
//                     <max:SITEID changed="?">VIALIDAD</max:SITEID>
//                 </max:MULTIASSETLOCCI>               
//                 <max:TKSERVICEADDRESS action="AddChange">
//                     <max:LATITUDEY changed="?">`+data.lat+`</max:LATITUDEY>
//                    <max:LONGITUDEX changed="?">`+data.lng+`</max:LONGITUDEX>
//                     <max:REGIONDISTRICT changed="?">`+this._us.usuario.PERSON.STATEPROVINCE+`</max:REGIONDISTRICT>
//                 </max:TKSERVICEADDRESS>
//                 <max:DOCLINKS action="AddChange" relationship="?" deleteForInsert="?">
//                    <max:ADDINFO changed="?">1</max:ADDINFO>
//                    <max:COPYLINKTOWO changed="?">0</max:COPYLINKTOWO>
//                    <max:DESCRIPTION changed="Ejemplo de archivo">?</max:DESCRIPTION>
//                    <max:DOCTYPE changed="?">Attachments</max:DOCTYPE>
//                    <max:DOCUMENT changed="?">`+data.titulo+`</max:DOCUMENT>
//                    <!--Optional:-->
//                    <max:DOCUMENTDATA changed="?">`+data.picture+`</max:DOCUMENTDATA>
//                    <!--Optional:-->
//                    <max:OWNERTABLE changed="?">SR</max:OWNERTABLE>
//                    <!--Optional:-->
//                    <max:UPLOAD changed="?">1</max:UPLOAD>
//                    <!--Optional:-->
//                    <max:URLNAME changed="?">IMAGEN</max:URLNAME>
//                    <!--Optional:-->
//                    <max:URLTYPE changed="?">FILE</max:URLTYPE>
//                 </max:DOCLINKS>
//                <!--Zero or more repetitions:-->
//             </max:SR>
//           </max:MOP_SR_EMER_DOHSet>
//        </max:SyncMOP_SR_EMER_DOH>
//     </soapenv:Body>
//  </soapenv:Envelope>
//  `
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
            <max:ASSETNUM maxvalue="?">64E685</max:ASSETNUM>
            <max:CLASS maxvalue="?">SR</max:CLASS>
            <max:DESCRIPTION changed="?">`+data.titulo+`</max:DESCRIPTION>
            <max:DESCRIPTION_LONGDESCRIPTION changed="?">`+data.descripcion+`</max:DESCRIPTION_LONGDESCRIPTION>
            <max:FECHARE changed="?">`+data.date+`</max:FECHARE>
            <max:CATEGORIAMOP changed="?">`+data.nivelalerta+`</max:CATEGORIAMOP>
            <max:REPORTDATE>`+data.fechaEmergencia+`</max:REPORTDATE>
            <max:LOCATION changed="?"></max:LOCATION>
            <max:TRANSITO changed="?">`+data.transito+`</max:TRANSITO>
            <max:ELEMENTO changed="?"></max:ELEMENTO>
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
              <max:ASSETNUM changed="?">64E685</max:ASSETNUM>
              <max:STARTMEASURE changed="?">1</max:STARTMEASURE>
              <max:ENDMEASURE changed="?">2</max:ENDMEASURE>
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
                <max:CITY changed="?">La Serena</max:CITY>
                <max:COUNTRY changed="?">CL</max:COUNTRY>
                <max:COUNTY changed="?">040101</max:COUNTY>
                <max:LATITUDEY changed="?">-33.0823367285638</max:LATITUDEY>
               <max:LONGITUDEX changed="?">-70.86181640625</max:LONGITUDEX>
                <max:REFERENCEPOINT changed="?">en la esquina</max:REFERENCEPOINT>
                <max:REGIONDISTRICT changed="?">04</max:REGIONDISTRICT>
                <max:STATEPROVINCE changed="?">0401</max:STATEPROVINCE>
                <max:STREETADDRESS changed="?">123ed</max:STREETADDRESS>
                <max:ADDRESSLINE2 changed="?">1</max:ADDRESSLINE2>
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
               <max:URLNAME changed="?">Prueba</max:URLNAME>
               <!--Optional:-->
               <max:URLTYPE changed="?">FILE</max:URLTYPE>
            </max:DOCLINKS>
           <!--Zero or more repetitions:-->
        </max:SR>
      </max:MOP_SR_EMER_DOHSet>
   </max:SyncMOP_SR_EMER_DOH>
</soapenv:Body>
</soapenv:Envelope>`


 console.log(sr)
    let url = URL_SERVICIOS+'MOP_WS_MOP_SR_EMER_DOH';
    const options: HttpOptions = {
      url:url,
      data:sr,
      headers:this._us.headers
    };
    return from(Http.post(options))
  }

}
