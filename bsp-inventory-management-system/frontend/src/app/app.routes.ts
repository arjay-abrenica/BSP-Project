import { Routes } from '@angular/router';

export const routes: Routes = [
    // Default route: Login page
    {
        path: '',
        loadComponent: () =>
            import('./features/auth/login/login').then(c => c.Login)
    },

    // Admin Routes
    {
        path: 'admin/dashboard',
        // Lazy loading the standalone component
        loadComponent: () =>
            import('./pages/admin/dashboard/dashboard.component').then(c => c.DashboardComponent)
    },

    // // Inventory Routes
    // {
    //     path: 'inventory',
    //     // You would create this page component next
    //     loadComponent: () =>
    //         import('./pages/inventory/inventory.component').then(c => c.InventoryComponent)
    // },

    // // Reports Routes
    // {
    //     path: 'reports',
    //     loadComponent: () =>
    //         import('./pages/reports/reports.component').then(c => c.ReportsComponent)
    // },

    // // Settings Routes
    // {
    //     path: 'settings',
    //     loadComponent: () =>
    //         import('./pages/settings/settings.component').then(c => c.SettingsComponent)
    // },

    // Fallback route for 404 Not Found
    {
        path: '**',
        redirectTo: 'admin/dashboard'
    }
];