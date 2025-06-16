import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private Auth: AuthService) {}

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const token = this.Auth.getToken();
        console.log("AuthInterceptor: token", token);
        if (token) {
            const cloned = req.clone({
                setHeaders: { Authorization: `Bearer ${token}` }
            });
            return next.handle(cloned);
        }
        return next.handle(req);
    }
}