import { AuthGuard } from './auth.guard';

import { Routes } from '@angular/router';

import { UserSpaceComponent } from './user.space/user.space.component';
import { ProjectsComponent } from './user.space/projects/projects.component';

import { NoteEditorComponent } from './user.space/note.editor/note.editor.component'; // temp - debug
import { DocumentWorkspaceComponent } from './user.space/note.editor/workspace/document.workspace/document.workspace.component';
import { DrawingWorkspaceComponent } from './user.space/note.editor/workspace/drawing.workspace/drawing.workspace.component';
import { StudyWorkspaceComponent } from './user.space/note.editor/workspace/study.workspace/study.workspace.component';
import { WelcomeWorkspaceComponent } from './user.space/note.editor/workspace/welcome.workspace/welcome.workspace.component';
import { FileTypeNotKnownWorkspaceComponent } from './user.space/note.editor/workspace/file-type-not-known.workspace/file-type-not-known.workspace.component';
import { SelectFileWorkspaceComponent } from './user.space/note.editor/workspace/select.file.workspace/select.file.workspace.component';

import { LandingComponent } from './landing/landing.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { ContactComponent } from './contact/contact.component';
import { AboutComponent } from './about/about.component';


export const routes: Routes = [
    {
        path: '',
        component: LandingComponent,
    },
    {
        path: 'register',
        component: RegisterComponent,
    },
    {
        path: 'login',
        component: LoginComponent,
    },
    {
        path: 'about',
        component: AboutComponent,
    },
    {
        path: 'contactUs',
        component: ContactComponent,
    },
    {
        path: 'user',
        component: UserSpaceComponent,
        // canActivate: [AuthGuard],
        children: [
            {
                path: '',
                component: ProjectsComponent,
                outlet: 'user_space',
            },
            // User space outlet routes
            {
                path: 'projects',
                component: ProjectsComponent,
                outlet: 'user_space',
            },
            // {
            //     path: 'note_editor',
            //     component: NoteEditorComponent,
            //     outlet: 'user_space',
            // },
        ]
    },
    // Workspace outlet routes
            {
                path: 'workspace/:userId/:projectId',
                component: NoteEditorComponent,
                children: [
                    {
                        path: '',
                        component: WelcomeWorkspaceComponent,
                        outlet: 'workspace',
                    },
                    {
                        path: 'WELCOME',
                        component: WelcomeWorkspaceComponent,
                        outlet: 'workspace',
                    },
                    {
                        path: 'SELECTFILE',
                        component: SelectFileWorkspaceComponent,
                        outlet: 'workspace',
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
                ]
            }
];