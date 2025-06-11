import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { tap, map, catchError, switchMap, filter, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
    private backendURL = "http://localhost:3000";
    private isRefreshing = false;
    private refreshTokenSubject = new BehaviorSubject<string | null>(null);
    
    private userInfoSubject = new BehaviorSubject<any>(null);
    public userInfo$ = this.userInfoSubject.asObservable();
    private currentUserInfo: any = null;

    constructor(private http: HttpClient) { }

    register(userData: any) {
        return this.http.post<any>(`${this.backendURL}/auth/register`, userData).pipe(
            tap(response => {
                if (response.token) {
                    this.setToken(response.token);
                }
                if (response.refreshToken) {
                    this.setRefreshToken(response.refreshToken);
                }
                this.setCurrentUserInfo(response.user);
            })
        );
    }
    login(credentials: any) {
        return this.http.post<any>(`${this.backendURL}/auth/login`, credentials).pipe(
            tap(response => {
                if (response.token) {
                    this.setToken(response.token);
                }
                if (response.refreshToken) {
                    this.setRefreshToken(response.refreshToken);
                }
                this.setCurrentUserInfo(response.user);
            })
        );
    }
    logout() {
        this.removeToken();
        this.removeRefreshToken();
        this.clearUserInfo(); // Clear user info on logout
        return this.http.delete(`${this.backendURL}/auth/logout`);
    }
    isAuthorized(atUrl: string) {
        const token = this.getToken();
        if (!token) {
            // No token, check if we have refresh token
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) {
                return of(false);
            }
            
            // Try to refresh token first
            return this.refreshAccessToken().pipe(
                switchMap(() => this.checkAuthorization(atUrl)),
                catchError(() => of(false))
            );
        }

        // We have a token, try to use it
        return this.checkAuthorization(atUrl).pipe(
            catchError(error => {
                // Only refresh on 401/403 (token expired/invalid)
                if (error.status === 401 || error.status === 403) {
                    return this.refreshAccessToken().pipe(
                        switchMap(() => this.checkAuthorization(atUrl)),
                        catchError(() => of(false))
                    );
                }
                return of(false);
            })
        );
    }

    private checkAuthorization(atUrl: string) {
        const token = this.getToken();
        return this.http.get<{ authorized: boolean }>(`${this.backendURL}/auth/authorized`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { atUrl }
        }).pipe(
            map(response => response?.authorized ?? false)
        );
    }

    private refreshAccessToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            return throwError(() => new Error('No refresh token available'));
        }

        // Prevent multiple concurrent refresh requests
        if (this.isRefreshing) {
            return this.refreshTokenSubject.pipe(
                filter(token => token !== null),
                take(1),
                switchMap(() => of(this.getToken()))
            );
        }

        this.isRefreshing = true;
        this.refreshTokenSubject.next(null);

        return this.http.post<any>(`${this.backendURL}/auth/refresh`, {
            refreshToken: refreshToken
        }).pipe(
            tap(response => {
                if (response.token) {
                    this.setToken(response.token);
                    this.refreshTokenSubject.next(response.token);
                }
                if (response.refreshToken) {
                    this.setRefreshToken(response.refreshToken);
                }
                this.isRefreshing = false;
            }),
            catchError(error => {
                this.isRefreshing = false;
                this.refreshTokenSubject.next(null);
                // Clear tokens on refresh failure
                this.removeToken();
                this.removeRefreshToken();
                return throwError(() => error);
            }),
            map(response => response.token)
        );
    }

    setToken(token: string) {
        localStorage.setItem('token', token);
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    removeToken() {
        localStorage.removeItem('token');
    }

    setRefreshToken(token: string) {
        localStorage.setItem('refreshToken', token);
    }

    getRefreshToken(): string | null {
        return localStorage.getItem('refreshToken');
    }

    removeRefreshToken() {
        localStorage.removeItem('refreshToken');
    }

    isLoggedIn(): boolean {
        return !!(this.getToken() || this.getRefreshToken());
    }

    async refreshUserInfo() {
        const token = this.getToken();
        if (!token) {
            return throwError(() => new Error('No token available'));
        }

        try {
            const userInfo = await this.getUserInfo().toPromise();
            this.currentUserInfo = userInfo;
            this.userInfoSubject.next(userInfo);
            return userInfo;
        } catch (error) {
            console.error('Failed to refresh user info:', error);
            this.currentUserInfo = null;
            this.userInfoSubject.next(null);
            throw error;
        }
    }

    private setCurrentUserInfo(userInfo: any) {
        this.currentUserInfo = userInfo;
        localStorage.setItem('currentUserInfo', JSON.stringify(userInfo));
    }

    getCurrentUserInfo(): any {
        if(!this.currentUserInfo) return localStorage.getItem('currentUserInfo') ? JSON.parse(localStorage.getItem('currentUserInfo')!) : null;
        return this.currentUserInfo;
    }

    clearUserInfo() {
        this.currentUserInfo = null;
        this.userInfoSubject.next(null);
    }

    getUserInfo() {
        const token = this.getToken();
        if (!token) {
            return throwError(() => new Error('No token available'));
        }

        return this.http.get<any>(`${this.backendURL}/auth/userinfo`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).pipe(
            catchError(error => {
                if (error.status === 401 || error.status === 403) {
                    this.removeToken();
                    this.removeRefreshToken();
                    this.clearUserInfo(); // Clear user info on auth error
                }
                return throwError(() => error);
            })
        );
    }
}
