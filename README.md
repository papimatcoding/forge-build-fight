# BARBARIDADES — Serie I · 0.6

Juego web de estrategia por turnos con 16 cartas absurdas, cuatro carriles y victoria por balanza. Sustituye definitivamente el viejo prototipo **Forge Build Fight**.

**Jugar**: https://papimatcoding.github.io/forge-build-fight/

**Canva (versión investigada):** https://www.canva.com/d/fEFpe7VMr09hhNH  
**Carpeta de trabajo:** https://www.canva.com/folder/FAHaVurOQPc

## Reglas

- Los jugadores comparten una arena con **4 carriles enfrentados**.
- Al comienzo de cada turno propio: **+3 energía**. Cada jugador empieza con **3 cartas exactas**; desde su segundo turno propio roba **una carta aleatoria** (también salen repetidas). La energía se acumula hasta 10.
- Juegas cuantas cartas y efectos quieras pagando la energía.
- Los **dos primeros turnos globales** no tienen fase de ataque.
- Desde el tercer turno, al pulsar *Acabar turno*, **solo atacan las criaturas del jugador activo**, de carril a carril. Si no hay carta rival enfrente, anota directamente en la balanza.
- Gana quien alcanza una ventaja de **5 puntos**.
- Las criaturas defensoras no contraatacan al ser golpeadas salvo habilidades específicas, como las paletas de Pereira.

## Modos

### 1v1 online entre dos dispositivos — salas de 6 caracteres (experimental)

**Ya no hay que copiar ofertas SDP enormes.** Las conexiones se negocian con PeerJS Cloud (servidor público de señalización) y los comandos del duelo viajan en un WebRTC DataChannel cifrado, de dispositivo a dispositivo.

**Para jugar:**
1. Los dos jugadores abren https://papimatcoding.github.io/forge-build-fight/ y pulsan **Online · Sala con código**.
2. Jugador 1 pulsa **Crear sala**. Aparece un código de seis caracteres, por ejemplo `ABC234`, que puede copiar o compartir mediante enlace.
3. Jugador 2 pulsa **Unirse con código**, escribe esas seis letras y pulsa **Conectar**. El enlace de invitación también precompleta el código.
4. Se conecta automáticamente y comienza una partida nueva con 3 cartas por jugador. El anfitrión es jugador 1, el invitado jugador 2.

**Turnos autoritativos:** J1 ejecuta el estado del juego y los robos aleatorios. Cada turno termina solo si el propietario correspondiente lo solicita: J1 desde su interfaz local, J2 enviando un comando validado con secuencia monotonamente creciente. Los estados contienen versión y ACK; una jugada inválida no cambia energía, tablero ni turno. La mano oculta del anfitrión nunca viaja al invitado, aunque el anfitrión sí mantiene en memoria la mano del invitado.

**Secuencia exacta:** turno 1 J1 juega, no hay ataque → turno 2 J2 juega, no hay ataque → turno 3 J1 juega y atacan únicamente sus criaturas → turno 4 J2 juega y atacan únicamente sus criaturas. Desde ahí siempre ataca solo el dueño del turno que termina.

**Limitaciones:** PeerJS Cloud es un servicio público compartido, no un backend privado ni garantizado. El P2P depende de redes STUN/NAT; no disponemos de TURN, reconexión, ni prevención robusta de trampas del anfitrión. Algunas redes móviles, VPN o cortafuegos pueden impedir la conexión. El servicio externo de PeerJS debe estar disponible; GitHub Pages solo aloja el juego. Los dos dispositivos pueden conocer sus IP durante WebRTC. **La negociación de sala y la secuencia del motor se prueban automáticamente con un simulador, pero todavía no se ha certificado una conexión real entre dos teléfonos en redes diferentes.**

### 1v1 local

Dos personas se turnan con el mismo dispositivo. Hay una pantalla de paso para ocultar temporalmente la mano del siguiente jugador.

### Contra CPU

Rival básico no competitivo, útil para probar cartas.

## Cartas y arte

