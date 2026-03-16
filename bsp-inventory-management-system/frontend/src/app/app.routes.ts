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
                    import('./pages/inventory/inventory.component').then(c => c.InventoryComponent)
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

            // Settings Page
            {
                path: 'settings',
                loadComponent: () =>
                    import('./pages/settings/settings.component').then(c => c.SettingsComponent)
            }
        ]
    },

    // 3. Fallback route for 404 Not Found
    {
        path: '**',
        redirectTo: 'admin/dashboard'
    }
];