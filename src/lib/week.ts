// Función para obtener el inicio y fin de la semana (Lunes a Domingo)
export function getWeekRange(date = new Date()) {
  const currentDate = new Date(date);

  // Obtener el día de la semana (0 = Domingo, 1 = Lunes, etc.)
  const dayOfWeek = currentDate.getDay();

  // Calcular cuántos días restar para llegar al lunes
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Fecha de inicio de la semana (Lunes)
  const startOfWeek = new Date(currentDate);

  startOfWeek.setDate(currentDate.getDate() - daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  // Fecha de fin de la semana (Domingo)
  const endOfWeek = new Date(startOfWeek);

  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    start: startOfWeek,
    end: endOfWeek
  };
}