import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { DatabaseService } from './services/database.service';
import { MockDatabaseService } from './services/mock-database.service';
import { DebugInterceptor } from './interceptors/debug.interceptor';

import { routes } from './app.routes';

// Configuração do modo de dados
// Agora usando o banco de dados Neon PostgreSQL real
const useMockService = false; // false = usa o banco Neon PostgreSQL

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([(req, next) => new DebugInterceptor().intercept(req, { handle: next })])
    ),
    { 
      provide: DatabaseService, 
      useClass: useMockService ? MockDatabaseService : DatabaseService 
    }
  ]
};
