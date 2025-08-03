import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GaleriaService {
  private servicoSelecionado: string | null = null;

  setServicoSelecionado(titulo: string): void {
    this.servicoSelecionado = titulo;
  }

  getServicoSelecionado(): string | null {
    return this.servicoSelecionado;
  }

  limparServicoSelecionado(): void {
    this.servicoSelecionado = null;
  }
}