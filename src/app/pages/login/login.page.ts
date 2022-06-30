
import { Component, OnInit,AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomValidators } from 'ng2-validation';
import { NavController, AlertController, LoadingController, Platform, MenuController } from '@ionic/angular';
import { NativePageTransitions, NativeTransitionOptions } from '@awesome-cordova-plugins/native-page-transitions/ngx';
import { UsuarioService } from '../../services/usuario.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  passwordType = ''
  eye = ''
  form:FormGroup;
  loader;
  constructor(public formBuilder: FormBuilder,public router:Router, public _us:UsuarioService,public platform:Platform,public _http:HttpClient,
    public navctrl:NavController,private nativePageTransitions: NativePageTransitions,public _mc:MenuController,public loadctrl:LoadingController,public alertController:AlertController) { }

  ngOnInit() {
    this.passwordType = 'password'
    this.eye = 'eye'
    this.form = this.formBuilder.group({
      user :[null, Validators.compose([Validators.required])],
      password: [null,Validators.required],
    });
    this._us.cargar_storage().then(()=>{
      if(this._us.user){
        this.form.controls['user'].setValue(this._us.user.user)
        this.form.controls['password'].setValue(this._us.user.password)
      }
    }).catch(()=>{
      if(this._us.user){
        this.form.controls['user'].setValue(this._us.user.user)
        this.form.controls['password'].setValue(this._us.user.password)
      }
    })
  }

  showpassword(){
    if(this.passwordType == 'password'){
      this.passwordType = 'text'
      this.eye = 'eye-off'
    }else{
      this.passwordType = 'password'
      this.eye = 'eye'
    }
  }

  async presentLoader() {
    this.loader = await this.loadctrl.create({message: 'Cargando...',mode:'ios'});
    await this.loader.present();
  }

  async presentAlert(header,msg) {
    const alert = await this.alertController.create({
      header: header,
      message: msg,
      mode:'ios',
      buttons: ['OK']
    });
    await alert.present();
  }

  iniciar(){
    this.presentLoader().then(()=>{
      this.form.disable()
      if(this.platform.is('capacitor')){
        this._us.login(this.form.value).subscribe((res:any)=>{
          if(res && res.status == '200'){
            this._us.xmlToJson(res).then((result:any)=>{
              let path = result['SOAPENV:ENVELOPE']['SOAPENV:BODY'][0].QUERYMOP_USUARIO_DOHRESPONSE[0].MOP_USUARIO_DOHSET[0].MAXUSER[0]
                var grupo = '';
                path.GROUPUSER.forEach((g,i)=>{
                  grupo+=g.GROUPNAME[0]
                  if((i+1) < path.GROUPUSER.length){
                    grupo+=','
                  }
                })
               this._us.usuario = {
                DEFSITE:path.DEFSITE[0],
                GROUPUSER:grupo,
                LOGINID:path.LOGINID[0],
                PERSON:{
                  CARGOCOMP:path.PERSON[0].CARGOCOMP[0],
                  DFLTAPP:path.PERSON[0].DFLTAPP[0],
                  DISPLAYNAME:path.PERSON[0].DISPLAYNAME[0],
                  DPTOUNI:path.PERSON[0].DPTOUNI[0],
                  INSTITUCION:path.PERSON[0].INSTITUCION[0],
                  PERSONID:path.PERSON[0].PERSONID[0],
                  PROFESION:path.PERSON[0].PROFESION[0],
                  STATEPROVINCE:path.PERSON[0].STATEPROVINCE[0],
                  TIPOBOD:Boolean(String(path.PERSON[0].TIPOBOD[0]['$']['XSI:NIL']).replace(/[\\"]/gi,""))
                },
                STATUS:path.STATUS[0]['_'],
                USERID:path.USERID[0]
               }
               if(this._us.usuario.STATUS == 'ACTIVE'){
                  this._us.saveStorage(this._us.usuario,this.form.value)
                  this._us.cargar_storage().then(()=>{
                    this._mc.enable(true,'first')
                    this.loader.dismiss()
                    let options: NativeTransitionOptions ={
                      direction:'left',
                      duration:500
                    }
                    this.nativePageTransitions.flip(options);    
                    this._us.nextmessage('usuario_logeado') 
                  this.navctrl.navigateRoot('/home')
                 })
               }else{
                this.presentAlert('¡Atención!','EL usuario esta inactivo')
               }
             })
          }else{
            this.form.enable()
            this.loader.dismiss()
            this.presentAlert('¡Error!','Usuario y/o contraseña incorrecta')
          }  
        },err=>{
          console.log('Error-> ',err)
          this.form.enable()
          this.loader.dismiss()
          this.presentAlert('¡Error!','Usuario y/o contraseña incorrecta')
        })
      }else{
        this._http.get('../../../assets/usuario.xml').subscribe((res:any)=>{
          // console.log('archivo xml-> ',JSON.stringify((res)))
          this._us.xmlToJson(res).then((result:any)=>{
            let path = result['SOAPENV:ENVELOPE']['SOAPENV:BODY'][0].QUERYMOP_USUARIO_DOHRESPONSE[0].MOP_USUARIO_DOHSET[0].MAXUSER[0]
            var grupo = '';
            path.GROUPUSER.forEach((g,i)=>{
              grupo+=g.GROUPNAME[0]
              if((i+1) < path.GROUPUSER.length){
                grupo+=','
              }
            })
             this._us.usuario = {
              DEFSITE:path.DEFSITE[0],
              GROUPUSER:grupo,
              LOGINID:path.LOGINID[0],
              PERSON:{
                CARGOCOMP:path.PERSON[0].CARGOCOMP[0],
                DFLTAPP:path.PERSON[0].DFLTAPP[0],
                DISPLAYNAME:path.PERSON[0].DISPLAYNAME[0],
                DPTOUNI:path.PERSON[0].DPTOUNI[0],
                INSTITUCION:path.PERSON[0].INSTITUCION[0],
                PERSONID:path.PERSON[0].PERSONID[0],
                PROFESION:path.PERSON[0].PROFESION[0],
                STATEPROVINCE:path.PERSON[0].STATEPROVINCE[0],
                TIPOBOD:Boolean(String(path.PERSON[0].TIPOBOD[0]['$']['XSI:NIL']).replace(/[\\"]/gi,""))
              },
              STATUS:path.STATUS[0]['_'],
              USERID:path.USERID[0]
             }
            //  console.log('json de acrchivo xml-> ',this._us.usuario)
              if(this._us.usuario.STATUS == 'ACTIVE'){
                this._us.saveStorage(this._us.usuario,this.form.value)
                this._us.cargar_storage().then(()=>{
                  this._mc.enable(true,'first')
                  this.loader.dismiss()
                  let options: NativeTransitionOptions ={
                    direction:'left',
                    duration:500
                  }
                  this.nativePageTransitions.flip(options);    
                  this._us.nextmessage('usuario_logeado') 
                  this.navctrl.navigateRoot('/home')
                })
              }else{
                this.presentAlert('¡Atención!','EL usuario esta inactivo')
              }
           })
         },err=>{
           this._us.xmlToJson(err.error.text).then((result:any)=>{
            // console.log(result)
            let path = result['SOAPENV:ENVELOPE']['SOAPENV:BODY'][0].QUERYMOP_USUARIO_DOHRESPONSE[0].MOP_USUARIO_DOHSET[0].MAXUSER[0]
            var grupo = '';
            path.GROUPUSER.forEach((g,i)=>{
              grupo+=g.GROUPNAME[0]
              if((i+1) < path.GROUPUSER.length){
                grupo+=','
              }
            })
             this._us.usuario = {
              DEFSITE:path.DEFSITE[0],
              GROUPUSER:grupo,
              LOGINID:path.LOGINID[0],
              PERSON:{
                CARGOCOMP:path.PERSON[0].CARGOCOMP[0],
                DFLTAPP:path.PERSON[0].DFLTAPP[0],
                DISPLAYNAME:path.PERSON[0].DISPLAYNAME[0],
                DPTOUNI:path.PERSON[0].DPTOUNI[0],
                INSTITUCION:path.PERSON[0].INSTITUCION[0],
                PERSONID:path.PERSON[0].PERSONID[0],
                PROFESION:path.PERSON[0].PROFESION[0],
                STATEPROVINCE:path.PERSON[0].STATEPROVINCE[0],
                TIPOBOD:Boolean(String(path.PERSON[0].TIPOBOD[0]['$']['XSI:NIL']).replace(/[\\"]/gi,""))
              },
              STATUS:path.STATUS[0]['_'],
              USERID:path.USERID[0]
             }
            //  console.log('json de acrchivo xml-> ',this._us.usuario)
              if(this._us.usuario.STATUS == 'ACTIVE'){
                this._us.saveStorage(this._us.usuario,this.form.value)
                this._us.cargar_storage().then(()=>{
                  this._mc.enable(true,'first')
                  this.loader.dismiss()
                  let options: NativeTransitionOptions ={
                    direction:'left',
                    duration:500
                  }
                  this.nativePageTransitions.flip(options);    
                  this._us.nextmessage('usuario_logeado') 
                  this.navctrl.navigateRoot('/home')
                })
              }else{
                this.presentAlert('¡Atención!','EL usuario esta inactivo')
              }
           })
         })
      }
      
    })    
  }

}
