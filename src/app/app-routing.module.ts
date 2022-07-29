import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full'
  },
  {
    path: 'splash',
    loadChildren: () => import('./pages/splash/splash.module').then( m => m.SplashPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'help',
    loadChildren: () => import('./pages/help/help.module').then( m => m.HelpPageModule)
  },
  {
    path: 'modal-activos',
    loadChildren: () => import('./pages/modal-activos/modal-activos.module').then( m => m.ModalActivosPageModule)
  },
  {
    path: 'pendientes',
    loadChildren: () => import('./pages/pendientes/pendientes.module').then( m => m.PendientesPageModule)
  },
  {
    path: 'home_vialidad',
    loadChildren: () => import('./pages/home-vialidad/home-vialidad.module').then( m => m.HomeVialidadPageModule)
  },
  {
    path: 'modal-caminos',
    loadChildren: () => import('./pages/modal-caminos/modal-caminos.module').then( m => m.ModalCaminosPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
