import { Injectable, EventEmitter, Output } from '@angular/core';
import { Tab } from './editor.tabs/editor.tabs.component';

export interface File {
    name: string;
    type: 'WELCOME' | 'FOLDER' | 'sdoc' | 'sdraw' | 'sstudy' | 'txt' | 'md';
    directory: string;
    content: any | null;
    lastModified?: Date;
    size?: number;
    collapsed?: boolean; // for folder view
}
export interface Folder extends File {
    type: 'FOLDER';
    content: Map<string, File>;
}
export interface SDocumentFile extends File {
    type: 'sdoc';
    content: {
        text: string // temp
    };
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
        name: 'ROOT',
        type: 'FOLDER',
        directory: 'root',
        content: new Map<string, File>(),
        collapsed: false
    };
    get root(): Folder {
        return this._root;
    }
    private files: Map<string, File> = new Map<string, File>();
    @Output() openNewTabInWorkspace: EventEmitter<File> = new EventEmitter<File>();

    constructor() {
        this.files.set('root', this.root);

        this.addEntryToFiles("/docs/1/", {
            name: 'hello',
            type: 'sdoc',
            directory: '/docs/1/',
            content: {
                text: 'hello'
            }
        });
        this.addEntryToFiles("/docs/1/", {
            name: "hello",
            type: 'sdoc',
            directory: "/docs/1/",
            content: {
                text: "hellow gaunt"
            }
        });
        this.addEntryToFiles("/docs/", {
            name: "studying is taking place here",
            type: 'sstudy',
            directory: "/docs/",
            content: {}
        });
        // alert(this.getChildrenOfFolder(this.root)[0]?.name)
        // alert(this.getFileByPath('/docs/1/hello.sdoc')?.content?.text);
    }

    getPartsOfPath(path: string): PathParts {
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
    getWorkingDirectory(data: PathParts): Folder | null {
        const { directories } = data;
        let currentDirectory: Folder | null = this.root;

        for(let directory of directories) {
            if(!currentDirectory) return null;

            let folder = currentDirectory.content.get(directory);
            if(!folder) {
                // directory does not exist
                // create a new folder
                folder = {
                    name: directory,
                    type: 'FOLDER',
                    directory: currentDirectory.directory + '/' + directory,
                    content: new Map<string, File>(),
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
    private getUniqueFileName(directory: Folder, fileName: string, fileType: string): string {
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
    addEntryToFiles(filePath: string, file: File): void {
        const pathParts = this.getPartsOfPath(filePath);
        const directory = this.getWorkingDirectory(pathParts);
        if(!directory) return;
        let uniqueFileName = file.name + '.' + file.type;

        if(directory.content.has(uniqueFileName)) {
            uniqueFileName = this.getUniqueFileName(directory, file.name, file.type);
        }
        file.name = uniqueFileName.replace('.' + file.type, ''); // remove the extension from the unique name
        directory.content.set(uniqueFileName, file);
    }
    getRootChildren(): File[] {
        return Array.from(this.root.content.values());
    }
    getChildrenOfFolder(folder: Folder): File[] {
        return Array.from(folder.content.values());
    }
    getFileByPath(path: string): File | null {
        const pathParts = this.getPartsOfPath(path);
        const directory = this.getWorkingDirectory(pathParts);
        if(!directory) return null;

        const file = directory.content.get(pathParts.fullFileName);
        return file || null;
    }
    getFileFromDirectory(directory: Folder, fileName: string): File | null {
        return directory.content.get(fileName) || null;
    }


    getAllFiles(): File[] {
        return this.getChildrenOfFolder(this.root);
    }
    openFileInWorkspace(file: File) {
        this.openNewTabInWorkspace.emit(file);
    }
    getFileContent(filePath: string): any | null {
        // this should check to see if it is cahced locally first, if not then use server side. logic to be implemented

        // for now just return the file content
        const pathParts = this.getPartsOfPath(filePath);
        const directory = this.getWorkingDirectory(pathParts);
        if(!directory) return null;
        const file = this.getFileFromDirectory(directory, pathParts.fullFileName);

        return file ? file.content : null;
    }
    saveFileContent(filePath: string, content: any): void {
        const pathParts = this.getPartsOfPath(filePath);
        const directory = this.getWorkingDirectory(pathParts);
        if(!directory) return;
        const file = this.getFileFromDirectory(directory, pathParts.fullFileName);

        if(file) {
            file.content = content;
            file.lastModified = new Date();
            file.size = JSON.stringify(content).length; // size in bytes
        }
    }
}
