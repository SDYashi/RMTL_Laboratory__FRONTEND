import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
 {path:'',redirectTo:'/wzlogin',pathMatch:'full'},
 {path:'wzlogin',loadChildren:()=>import('../app/wzlogin/wzlogin.module').then(m=>m.WzloginModule)},
 {path:'public/report-download',loadChildren:()=>import('./wzlab/rmtl-testing/rmtl-view-testreport/rmtl-view-testreport.module').then(m=>m.RmtlViewTestreportModule)},
//  {path:'**',redirectTo:'wzlogin',pathMatch:'full'},
 {path:'wzlab',loadChildren:()=>import('./wzlab/wzlab.module').then(m=>m.WzlabModule)},

];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  // imports: [RouterModule.forRoot(routes, { useHash: true })],

  exports: [RouterModule]
})
export class AppRoutingModule { }
