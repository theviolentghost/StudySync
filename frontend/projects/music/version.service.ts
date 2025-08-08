import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VersionService {
    private _version: string = '0.0.0';
    private _minor_outdated: boolean = false; // is app minor outdated? (0.0.0 -> 0.1.0) or (0.0.0 -> 0.0.1)
    private _major_outdated: boolean = false; // is app major outdated? (0.0.0 -> 1.0.0) or (0.0.0 -> 1.1.0)

    constructor() { }

    set version(value: string) {
        this._version = value;
    }
    get version(): string {
        return this._version;
    }   
    set minor_outdated(value: boolean) {
        this._minor_outdated = value;
    }
    get minor_outdated(): boolean {
        return this._minor_outdated;
    }
    set major_outdated(value: boolean) {
        this._major_outdated = value;
    }
    get major_outdated(): boolean {
        return this._major_outdated;
    }
}
