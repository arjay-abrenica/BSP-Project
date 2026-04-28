import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const userJson = sessionStorage.getItem('currentUser');
  let token = null;

  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      token = user.token;
    } catch (e) {
      console.error('Error parsing user from sessionStorage', e);
    }
  }

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};
