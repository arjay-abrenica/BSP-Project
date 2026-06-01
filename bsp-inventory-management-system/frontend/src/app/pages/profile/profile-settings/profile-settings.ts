import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';

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
    userEmail = '';
    userOffice = '';
    userStatus = '';

    // Custom Toast Notification State
    showToast = false;
    toastMessage = '';
    toastType: 'success' | 'error' | 'warning' = 'success';

    constructor(private authService: AuthService, private http: HttpClient) {}

    ngOnInit() {
        const user = this.authService.currentUserValue;
        this.userRole = user?.role || 'User';
        this.userName = user?.username || 'User';
        this.userEmail = user?.email || `${this.userName.toLowerCase()}@scouts.gov.ph`;
        this.userOffice = user?.office || 'N/A';
        this.userStatus = user?.status || 'Active';
    }

    displayToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
        this.toastMessage = message;
        this.toastType = type;
        this.showToast = true;

        setTimeout(() => {
            this.showToast = false;
        }, 3500);
    }

    savePassword() {
        if (!this.oldPassword || !this.newPassword) {
            this.displayToast('Please fill in both old and new passwords.', 'warning');
            return;
        }

        const userId = this.authService.currentUserValue?.id;
        if (!userId) {
            this.displayToast('User ID not found.', 'error');
            return;
        }

        const payload = {
            oldPassword: this.oldPassword,
            newPassword: this.newPassword
        };

        this.http.put(`http://localhost:5000/api/users/${userId}/change-password`, payload).subscribe({
            next: (res: any) => {
                this.displayToast(res.message || 'Password updated successfully!', 'success');
                this.oldPassword = '';
                this.newPassword = '';
            },
            error: (err) => {
                console.error("Failed to update password", err);
                this.displayToast(err.error?.message || 'Failed to update password.', 'error');
            }
        });
    }
}
