import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable()
export class DebugInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log('🚀 HTTP Request:', {
      method: req.method,
      url: req.url,
      headers: req.headers.keys().map(key => ({ [key]: req.headers.get(key) }))
    });

    return next.handle(req).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            console.log('✅ HTTP Response:', {
              status: event.status,
              url: event.url
            });
          }
        },
        error: (error: HttpErrorResponse) => {
          console.error('❌ HTTP Error:', {
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            message: error.message
          });
        }
      })
    );
  }
}