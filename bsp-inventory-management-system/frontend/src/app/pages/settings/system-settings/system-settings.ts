import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-settings.html',
  styleUrl: './system-settings.scss'
})
export class SystemSettings {
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
    
    toggleSetting(setting: 'inSystemAlert' | 'lowStockAlert' | 'notificationSound') {
        this[setting] = !this[setting];
    }
}
