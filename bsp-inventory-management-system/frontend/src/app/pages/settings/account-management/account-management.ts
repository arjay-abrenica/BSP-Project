import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AccountRow {
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
export class AccountManagement {
    searchQuery = '';
    showAddModal = false;

    // Form fields for Add Account modal
    newFullName = '';
    newEmail = '';
    newOffice = 'CPSMO';
    newRole = 'User';

    accounts: AccountRow[] = [
        { accountId: 'ACC-2025-001', name: 'Maria D. Santos', email: 'mdsantos@scouts.gov.ph', office: 'IAC', role: 'User', status: 'Active' },
        { accountId: 'ACC-2025-002', name: 'Roberto L. Cruz', email: 'rlcruz@scouts.gov.ph', office: 'NSS', role: 'User', status: 'Inactive' },
        { accountId: 'ACC-2025-003', name: 'Alyssa R. Mendoza', email: 'armendoza@scouts.gov.ph', office: 'ICTU', role: 'Superadmin', status: 'Active' },
        { accountId: 'ACC-2025-004', name: 'Jason T. Villanueva', email: 'jtvillanueva@scouts.gov.ph', office: 'CPSMO', role: 'User', status: 'Active' },
        { accountId: 'ACC-2025-005', name: 'Nicole G. Perez', email: 'ngperez@scouts.gov.ph', office: 'ICTU', role: 'Superadmin', status: 'Active' },
        { accountId: 'ACC-2025-006', name: 'Kevin A. Dela Cruz', email: 'kadelacruz@scouts.gov.ph', office: 'Finance', role: 'User', status: 'Active' },
        { accountId: 'ACC-2025-007', name: 'Liza M. Flores', email: 'lmflores@scouts.gov.ph', office: 'PMDD', role: 'Inventory Officer', status: 'Active' },
        { accountId: 'ACC-2025-008', name: 'Patrick C. Navarro', email: 'pcnavarro@scouts.gov.ph', office: 'Admin', role: 'Inventory Officer', status: 'Active' },
        { accountId: 'ACC-2025-009', name: 'Angela R. Lim', email: 'arilm@scouts.gov.ph', office: 'OSG', role: 'User', status: 'Active' },
        { accountId: 'ACC-2025-010', name: 'Jerome P. Santos', email: 'jpsantos@scouts.gov.ph', office: 'ONP', role: 'User', status: 'Inactive' }
    ];

    openAddModal() {
        this.showAddModal = true;
    }

    closeAddModal() {
        this.showAddModal = false;
    }

    addAccount() {
        console.log("Added:", this.newFullName, this.newEmail, this.newOffice, this.newRole);
        this.showAddModal = false;
    }
}
