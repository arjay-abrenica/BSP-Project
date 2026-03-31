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

    constructor(private authService: AuthService, private http: HttpClient) {}

    ngOnInit() {
        this.userRole = this.authService.currentUserValue?.role || 'User';
        this.userName = this.authService.currentUserValue?.username || 'User';
    }

    savePassword() {
        if (!this.oldPassword || !this.newPassword) {
            alert('Please fill in both old and new passwords.');
            return;
        }

        const userId = this.authService.currentUserValue?.id;
        if (!userId) {
            alert('User ID not found.');
            return;
        }

        const payload = {
            oldPassword: this.oldPassword,
            newPassword: this.newPassword
        };

        this.http.put(`http://localhost:5000/api/users/${userId}/change-password`, payload).subscribe({
            next: (res: any) => {
                alert(res.message || 'Password updated successfully!');
                this.oldPassword = '';
                this.newPassword = '';
            },
            error: (err) => {
                console.error("Failed to update password", err);
                alert(err.error?.message || 'Failed to update password.');
            }
        });
    }
}
