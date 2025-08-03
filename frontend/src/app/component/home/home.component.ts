import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { GaleriaService } from '../../services/galeria.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(private router: Router, private galeriaService: GaleriaService) {}
  
  navegarParaGaleria(titulo: string): void {
    this.galeriaService.setServicoSelecionado(titulo);
    this.router.navigate(['/galeria-fotos']);
  }
}
