import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { CommonModule } from "@angular/common";

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./pages/home-doh/home.module').then( m => m.HomePageModule)
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
  {
    path: 'modal-enviar',
    loadChildren: () => import('./pages/modal-enviar/modal-enviar.module').then( m => m.ModalEnviarPageModule)
  },
  {
    path: 'popover',
    loadChildren: () => import('./pages/popover/popover.module').then( m => m.PopoverPageModule)
  },
  {
    path: 'historial',
    loadChildren: () => import('./pages/historial/historial.module').then( m => m.HistorialPageModule)
  },
  {
    path: 'select',
    loadChildren: () => import('./pages/select/select.module').then( m => m.SelectPageModule)
  },
  {
    path: 'popover-filtro',
    loadChildren: () => import('./pages/popover-filtro/popover-filtro.module').then( m => m.PopoverFiltroPageModule)
  },
  {
    path: 'home-dap',
    loadChildren: () => import('./pages/home-dap/home-dap.module').then( m => m.HomeDapPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),CommonModule
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
