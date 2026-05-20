import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const allowedRoles = route.data['roles'] as Array<string>;
    
    // If no roles are defined on the route, allow access
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    // Check if the current user possesses one of the required roles
    if (this.authService.hasRole(allowedRoles)) {
      return true;
    }

    // If unauthorized, redirect based on role to prevent infinite redirect loops
    if (this.authService.hasRole(['ACTING_PROPERTY_CUSTODIAN'])) {
      this.router.navigate(['/property/dashboard']);
    } else {
      this.router.navigate(['/admin/dashboard']);
    }
    return false;
  }
}
