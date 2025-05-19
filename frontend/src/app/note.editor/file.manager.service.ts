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
    content: File[];
}
export interface SDocumentFile extends File {
    type: 'sdoc';
    content: {
        text: string // temp
    };
}

@Injectable({
  providedIn: 'root'
})
export class FileManagerService {
    private files: File[] = [
        {
            name: 'document 1',
            type: 'sdoc',
            directory: "/",
            content: {
                text: "This is a test document"
            },
        },
        {
            name: 'drawing',
            type: 'sdraw',
            directory: "/",
            content: null,
        },
        {
            name: 'Study Material',
            type: 'sstudy',
            directory: "/",
            content: null,
        },
        {
            name: 'stuff stuff stuff folder',
            type: 'FOLDER',
            directory: "/",
            collapsed: true,
            content: [
                {
                    name: 'stuff stuff stuff folder',
                    type: 'FOLDER',
                    directory: "/",
                    collapsed: true,
                    content: [
                        {
                            name: 'document 2',
                            type: 'sdoc',
                            directory: "/",
                            content: {
                                text: "This is a test document inside a folder"
                            },
                        },
                    ],
                },
                {
                    name: 'stuff stuff stuff folder',
                    type: 'FOLDER',
                    directory: "/",
                    collapsed: true,
                    content: [
                        {
                            name: 'folder-1',
                            type: 'FOLDER',
                            directory: "/",
                            collapsed: true,
                            content: [
                                {
                                    name: 'folder-2',
                                    type: 'FOLDER',
                                    directory: "/",
                                    collapsed: true,
                                    content: [
                                        {
                                            name: 'folder-3',
                                            type: 'FOLDER',
                                            directory: "/",
                                            collapsed: true,
                                            content: [
                                                {
                                                    name: 'folder-4',
                                                    type: 'FOLDER',
                                                    directory: "/",
                                                    collapsed: true,
                                                    content: [
                                                        {
                                                            name: 'lol.sdoc',
                                                            type: 'sdoc',
                                                            directory: "/",
                                                            content: {
                                                                text: "This is a test document inside a folder"
                                                            },
                                                            
                                                        },
                                                        {
                                                            name: 'document 2',
                                                            type: 'sdoc',
                                                            directory: "/",
                                                            content: {
                                                                text: "This is a test document inside a folder"
                                                            },
                                                        },
                                                        {
                                                            name: 'document 2',
                                                            type: 'sdoc',
                                                            directory: "/",
                                                            content: {
                                                                text: "This is a test document inside a folder"
                                                            },
                                                        },
                                                    ],
                                                }
                                            ],
                                        }
                                    ],
                                }
                            ],
                        }
                    ],
                }
            ],
        }
    ];
    @Output() openNewTabInWorkspace: EventEmitter<File> = new EventEmitter<File>();

    constructor() { }

    getAllFiles(): File[] {
        return this.files;
    }
    openFileInWorkspace(file: File) {
        this.openNewTabInWorkspace.emit(file);
    }
    getFileContent(filePath: string): any | null {
        // this should check to see if it is cahced locally first, if not then use server side. logic to be implemented

        // for now just return the file content
        const directory = filePath.split('/').slice(0, -1).join('/') || '/';
        const fullFileName = filePath.split('/').pop() || '';
        const fileName = fullFileName.includes('.') ? 
            fullFileName.substring(0, fullFileName.lastIndexOf('.')) : 
            fullFileName;
        const fileType = fullFileName?.split('.').pop();

        const file = this.files.find(f => f.name === fileName && f.directory === directory && f.type === fileType);
        return file ? file.content : null;
    }
}
