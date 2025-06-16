import { Injectable, EventEmitter, Output } from '@angular/core';
import { Tab } from './editor.tabs/editor.tabs.component';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../auth.service';
import { ProjectService } from '../../project.service';

export type FileSystemEntry = File | Folder;

export interface File {
    id: string; 
    name: string;
    type: 'WELCOME' | 'FOLDER' | 'sdoc' | 'sdraw' | 'sstudy' | 'txt';
    path: string;
    size?: number;
    collapsed?: boolean; // for folders, to suppress errors
}
export interface Folder {
    id: string; 
    name: string;
    path: string;
    collapsed: boolean;
    type: 'FOLDER';
    content: Map<string, FileSystemEntry>;
}
export interface FileData {
    data: any;
}

interface PathParts {
    path: string;
    fileName: string;
    fileType: string;
    fullFileName: string; // fileName + '.' + fileType
    directory: string;
    directories: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FileManagerService {
    private _root: Folder = {
        id: 'root',
        name: 'Root',
        path: 'root',
        type: 'FOLDER',
        content: new Map<string, FileSystemEntry>(),
        collapsed: false,
    }
    get file_system() : Map<string, FileSystemEntry> {
        return this._root.content;
    }
    private file_system_cache : Map<string, FileData> = new Map<string, FileData>(); // actual file content
    private file_system_file_index : Map<string, File> = new Map<string, File>(); // file metadata
    @Output() open_new_tab_in_workspace: EventEmitter<File> = new EventEmitter<File>();
    @Output() file_system_updated: EventEmitter<FileSystemEntry[]> = new EventEmitter<FileSystemEntry[]>();

    constructor(private Auth: AuthService, private http: HttpClient, private project_service: ProjectService) {
        // this.file_system.set(this._root.path, this._root);
    }

    get all_file_metadata(): FileSystemEntry[] {
        return Array.from(this.file_system.values());
    }
    

    get_parts_of_path(path: string): PathParts {
        const subDirectories = path.split('/');
        const fullFileName = subDirectories.pop() || '';
        const fileName = fullFileName.substring(0, fullFileName.lastIndexOf('.'));
        const fileType = fileName.includes('.') ?
            fileName.substring(fileName.lastIndexOf('.') + 1) :
            '';
        const directory = subDirectories.join('/') || '/';
        const directories = subDirectories.filter((dir) => dir !== '');
        return {
            path,
            fileName,
            fileType,
            fullFileName,
            directory,
            directories
        };
    }
    get_working_directory(data: PathParts): Folder | null {
        const { directories } = data;
        let currentDirectory: Folder | null = this._root;

        for(let directory of directories) {
            if(!currentDirectory) return null;

            let folder = currentDirectory.content.get(directory);
            if(!folder) {
                // directory does not exist
                // create a new folder, replace this logiuc with server call later
                folder = { 
                    id: crypto.randomUUID(), // generate a unique ID for the folder
                    name: directory,
                    type: 'FOLDER',
                    path: currentDirectory.path + '/' + directory,
                    content: new Map<string, FileSystemEntry>(),
                    collapsed: true,
                }
                currentDirectory.content.set(directory, folder);
            }
            if(folder?.type === 'FOLDER') {
                currentDirectory = folder as Folder;
            } else {
                // not a folder
                return null;
            }
        }

        return currentDirectory;
    }
    private get_unique_file_name(directory: Folder, fileName: string, fileType: string): string {
        let base = fileName;
        let ext = fileType ? `.${fileType}` : '';
        let candidate = base + ext;
        let counter = 1;

        // Collect all file names in the directory
        const existingNames = new Set(directory.content.keys());

        // Regex to match "name (n).ext"
        //const nameRegex = new RegExp(`^${base.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}( \\((\\d+)\\))?${ext.replace('.', '\\.')}$`);

        // Find the next available number
        while (existingNames.has(candidate)) {
            candidate = `${base} (${counter})${ext}`;
            counter++;
        }
        return candidate;
    }

    get_children_from_directory(directory: Folder): FileSystemEntry[] {
        return Array.from(directory.content.values());
    }

    init_all_file_metadata() {
        return this.http.get<any[]>(`${this.Auth.backendURL}/user/project/${this.project_service.project_id}/files/meta`, {
            headers: this.Auth.getAuthHeaders(),
        }).subscribe(
            (data: any[]) => {
                this.file_system.clear(); // clear the existing file system
                this.file_system_file_index.clear(); // clear the file index
                this.file_system_cache.clear(); // clear the file cache

                for(let entry of data) {
                    this.add_entry_to_file_system(this.server_to_client_entry(entry));
                }

                this.file_system_updated.emit(this.get_children_from_directory(this._root));
            }
        );
    }

    private server_to_client_entry(entry: any): FileSystemEntry {
        return entry.type === 'FOLDER' ?
            {
                id: entry.id,
                name: entry.file_name,
                type: entry.file_type,
                path: entry.file_path,
                collapsed: true,
            } as Folder
            :
            {
                id: entry.id,
                name: entry.file_name,
                type: entry.file_type,
                path: entry.file_path,
            } as File;
    }

    add_entry_to_file_system(entry: FileSystemEntry): void {
        const path_parts = this.get_parts_of_path(entry.path);
        const directory = this.get_working_directory(path_parts);
        if(!directory) return;
        let unique_entry_name = entry.name + '.' + entry.type;

        if(directory.content.has(unique_entry_name)) {
            unique_entry_name = this.get_unique_file_name(directory, entry.name, entry.type);
        }
        entry.name = unique_entry_name.replace('.' + entry.type, ''); // remove the extension from the unique name

        this.add_entry_to_file_index(entry);
        directory.content.set(unique_entry_name, entry);
    }

    private add_entry_to_file_index(entry: FileSystemEntry): void {
        if ( entry.type === 'FOLDER' ) {
            for (const child of this.get_children_from_folder(entry as Folder)) {
                this.add_entry_to_file_index(child);
            }
            return;
        }

        if (entry.type === 'WELCOME') return; // skip welcome files
        if (this.file_system_file_index.has(entry.id)) return; // already exists in index
        this.file_system_file_index.set(entry.id, entry as File);
    }

    get_file_by_id(file_id: string): File | null {
        return this.file_system_file_index.get(file_id) || null;
    }

    get_children_from_folder(folder: Folder): FileSystemEntry[] {
        return Array.from(folder.content.values());
    }
    get_root_children(): FileSystemEntry[] {
        return Array.from(this.file_system.values());
    }
    async open_file_in_workspace(file: File) {
        console.log('openiing file in workspace:', file);



        this.open_new_tab_in_workspace.emit(file);
    }
    get_file_id_by_path(path: string): string | null {
        const path_parts = this.get_parts_of_path(path);
        const directory = this.get_working_directory(path_parts);
        console.log(path_parts)
        if(!directory) return null;

        const file = directory.content.get(path_parts.fullFileName);
        if(!file) return null;

        return file?.id || null;
    }
    async get_file_content(file_id: string): Promise<FileData | null> {
        if (this.file_system_cache.has(file_id)) {
            console.log('Returning cached file content for:', file_id);
            console.log(this.file_system_cache.get(file_id));
            return this.file_system_cache.get(file_id) || null;
        }

        try {
            const data = await firstValueFrom(
                this.http.get<FileData>(
                    `${this.Auth.backendURL}/user/file/${file_id}`,
                    { headers: this.Auth.getAuthHeaders() }
                )
            );

            if (data) {
                console.log('Fetched file content for:', data);
                this.file_system_cache.set(file_id, data);
                return data;
            }
            return null;
        } catch (error) {
            console.error('Error fetching file content:', error);
            return null;
        }
    }
    save_file(file_id: string, data: any): void {
        this.http.put<FileData>(
            `${this.Auth.backendURL}/user/file/${file_id}`,
            { data: data },
            { headers: this.Auth.getAuthHeaders() }
        ).subscribe(
            (response: FileData) => {
                console.log('File saved successfully:', response);
                this.file_system_cache.set(file_id, response);
            }
        , (error) => {
            console.error('Error saving file:', error);
        });
    }
}
