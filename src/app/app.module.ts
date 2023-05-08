import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@awesome-cordova-plugins/splash-screen/ngx';
import { StatusBar } from '@awesome-cordova-plugins/status-bar/ngx';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { Network } from '@awesome-cordova-plugins/network/ngx';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { NativePageTransitions } from '@awesome-cordova-plugins/native-page-transitions/ngx';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { SQLite } from '@awesome-cordova-plugins/sqlite/ngx';
import { Keyboard } from '@ionic-native/keyboard/ngx';
// import { LocationAccuracy } from '@awesome-cordova-plugins/location-accuracy/ngx';
import { Clipboard } from '@ionic-native/clipboard/ngx';


@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, 
    IonicModule.forRoot({
      // scrollPadding: false,
      // scrollAssist: false,
      // backButtonText: '',
      // backButtonIcon: 'ios',
    }), 
    AppRoutingModule, 
    BrowserAnimationsModule,
    HttpClientModule,
  ],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },Network,NativeStorage,
    NativePageTransitions,SplashScreen,StatusBar,Geolocation,SQLite,Keyboard,Clipboard],
  bootstrap: [AppComponent],
})
export class AppModule {}
