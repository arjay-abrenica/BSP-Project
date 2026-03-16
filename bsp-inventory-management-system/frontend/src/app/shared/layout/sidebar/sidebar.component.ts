import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
    // You can add logic here later to toggle the secondary sidebar open/closed
    isSecondaryMenuOpen = true;

    constructor(public router: Router) {}

    toggleMenu() {
        this.isSecondaryMenuOpen = !this.isSecondaryMenuOpen;
    }
}   