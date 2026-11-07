# Forge Build Fight

**Prototipo 0.1** — Un Tower Defense modular de navegador donde cada torre nace de piezas forjadas al azar.

## Jugar

Abre `index.html` en un navegador moderno o visita GitHub Pages una vez publicado. No hay dependencias, build ni cuentas. La partida se guarda en `localStorage`.

## Bucle principal

1. **Forge:** gasta tiradas para conseguir piezas comunes, raras, épicas, legendarias y míticas. Mejora la forja con oro para aumentar gradualmente las probabilidades superiores.
2. **Build:** escoge **una** pieza por ranura: chasis, arma, mecanismo y núcleo. Ensambla una torreta. Las piezas físicas se consumen y se recuperan al desmontar fuera del combate. Una rareza superior mejora las estadísticas, pero las sinergias importan.
3. **Fight:** coloca las torretas ensambladas en pedestales alrededor del camino. Defiende el núcleo en **cinco niveles** de campaña, con enemigos veloces, blindados y un jefe final. Gana oro, tiradas y desbloquea niveles.

## Contenido de la primera versión

- 12 modelos de piezas (3 por ranura), 5 rarezas, hasta 8 niveles de forja.
- Torreta modular con estadísticas de daño, cadencia, alcance y núcleo con efectos de quemadura, congelación y cadena.
- 10 posiciones de torreta, cinco niveles y jefe en el quinto.
- Animación sobre Canvas 2D, interfaz adaptable a móvil y escritorio.
- Partida local guardada al forjar, mejorar, ensamblar y ganar niveles.

**Nota:** la versión anterior del repositorio era el juego `Snake Busters`. Su contenido fue sustituido por completo. Queda recuperable en el historial Git anterior al commit de reinicio.

## Desarrollo

Sirve estos archivos con cualquier servidor estático, por ejemplo:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`. Para publicar con GitHub Pages: Settings → Pages → Deploy from a branch → `main` / `/ (root)`.

## Próximos pasos

Balancear dificultad y probabilidades tras pruebas, mejorar feedback de forja y del combate, hacer que los núcleos transformen visiblemente los disparos, incorporar enemigos con habilidades, pulir arte 3D para la migración a motor si el prototipo demuestra ser divertido.
