import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginModalService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  public isOpen$ = this.isOpenSubject.asObservable();

  constructor() {}

  openModal() {
    console.log('🎭 Abrindo modal de login...');
    this.isOpenSubject.next(true);
    // Impedir scroll do body quando modal está aberto
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '15px'; // Compensar barra de scroll
  }

  closeModal() {
    console.log('🎭 Fechando modal de login...');
    this.isOpenSubject.next(false);
    // Restaurar scroll do body
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  get isOpen(): boolean {
    return this.isOpenSubject.value;
  }
}
