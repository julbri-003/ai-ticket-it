export function categoriaToDTO(categoria) {
  if (!categoria) return null;
  return { id: categoria.id, nombre: categoria.nombre, descripcion: categoria.descripcion };
}
