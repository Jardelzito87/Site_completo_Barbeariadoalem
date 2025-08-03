// Endpoint para verificar disponibilidade de horários
module.exports = function(app, pool) {
  app.get('/api/disponibilidade', async (req, res) => {
    const { data } = req.query;
    
    if (!data) {
      return res.status(400).json({ error: 'Data é obrigatória' });
    }
    
    try {
      // Definir horários disponíveis
      const horarios = [
        '09:00:00', '10:00:00', '11:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00'
      ];
      
      // Buscar agendamentos para a data especificada
      const agendamentosResult = await pool.query(
        "SELECT hora_agendada FROM agendamentos WHERE data_agendada = $1 AND status NOT IN ('cancelado', 'não compareceu')",
        [data]
      );
      
      // Mapear horários ocupados
      const horariosOcupados = agendamentosResult.rows.map(row => row.hora_agendada);
      
      // Criar lista de disponibilidade
      const disponibilidade = horarios.map(horario => ({
        horario,
        disponivel: !horariosOcupados.includes(horario)
      }));
      
      res.json(disponibilidade);
    } catch (err) {
      console.error('Erro ao verificar disponibilidade:', err);
      res.status(500).json({ error: 'Erro ao verificar disponibilidade' });
    }
  });
};