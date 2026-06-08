import { Component, HostListener, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, AfterViewInit {
    // Determine initial state based on screen size (collapse on tablet/mobile)
    isSecondaryMenuOpen = true;
    isMobileSidebarOpen = false;
    isHeaderHidden = false;
    showLogoutModal = false;
    private lastScrollTop = 0;

    // Notifications
    showNotifDropdown = false;
    activeFilter: 'all' | 'low_stock' | 'request' | 'other' = 'all';

    setFilter(filter: 'all' | 'low_stock' | 'request' | 'other', event: Event) {
        event.stopPropagation();
        this.activeFilter = filter;
    }

    getFilteredNotifications(notifications: any[] | null): any[] {
        if (!notifications) return [];
        if (this.activeFilter === 'all') return notifications;
        return notifications.filter(n => {
            const msg = n.message.toLowerCase();
            const isLowStock = msg.includes('low stock');
            const isRequest = msg.includes('request') || msg.includes('ris');
            
            if (this.activeFilter === 'low_stock') return isLowStock;
            if (this.activeFilter === 'request') return isRequest;
            if (this.activeFilter === 'other') return !isLowStock && !isRequest;
            return true;
        });
    }

    constructor(
        public router: Router, 
        private authService: AuthService,
        public notifService: NotificationService
    ) { }

    get userName() {
        return this.authService.currentUserValue?.username || 'User';
    }

    hasRole(allowedRoles: string[]) {
        return this.authService.hasRole(allowedRoles);
    }

    ngOnInit() {
        this.checkWindowSize();
    }

    toggleNotifDropdown(event: Event) {
        event.stopPropagation();
        this.showNotifDropdown = !this.showNotifDropdown;
    }

    markRead(id: number) {
        this.notifService.markAsRead(id);
    }

    markAllRead() {
        this.notifService.markAllAsRead();
    }

    handleNotifClick(n: any, event: Event) {
        event.stopPropagation();
        this.notifService.markAsRead(n.id);
        if (n.action_link) {
            this.router.navigateByUrl(n.action_link);
            this.showNotifDropdown = false;
        }
    }

    @HostListener('document:click')
    closeDropdowns() {
        this.showNotifDropdown = false;
    }

    ngAfterViewInit() {
        if (typeof document !== 'undefined') {
            setTimeout(() => {
                const contentArea = document.querySelector('.content-area');
                if (contentArea) {
                    contentArea.addEventListener('scroll', (e) => this.onScroll(e));
                }
            }, 100);
        }
    }

    private onScroll(event: Event) {
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
            const currentScroll = (event.target as HTMLElement).scrollTop;
            if (currentScroll > this.lastScrollTop && currentScroll > 50) {
                // Scrolling down
                if (!this.isHeaderHidden) {
                    this.isHeaderHidden = true;
                }
            } else if (currentScroll < this.lastScrollTop) {
                // Scrolling up
                if (this.isHeaderHidden) {
                    this.isHeaderHidden = false;
                }
            }
            this.lastScrollTop = currentScroll;
        }
    }

    @HostListener('window:resize')
    onResize() {
        this.checkWindowSize();
    }

    private checkWindowSize() {
        if (typeof window !== 'undefined') {
            if (window.innerWidth <= 1024) {
                this.isSecondaryMenuOpen = false;
            } else {
                this.isSecondaryMenuOpen = true;
            }
            if (window.innerWidth > 768) {
                this.isMobileSidebarOpen = false; // Reset mobile state if resized
            }
        }
    }

    toggleMenu() {
        this.isSecondaryMenuOpen = !this.isSecondaryMenuOpen;
    }

    toggleMobileSidebar() {
        this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
    }

    closeMenuOnMobile() {
        if (typeof window !== 'undefined') {
            if (window.innerWidth <= 1024) {
                this.isSecondaryMenuOpen = false;
            }
            if (window.innerWidth <= 768) {
                this.isMobileSidebarOpen = false;
            }
        }
    }

    triggerLogOut() {
        this.showLogoutModal = true;
        this.closeMenuOnMobile();
    }

    cancelLogOut() {
        this.showLogoutModal = false;
    }

    confirmLogOut() {
        this.showLogoutModal = false;
        this.authService.logout();
    }
}   