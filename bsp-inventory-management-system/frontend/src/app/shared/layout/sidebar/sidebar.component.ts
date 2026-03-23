import { Component, HostListener, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

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

    constructor(public router: Router) {}

    ngOnInit() {
        this.checkWindowSize();
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
        // In a real app this would clear tokens
        this.router.navigate(['/login']);
    }
}   