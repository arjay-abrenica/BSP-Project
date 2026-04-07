import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

export const routes: Routes = [

    // 1. Routes WITHOUT the Sidebar (e.g., Auth, Error Pages)
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/login/login').then(c => c.Login)
    },

    // 2. The Main Layout Wrapper (WITH the Sidebar)
    {
        path: '', // The base path
        canActivate: [AuthGuard],
        loadComponent: () =>
            import('./shared/layout/main-layout/main-layout.component').then(c => c.MainLayoutComponent),

        // Everything in this 'children' array will be injected into the <router-outlet>
        // next to your sidebar!
        children: [

            // Default redirect when someone hits the base URL
            {
                path: '',
                redirectTo: 'admin/dashboard',
                pathMatch: 'full'
            },

            // Admin Dashboard Page
            {
                path: 'admin/dashboard',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: ['SUPERADMIN', 'SUPPLY_OFFICER', 'FOCAL_OFFICER'] },
                loadComponent: () =>
                    import('./pages/admin/dashboard/dashboard.component').then(c => c.DashboardComponent)
            },

            // Inventory Page
            {
                path: 'inventory',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: ['SUPERADMIN', 'SUPPLY_OFFICER'] },
                loadComponent: () =>
                    import('./pages/inventory/inventory').then(c => c.Inventory),
                children: [
                    { path: '', redirectTo: 'catalog', pathMatch: 'full' },
                    { path: 'catalog', loadComponent: () => import('./pages/inventory/catalog/catalog').then(c => c.Catalog) },
                    { path: 'add-item', loadComponent: () => import('./pages/inventory/add-item/add-item').then(c => c.AddItem) },
                    { path: 'outflow', loadComponent: () => import('./pages/inventory/outflow/outflow.component').then(c => c.OutflowComponent) },
                    { path: 'track-item', loadComponent: () => import('./pages/inventory/track-item/track-item').then(c => c.TrackItem) }
                ]
            },

            // Property Redirect
            {
                path: 'property',
                redirectTo: 'property/overview',
                pathMatch: 'full'
            },
            
            // Property > Property Overview
            {
                path: 'property/overview',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: ['SUPERADMIN', 'SUPPLY_OFFICER'] },
                loadComponent: () =>
                    import('./pages/property/property-overview/property-overview').then(c => c.PropertyOverview)
            },
            // Focal Person Module
            {
                path: 'focal',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: ['SUPERADMIN', 'SUPPLY_OFFICER', 'FOCAL_OFFICER'] },
                children: [
                    { path: '', redirectTo: 'request', pathMatch: 'full' },
                    { path: 'request', loadComponent: () => import('./pages/focal/request-supplies/request-supplies').then(c => c.RequestSupplies) },
                    { path: 'status', loadComponent: () => import('./pages/focal/request-status/request-status.component').then(c => c.RequestStatusComponent) },
                    { path: 'log', loadComponent: () => import('./pages/focal/request-log/request-log.component').then(c => c.RequestLogComponent) }
                ]
            },

            // Reports Page
            {
                path: 'reports',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: ['SUPERADMIN', 'SUPPLY_OFFICER', 'FOCAL_OFFICER'] },
                loadComponent: () =>
                    import('./pages/reports/reports.component').then(c => c.ReportsComponent)
            },

            // Reports Analysis Page
            {
                path: 'reports/analysis',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: ['SUPERADMIN', 'SUPPLY_OFFICER', 'FOCAL_OFFICER'] },
                loadComponent: () =>
                    import('./pages/reports/analysis/analysis.component').then(c => c.AnalysisComponent)
            },

            // History Page
            {
                path: 'history',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: ['SUPERADMIN', 'SUPPLY_OFFICER', 'FOCAL_OFFICER'] },
                loadComponent: () =>
                    import('./pages/history/history.component').then(c => c.HistoryComponent)
            },
            {
                path: 'history/activity-log',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: ['SUPERADMIN', 'SUPPLY_OFFICER'] },
                loadComponent: () =>
                    import('./pages/history/activity-log/activity-log.component').then(c => c.ActivityLogComponent)
            },

            // Settings Redirect
            {
                path: 'settings',
                redirectTo: 'settings/system',
                pathMatch: 'full'
            },
            // Settings > System Settings
            {
                path: 'settings/system',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: ['SUPERADMIN'] },
                loadComponent: () =>
                    import('./pages/settings/system-settings/system-settings').then(c => c.SystemSettings)
            },
            // Settings > Account Management
            {
                path: 'settings/accounts',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: ['SUPERADMIN'] },
                loadComponent: () =>
                    import('./pages/settings/account-management/account-management').then(c => c.AccountManagement)
            },
            
            // Profile Redirect
            {
                path: 'profile',
                redirectTo: 'profile/settings',
                pathMatch: 'full'
            },
            // Profile > Profile Settings
            {
                path: 'profile/settings',
                canActivate: [AuthGuard],
                loadComponent: () =>
                    import('./pages/profile/profile-settings/profile-settings').then(c => c.ProfileSettings)
            }
        ]
    },

    // 3. Fallback route for 404 Not Found
    {
        path: '**',
        redirectTo: 'admin/dashboard'
    }
];
