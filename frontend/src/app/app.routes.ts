import { Routes } from '@angular/router';
import { WorkspaceComponent } from './note.editor/workspace/workspace.component';
import { DocumentWorkspaceComponent } from './note.editor/workspace/document.workspace/document.workspace.component';
import { DrawingWorkspaceComponent } from './note.editor/workspace/drawing.workspace/drawing.workspace.component';
import { StudyWorkspaceComponent } from './note.editor/workspace/study.workspace/study.workspace.component';
import { WelcomeWorkspaceComponent } from './note.editor/workspace/welcome.workspace/welcome.workspace.component';
import { FileTypeNotKnownWorkspaceComponent } from './note.editor/workspace/file-type-not-known.workspace/file-type-not-known.workspace.component';
import { SelectFileWorkspaceComponent } from './note.editor/workspace/select.file.workspace/select.file.workspace.component';

export const routes: Routes = [
    {
        path: '',
        component: WelcomeWorkspaceComponent,
        outlet: 'workspace',
    },
    {
        path: 'WELCOME/:filePath',
        component: WelcomeWorkspaceComponent,
        outlet: 'workspace',
    },
    {
        path: 'SELECTFILE',
        component: SelectFileWorkspaceComponent,
        outlet: 'workspace', // change
    },
    {
        path: 'sdoc/:filePath',
        component: DocumentWorkspaceComponent,
        outlet: 'workspace',
    },
    {
        path: 'sdraw/:filePath',
        component: DrawingWorkspaceComponent,
        outlet: 'workspace',
    },
    {
        path: 'sstudy/:filePath',
        component: StudyWorkspaceComponent,
        outlet: 'workspace',
    },
    {
        path: "**",
        component: FileTypeNotKnownWorkspaceComponent,
        outlet: 'workspace',
    }
];