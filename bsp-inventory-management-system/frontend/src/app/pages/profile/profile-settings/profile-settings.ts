import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-settings.html',
  styleUrl: './profile-settings.scss'
})
export class ProfileSettings implements OnInit {
    oldPassword = '';
    newPassword = '';
    userRole = '';
    userName = '';

    constructor(private authService: AuthService) {}

    ngOnInit() {
        this.userRole = this.authService.currentUserValue?.role || 'User';
        this.userName = this.authService.currentUserValue?.username || 'User';
    }

    savePassword() {
        console.log("Saving new password...");
    }
}
