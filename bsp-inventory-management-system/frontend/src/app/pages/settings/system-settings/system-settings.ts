import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-settings.html',
  styleUrl: './system-settings.scss'
})
export class SystemSettings implements OnInit {
    // Checkboxes
    emailNewRequests = false;
    emailOnApproval = false;
    emailOnRelease = false;
    emailLowStock = false;

    // Toggles
    inSystemAlert = true;
    lowStockAlert = false;
    notificationSound = false;

    // Inputs
    emailServer = 'bsp-ims@scouts.gov.ph';

    private apiUrl = 'http://localhost:5000/api/settings';

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.loadSettings();
    }

    loadSettings() {
        this.http.get<any>(this.apiUrl).subscribe({
            next: (data) => {
                this.emailNewRequests = data.email_new_requests ?? false;
                this.emailOnApproval = data.email_on_approval ?? false;
                this.emailOnRelease = data.email_on_release ?? false;
                this.emailLowStock = data.email_low_stock ?? false;
                this.inSystemAlert = data.in_system_alert ?? true;
                this.lowStockAlert = data.low_stock_alert ?? false;
                this.notificationSound = data.notification_sound ?? false;
                this.emailServer = data.email_server ?? 'bsp-ims@scouts.gov.ph';
            },
            error: (err) => console.error('Failed to load settings', err)
        });
    }
    
    toggleSetting(setting: 'inSystemAlert' | 'lowStockAlert' | 'notificationSound') {
        this[setting] = !this[setting];
    }

    saveSettings() {
        const payload = {
            email_new_requests: this.emailNewRequests,
            email_on_approval: this.emailOnApproval,
            email_on_release: this.emailOnRelease,
            email_low_stock: this.emailLowStock,
            in_system_alert: this.inSystemAlert,
            low_stock_alert: this.lowStockAlert,
            notification_sound: this.notificationSound,
            email_server: this.emailServer
        };

        this.http.post(this.apiUrl, payload).subscribe({
            next: () => alert('Settings saved successfully!'),
            error: (err) => {
                console.error('Failed to save settings', err);
                alert('Failed to save settings.');
            }
        });
    }
}
