import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { RouterModule } from '@angular/router'; 
import { routes } from './app.routes';

import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { SatisfactoryCalculatorModule } from './satisfactory-calculator/satisfactory-calculator.module';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    RouterModule.forRoot(routes),
    SatisfactoryCalculatorModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { 
    // constructor() {
    //     console.log(isDevMode());
    //   }
}
