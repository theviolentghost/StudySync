import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, map, catchError, switchMap, filter, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { AuthService } from './auth.service';
import { Project_Item } from './user.space/projects/projects.component'; 

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
    project_id: number | null = null;
    user_id: number | null = null;

    constructor(private Auth: AuthService, private http: HttpClient) {}

    get_hierarchy(): Observable<Project_Item[]> {
        return this.http.get<Project_Item[]>(`${this.Auth.backendURL}/user/projects/hierarchy`, { headers: this.Auth.getAuthHeaders() }).pipe(
            catchError(error => {
                console.error('Error fetching project hierarchy:', error);
                throw error;
            })
        );
    }
}