`cards.js` es la fuente de verdad de nombres, costes, estadísticas, efectos y vínculos con Canva. La Serie I contiene 16 cartas. **Raúl Becas y Ayudas** es el nombre de la carta; **Beca MEC** es su habilidad de +1 energía al comienzo de tus turnos. Otras mecánicas: Pereira contraataca con sus paletas, Hipergamia concentra el ataque, Token pirata deja el resto del turno sin coste, Perry alterna formas con gorro/sin gorro, La vaca que ríe regala quesos curativos.

Las ilustraciones de Canva se integran en `assets/cards/` como **PNG locales permanentes**, no como URLs temporales. Para que el texto dinámico del juego nunca contradiga las reglas, se recortó el *arte central* de los diseños (algunas leyendas generadas por Canva no coincidían exactamente con el balance). Cada carta dispone de `id.png` (ilustración 512×512), `id-256.png` y `id-full.png` (página Canva 512×704 a modo de referencia). El recorte se realizó a partir de previsualizaciones de Canva de 381×524, por lo que el archivo ampliado no equivale a exportación de alta resolución nativa.

**Arte y derechos:** se incluyen reinterpretaciones de memes, personajes y marcas ajenas. Antes de publicar comercialmente se deben revisar derechos de imagen, de marcas y de personajes (Disney, Minecraft, El Hormiguero, Fortnite, La vaca que ríe, creador Raúl). No es un producto oficial ni está afiliado a dichas entidades.

## Desarrollo

```bash
npm run check
npm test
python3 -m http.server 8000
```

Abrir después http://localhost:8000. Carga módulos ES; no sirve abrir `index.html` directamente como archivo local.

El contenido original se aloja en GitHub Pages con un workflow de Actions (`.github/workflows/pages.yml`). `scripts/import_canva_previews.py` es un importador de una sola ejecución; las URLs firmadas en `scripts/canva_preview_sources.json` caducan y no están pensadas como dependencia de producción. El juego ejecuta exclusivamente los PNG permanentes alojados junto al código.

## Próximas mejoras

- Playtests de balance y funcionamiento P2P en dos dispositivos y distintas redes.
- Exportación desde Canva del arte nativo a resolución alta y revisión visual individual.
- Reconexión, TURN opcional, servidor de señalización propio y pruebas reales en redes móviles.
- Desacoplar el motor de la UI, semilla auditada/compromiso de RNG para evitar la confianza ciega en el anfitrión.

## Interfaz y reparto (v0.4)

La partida emplea una disposición **de pantalla única**. El tablero de 4 carriles, las dos áreas de jugadores, la balanza, las cartas de la mano y los controles del turno encajan en `100dvh`, con diseños compactos en móvil vertical y horizontal, sin scroll de **página**. Las cartas de la mano se distribuyen en abanico cuando hay muchas y se pueden tocar para ver/seleccionar.

Cada jugador empieza con exactamente **3 cartas**; los robos de turnos posteriores y las cartas iniciales entran con una **animación escalonada**. Respetamos la opción de accesibilidad `prefers-reduced-motion`.

`screen.css` se carga después de `styles.css` y está incluido en el empaquetado de GitHub Pages. Los modales (reglas/colección/P2P) pueden desplazarse por separado si su contenido no cabe; la partida no debe necesitar desplazamiento vertical.

## Parche 0.6 — fiabilidad online

- `room.js`: códigos de 6 caracteres legibles; conexión WebRTC negociada por PeerJS Cloud; validación del formato de mensajes y secuencias.
- `game.js`: handshake `hello`, inicio simultáneo de partida, autoridad de turnos, comandos remotos validados, snapshots con `version` y `ackSeq`, watchdog de 12 segundos y avisos de desconexión.
- `remote.js`: implementación antigua de ofertas SDP, conservada solo para pruebas históricas; **el juego ya no la utiliza**.
- La interfaz de salas se encuentra en el modal principal; los estilos de móvil están en `arena.css`.
- Pruebas: `tests/room.test.mjs` y regresiones del motor; las pruebas visuales siguen en Actions.
