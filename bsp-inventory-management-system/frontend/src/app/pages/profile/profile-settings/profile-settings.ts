import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-settings.html',
  styleUrl: './profile-settings.scss'
})
export class ProfileSettings {
    oldPassword = '';
    newPassword = '';

    savePassword() {
        console.log("Saving new password...");
    }
}
