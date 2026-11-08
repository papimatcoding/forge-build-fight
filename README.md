# BARBARIDADES — Serie I · 0.4

Juego web de estrategia por turnos con 16 cartas absurdas, cuatro carriles y victoria por balanza. Sustituye definitivamente el viejo prototipo **Forge Build Fight**.

**Jugar**: https://papimatcoding.github.io/forge-build-fight/

**Canva (versión investigada):** https://www.canva.com/d/fEFpe7VMr09hhNH  
**Carpeta de trabajo:** https://www.canva.com/folder/FAHaVurOQPc

## Reglas

- Los jugadores comparten una arena con **4 carriles enfrentados**.
- Al comienzo de cada turno propio: **+3 energía** y **+1 carta aleatoria** (también salen repetidas). La energía se acumula hasta 10. La mano inicial son 3 cartas, sin robo extra en el primer turno.
- Juegas cuantas cartas y efectos quieras pagando la energía.
- Los **dos primeros turnos globales** no tienen fase de ataque.
- Desde el tercer turno, al pulsar *Acabar turno*, **solo atacan las criaturas del jugador activo**, de carril a carril. Si no hay carta rival enfrente, anota directamente en la balanza.
- Gana quien alcanza una ventaja de **5 puntos**.
- Las criaturas defensoras no contraatacan al ser golpeadas salvo habilidades específicas, como las paletas de Pereira.

## Modos

### 1v1 P2P entre dos dispositivos — experimental

WebRTC DataChannel con conexión directa y cifrada. El jugador que crea la sala (J1) es **anfitrión autoritativo**: ejecuta la lógica, los robos aleatorios y el estado verdadero. J2 solo recibe el estado público y su propia mano; nunca recibe los identificadores ni nombres de las cartas ocultas de J1. J1 técnicamente conserva el estado completo de la partida en su propio navegador; por tanto, **no es resistente a trampas del anfitrión**.

Pasos:
1. Los dos jugadores abren la página en sus dispositivos, eligen **1v1 · Dos dispositivos (P2P)**.
2. J1 pulsa **Crear sala**, copia la **oferta** que aparece y la envía al amigo por mensajería.
3. J2 pulsa **Unirse**, pega la oferta, pulsa **Generar respuesta**, copia la **respuesta** y la devuelve a J1.
4. J1 pega la respuesta y pulsa **Aplicar respuesta**. Si el canal WebRTC conecta, empieza la partida. Las acciones de J2 viajan como comandos con números de secuencia; J1 los valida y devuelve estados con la mano rival ocultada.

**Limitaciones importantes:** sin servidor de señalización ni TURN, la conexión depende del STUN público y de las redes NAT. En algunas conexiones móviles, VPN o redes corporativas no funcionará. No hay reconexión automática ni salas por código corto. Los pares pueden conocer sus IP por WebRTC; comparte las ofertas solo con amigos de confianza. No se ha verificado aún el funcionamiento entre dos dispositivos físicos.

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
- Reconexión, servidor TURN opcional y salas con código corto.
- Desacoplar el motor de la UI, semilla auditada/compromiso de RNG para evitar la confianza ciega en el anfitrión.

## Interfaz y reparto (v0.4)

La partida emplea una disposición **de pantalla única**. El tablero de 4 carriles, las dos áreas de jugadores, la balanza, las cartas de la mano y los controles del turno encajan en `100dvh`, con diseños compactos en móvil vertical y horizontal, sin scroll de **página**. Las cartas de la mano se distribuyen en abanico cuando hay muchas y se pueden tocar para ver/seleccionar.

Cada jugador empieza con exactamente **3 cartas**; los robos de turnos posteriores y las cartas iniciales entran con una **animación escalonada**. Respetamos la opción de accesibilidad `prefers-reduced-motion`.

`screen.css` se carga después de `styles.css` y está incluido en el empaquetado de GitHub Pages. Los modales (reglas/colección/P2P) pueden desplazarse por separado si su contenido no cabe; la partida no debe necesitar desplazamiento vertical.
