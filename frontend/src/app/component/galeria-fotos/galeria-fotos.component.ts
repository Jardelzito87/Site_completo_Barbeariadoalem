import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GaleriaService } from '../../services/galeria.service';

interface GaleriaItem {
  imagem: string;
  titulo: string;
  descricao: string;
  categoria: string;
}

@Component({
  selector: 'app-galeria-fotos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './galeria-fotos.component.html',
  styleUrl: './galeria-fotos.component.css'
})
export class GaleriaFotosComponent implements OnInit {
  constructor(private galeriaService: GaleriaService) {}

  ngOnInit(): void {
    const servicoSelecionado = this.galeriaService.getServicoSelecionado();
    if (servicoSelecionado) {
      // Se um serviço foi selecionado na home, filtrar por ele
      this.filtrarPorServico(servicoSelecionado);
      this.galeriaService.limparServicoSelecionado();
    }
  }
  categoriaAtual: string = 'todos';
  
  itensGaleria: GaleriaItem[] = [
    {
      imagem: 'https://i.postimg.cc/DzWHSK4r/download-1.jpg',
      titulo: 'Transformação Sombria',
      descricao: 'Estilo contemporâneo com acabamento perfeito',
      categoria: 'cortes'
    },
    {
      imagem: 'https://i.postimg.cc/133LZF9Y/download-4.jpg',
      titulo: 'Barba Maldita',
      descricao: 'Definição e contorno para destacar seu estilo',
      categoria: 'barbas'
    },
    {
      imagem: 'https://i.postimg.cc/dQ8MRvHn/download-2.jpg',
      titulo: 'Corte Sobrenatural',
      descricao: 'Elegância atemporal para qualquer ocasião',
      categoria: 'cortes'
    },
    {
      imagem: 'https://i.postimg.cc/tJbMvZSk/Freddie.jpg',
      titulo: 'Pacto completo',
      descricao: 'Inspirado nos clássicos que nunca saem de moda',
      categoria: 'especiais'
    },
    {
      imagem: 'https://i.postimg.cc/NfY3pVZt/opvoeden-aleid-truijens-getty-images.jpg',
      titulo: 'Degradê Espectral',
      descricao: 'Transição perfeita para um visual moderno',
      categoria: 'cortes'
    },
    {
      imagem: 'https://i.postimg.cc/gJ87KqDr/Samuel-L-Jackson.jpg',
      titulo: 'Navalha Demoníaca',
      descricao: 'Personalidade e atitude em cada detalhe',
      categoria: 'especiais'
    }
  ];

  get itensFiltrados(): GaleriaItem[] {
    if (this.categoriaAtual === 'todos') {
      return this.itensGaleria;
    }
    return this.itensGaleria.filter(item => item.categoria === this.categoriaAtual);
  }

  filtrarPorCategoria(categoria: string): void {
    this.categoriaAtual = categoria;
  }

  servicoSelecionado: string | null = null;

  filtrarPorServico(titulo: string): void {
    this.servicoSelecionado = titulo;
  }

  get itensPorServico(): GaleriaItem[] {
    if (!this.servicoSelecionado) {
      return this.itensFiltrados;
    }
    return this.itensGaleria.filter(item => item.titulo === this.servicoSelecionado);
  }
}