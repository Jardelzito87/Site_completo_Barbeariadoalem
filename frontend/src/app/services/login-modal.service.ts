/**
 * ==============================
 * SERVIÇO DE CONTROLE DO MODAL DE LOGIN
 * Gerencia o estado de abertura/fechamento do modal
 * ==============================
 */

// Importações do Angular Core
import { Injectable } from '@angular/core';
// Importações do RxJS para programação reativa
import { BehaviorSubject } from 'rxjs';

/**
 * SERVIÇO DE MODAL DE LOGIN
 * Responsável por:
 * - Controlar o estado de abertura/fechamento do modal
 * - Gerenciar o scroll da página quando modal está aberto
 * - Fornecer observables para componentes reagirem às mudanças
 */
@Injectable({
  providedIn: 'root' // Serviço singleton disponível em toda a aplicação
})
export class LoginModalService {
  /**
   * GERENCIAMENTO DE ESTADO
   * BehaviorSubject para controlar se o modal está aberto ou fechado
   */
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  
  /** Observable público para componentes se inscreverem */
  public isOpen$ = this.isOpenSubject.asObservable();

  /**
   * CONSTRUTOR
   * Não requer dependências externas
   */
  constructor() {}

  /**
   * ABRIR MODAL
   * Abre o modal de login e impede o scroll da página
   */
  openModal() {
    console.log('🎭 Abrindo modal de login...');
    this.isOpenSubject.next(true); // Atualiza o estado para aberto
    
    // CONTROLE DE SCROLL DA PÁGINA
    // Impede scroll do body quando modal está aberto
    document.body.style.overflow = 'hidden';
    // Compensa a largura da barra de scroll para evitar "pulo" do layout
    document.body.style.paddingRight = '15px';
  }

  /**
   * FECHAR MODAL
   * Fecha o modal de login e restaura o scroll da página
   */
  closeModal() {
    console.log('🎭 Fechando modal de login...');
    this.isOpenSubject.next(false); // Atualiza o estado para fechado
    
    // RESTAURAR SCROLL DA PÁGINA
    // Restaura o scroll normal do body
    document.body.style.overflow = '';
    // Remove o padding que compensava a barra de scroll
    document.body.style.paddingRight = '';
  }

  /**
   * GETTER PARA ESTADO ATUAL
   * Retorna o estado atual do modal (aberto/fechado)
   * @returns boolean - true se modal está aberto, false se fechado
   */
  get isOpen(): boolean {
    return this.isOpenSubject.value;
  }
}
