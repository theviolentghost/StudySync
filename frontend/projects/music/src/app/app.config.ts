import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from '../../../../src/app/auth.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(),
        provideAnimations(),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        provideServiceWorker('/music/ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
        }),
    ]
};
