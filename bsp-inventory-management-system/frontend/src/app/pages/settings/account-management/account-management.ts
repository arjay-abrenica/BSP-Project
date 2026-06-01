import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

export interface AccountRow {
    rawId: number;
    accountId: string;
    name: string;
    email: string;
    office: string;
    role: string;
    status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-account-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-management.html',
  styleUrl: './account-management.scss'
})
export class AccountManagement implements OnInit {
    searchQuery = '';
    showAddModal = false;

    // Form fields for Add Account modal
    newFullName = '';
    newEmail = '';
    newPassword = '';
    newOffice = 'CPSMO';
    newRole = 'STAFF';

    // Edit Modal State
    showEditModal = false;
    editAccountId = 0;
    editFullName = '';
    editEmail = '';
    editOffice = '';
    editRole = '';
    editStatus = 'Active';

    accounts: AccountRow[] = [];

    // Custom Reset Confirmation Modal State
    showResetConfirmModal = false;
    isResetting = false;
    resetSuccess = false;

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.fetchUsers();
    }

    fetchUsers() {
        this.http.get<any[]>('http://localhost:5000/api/users').subscribe({
            next: (data) => {
                this.accounts = data.map(user => ({
                    rawId: user.user_id,
                    accountId: `ACC-${user.user_id.toString().padStart(3, '0')}`,
                    name: user.username,
                    email: user.email || '-',
                    office: user.office || '-',
                    role: user.role,
                    status: user.status || 'Active'
                }));
            },
            error: (err) => {
                console.error("Failed to load users", err);
            }
        });
    }

    openAddModal() {
        this.showAddModal = true;
    }

    closeAddModal() {
        this.showAddModal = false;
        this.resetAddForm();
    }

    resetAddForm() {
        this.newFullName = '';
        this.newEmail = '';
        this.newPassword = '';
        this.newOffice = 'CPSMO';
        this.newRole = 'STAFF';
    }

    addAccount() {
        if (!this.newFullName || !this.newPassword) {
            alert('Full Name and Password are required.');
            return;
        }

        const payload = {
            username: this.newFullName,
            password: this.newPassword,
            email: this.newEmail,
            office: this.newOffice,
            role: this.newRole,
            status: 'Active'
        };

        this.http.post('http://localhost:5000/api/users', payload).subscribe({
            next: (res) => {
                console.log("User added successfully", res);
                alert('User added successfully!');
                this.showAddModal = false;
                this.fetchUsers();
                this.resetAddForm();
            },
            error: (err) => {
                console.error("Failed to add user", err);
                alert(err.error?.message || 'Failed to add user.');
            }
        });
    }

    openEditModal(acc: AccountRow) {
        this.editAccountId = acc.rawId;
        this.editFullName = acc.name;
        this.editEmail = acc.email === '-' ? '' : acc.email;
        this.editOffice = acc.office === '-' ? 'CPSMO' : acc.office;
        this.editRole = acc.role;
        this.editStatus = acc.status;
        this.showEditModal = true;
    }

    closeEditModal() {
        this.showEditModal = false;
    }

    saveEdit() {
        const payload = {
            username: this.editFullName,
            email: this.editEmail,
            office: this.editOffice,
            role: this.editRole,
            status: this.editStatus
        };

        this.http.put(`http://localhost:5000/api/users/${this.editAccountId}`, payload).subscribe({
            next: () => {
                this.showEditModal = false;
                this.fetchUsers();
            },
            error: (err) => {
                console.error("Failed to update user", err);
                alert('Failed to update user.');
            }
        });
    }

    resetPasswordToDefault() {
        this.showResetConfirmModal = true;
        this.isResetting = false;
        this.resetSuccess = false;
    }

    closeResetConfirm() {
        this.showResetConfirmModal = false;
    }

    executePasswordReset() {
        this.isResetting = true;
        
        this.http.put<any>(`http://localhost:5000/api/users/${this.editAccountId}/reset-password`, {}).subscribe({
            next: (res) => {
                this.isResetting = false;
                this.resetSuccess = true;
                
                // Show success screen for 1.5 seconds, then close all modals
                setTimeout(() => {
                    this.showResetConfirmModal = false;
                    this.showEditModal = false;
                    this.resetSuccess = false;
                }, 1800);
            },
            error: (err) => {
                this.isResetting = false;
                console.error("Failed to reset password", err);
                alert(err.error?.message || 'Failed to reset password.');
            }
        });
    }
}
