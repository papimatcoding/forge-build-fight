# Barbaridades — Serie I (0.2)

**Un juego de cartas absurdas con decisiones estratégicas.** Este proyecto sustituye el prototipo Tower Defense anterior en el repositorio `forge-build-fight`.

## Jugar

Prueba el prototipo en GitHub Pages: https://papimatcoding.github.io/forge-build-fight/

Para jugar en local, abre `index.html` desde un servidor estático (`python -m http.server 8000`, por ejemplo). No necesitas instalar dependencias. El motor no requiere conexión a internet; el enlace de Canva y las fuentes web sí.

### Modos disponibles

- **1v1 local en un mismo dispositivo**: al terminar un turno aparece una pantalla para pasar el dispositivo. Cada jugador solo ve su mano al pulsar continuar.
- **Vs CPU**: bot sencillo para comprobar las reglas. No es multijugador online ni IA avanzada.

**IMPORTANTE:** GitHub Pages solo sirve archivos estáticos. Todavía no existe modo multijugador remoto ni matchmaking.

## Reglas del primer prototipo

- Cuatro carriles para cada jugador. Las criaturas atacan la carta rival enfrentada; si el carril está libre, inclinan la balanza.
- Cada jugador recibe **3 de energía al comienzo de su propio turno**; puede guardar hasta un máximo de 10.
- Se roba una carta completamente aleatoria por turno, con duplicados y un máximo de 9 cartas en la mano. La mano inicial es de 4 más el robo del turno inicial.
- Cada jugador puede jugar tantas cartas como quiera mientras tenga energía, y acaba su turno cuando lo decida.
- Los dos primeros turnos globales son preparación, **sin ataques**.
- A partir del tercer turno global, **solo atacan las criaturas del jugador que acaba de terminar su propio turno**.
- Gana quien consiga una diferencia de **5 puntos en la balanza**.
- Las criaturas no contraatacan al recibir ataques, salvo habilidades explícitas.

## Catálogo: Serie I (16 cartas)

`cards.js` define los 16 naipes, con coste, estadísticas, efectos y referencias de página a Canva. El motor y UI están en `game.js`, `index.html` y `styles.css`.

### Cambios especiales confirmados

- **Beca MEC**: +1 energía al comenzar cada turno propio mientras esté en el campo.
- **Pereira Castor**: al morir, contraataca con sus paletas.
- **Hipergamia**: selecciona una criatura enemiga para concentrar contra ella el siguiente ataque de todas las criaturas aliadas (el efecto se consume en ese ataque, incluso si se jugó durante preparación).
- **Token pirata de Fortnite**: las cartas restantes cuestan cero durante ese turno, incluso con Inspector Hacienda.
- **Perry el ornitorrinco**: con gorro 2/3 y escudo para un efecto hostil; sin gorro 4/2; alterna al empezar cada turno **de su dueño**.
- **La vaca que ríe**: tras atacar entrega quesos a criaturas aliadas adyacentes y les recupera un punto de vida.

## Arte en Canva

**Álbum editable de la Serie I:** https://www.canva.com/d/1nGX-UD4kuLDJGu

**Carpeta de Canva:** https://www.canva.com/folder/FAHaVurOQPc

Las cartas siguen el mismo orden que `CARDS` y `canvaPage` marca su página 1–16. La interfaz usa **iconos provisionales y tarjetas hechas con CSS**; no se incluyen miniaturas temporales con enlaces firmados porque caducan. Antes de la versión final habrá que exportar las ilustraciones a archivos permanentes y sustituir esos placeholders.

## Tests

```bash
npm test
npm run check
```

El test suite comprueba reglas de turno, catálogo, Hipergamia, Token pirata, Beca MEC, Perry, Pereira, quesos y Cáncer/Quimio. Los tests no sustituyen las pruebas visuales y multijugador.

## Roadmap

1. Probar partidas completas, revisar balance y corregir bugs.
2. Exportar artes individuales permanentes desde Canva y conectarlos a las cartas.
3. Ampliar la colección y crear audio, animaciones y sinergias absurdas.
4. Implementar multijugador online con servidor autoritativo y salas privadas.

**Advertencia de propiedad intelectual:** hay nombres y referencias a personajes de terceros. Antes de distribuir comercialmente el juego convendría revisar licencias y sustituir diseños protegidos si procede.
