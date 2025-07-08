import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class YoutubeService {

    private backendURL = "http://localhost:3000";

    constructor(private http: HttpClient) { }

    searchVideos(query: string, maxResults: number = 10, nextPageToken): Observable<any> {

        const params = new HttpParams()
            .set('q', query)
            .set('maxResults', maxResults)
            .set('nextPageToken', nextPageToken)

        return this.http.get<any>(`${this.backendURL}/youtube_search`, { params });
    }
}