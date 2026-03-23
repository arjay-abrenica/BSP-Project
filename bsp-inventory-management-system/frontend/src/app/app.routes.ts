import { Routes } from '@angular/router';

export const routes: Routes = [

    // 1. Routes WITHOUT the Sidebar (e.g., Auth/Login)
    // These sit outside the layout wrapper so they take up the full screen.
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/login/login').then(c => c.Login)
    },

    // 2. The Main Layout Wrapper (WITH the Sidebar)
    {
        path: '', // The base path
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
                loadComponent: () =>
                    import('./pages/admin/dashboard/dashboard.component').then(c => c.DashboardComponent)
            },

            // Inventory Page
            {
                path: 'inventory',
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

            // Reports Page
            {
                path: 'reports',
                loadComponent: () =>
                    import('./pages/reports/reports.component').then(c => c.ReportsComponent)
            },

            // Reports Analysis Page
            {
                path: 'reports/analysis',
                loadComponent: () =>
                    import('./pages/reports/analysis/analysis.component').then(c => c.AnalysisComponent)
            },

            // History Page
            {
                path: 'history',
                loadComponent: () =>
                    import('./pages/history/history.component').then(c => c.HistoryComponent)
            },
            {
                path: 'history/activity-log',
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
                loadComponent: () =>
                    import('./pages/settings/system-settings/system-settings').then(c => c.SystemSettings)
            },
            // Settings > Account Management
            {
                path: 'settings/accounts',
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