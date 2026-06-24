import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-wzlogin',
  templateUrl: './wzlogin.component.html',
  styleUrls: ['./wzlogin.component.css']
})
export class WzloginComponent implements OnInit, OnDestroy {
  model = {
    username: '',
    password: '',
    remember: false
  };
  showPassword = false;
  isLoading = false;
  loginerror = '';
  backgroundReady = false;
  private backgroundImage?: HTMLImageElement;
  // authService: any;

  constructor(
    private apiservice: ApiServicesService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const image = new Image();
    this.backgroundImage = image;

    const markReady = () => {
      this.backgroundReady = true;
    };

    image.onload = markReady;
    image.onerror = markReady; // keep login usable even if the decorative image fails
    image.src = 'assets/bg/login_home.png';

    if (image.complete) {
      markReady();
    }
  }

  ngOnDestroy(): void {
    if (this.backgroundImage) {
      this.backgroundImage.onload = null;
      this.backgroundImage.onerror = null;
    }
  }

 onLogin(form: NgForm): void {
  if (form.valid) {
    this.isLoading = true;
    const { username, password } = this.model;
    this.apiservice.getlogin(username, password).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        localStorage.setItem('access_token', response.access_token);  // use access_token
        this.authService.setToken(response.access_token);
        this.isLoading = false;
        const requestedUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const returnUrl = requestedUrl?.startsWith('/wzlab/')
          ? requestedUrl
          : '/wzlab/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error) => {
        this.loginerror = error.error.detail || 'An error occurred during login.';
        // alert('Login failed: ' + error.error.detail);
        console.error('Login failed:', error.error.detail || error.message);
        this.isLoading = false;
      }
    });
  }
}


  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
