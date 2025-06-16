import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from './auth.service';
import { map, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(private Auth: AuthService, private router: Router) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        const token = this.Auth.getToken();
        const path = state.url;

        if (!token) {
            this.router.navigate(['/login']);
            return of(false);
        }

        return this.Auth.isAuthorized(path).pipe(
            map(isAuthorized => {
                if (isAuthorized) {
                    return true;
                } else {
                    this.router.navigate(['/login']);
                    return false;
                }
            }),
            catchError(() => {
                this.router.navigate(['/login']);
                return of(false);
            })
        );
    }
}