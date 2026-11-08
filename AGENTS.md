# AGENTS.md — Barbaridades (fuente de contexto para IA/Codex)

> **Leed este archivo ANTES de planificar, diseñar, programar, generar arte o fusionar cambios.**
> Archivo operativo vivo. Actualizarlo al terminar **cada** investigación, decisión de diseño o parche. No inferir características a partir de mockups: comprobar código, pruebas y despliegue.

## 0. Resumen ejecutivo — qué proyecto es este

- **Nombre del juego: BARBARIDADES**. Juego web de cartas 1v1 por turnos, humor deliberadamente absurdo/memes con **estrategia real**, cartas permanentes de campo y hechizos/efectos. No es un tower defense, ya no es *Forge Build Fight*: ese era un concepto anterior abandonado; el nombre del repositorio es un legado.
- **Repositorio:** `papimatcoding/forge-build-fight`, rama estable `main`.
- **Despliegue de demostración (NO es prueba de que esté funcionando):** https://papimatcoding.github.io/forge-build-fight/
- **Objetivo de la Serie I:** **16 cartas** precisas, visuales entretenidos, jugables contra CPU, 1v1 local y P2P experimental. Primeras partidas rápidas, rejugables, con combos ridículos.
- **Filosofía del propietario:** priorizar entretenimiento, humor surrealista (y humor negro si corresponde), fidelidad a los memes, interfaz trabajada y **no vender prototipos simples como juegos terminados**. No inventar poderes o costes en Canva. No realizar grandes cambios de reglas o balance sin justificación y aprobación.
- **Preferencia de colaboración:** ejecutar tareas en el repositorio cuando el usuario lo pide; dar respuestas claras y concisas con **estado real, enlaces verificables, fallos y pendientes**, sin presentar mockups generados como capturas de la app.
- **Este documento es contexto, no código:** validar cualquier afirmación de implementación con los archivos y tests más recientes. No confundir material propuesto con material desplegado.

## 1. Reglas confirmadas e invariantes

1. **Tablero A:** cuatro carriles enfrentados (no tablero de posiciones libres). Cada jugador puede ocupar una criatura por carril; criaturas atacan a la enemiga de enfrente, o a la balanza directamente si ese carril está vacío.
2. **Turnos alternos estrictos:** jugador 1 hace lo que quiera con la energía → acaba turno; jugador 2 hace lo mismo → acaba turno. **Únicamente las criaturas del jugador que termina su propio turno atacan**. No hay intercambio simultáneo ni contraataque por defecto.
3. **Excepción de apertura:** **los dos primeros turnos globales** son de preparación; no hay ataque. A partir del tercer turno, sí hay ataques después de cada turno activo. No cambiarlo para que ataque el defensor ni introducir ataque al final del primer turno.
4. **Energía:** cada jugador recibe **3 energía al comenzar cada turno suyo**. Energía no gastada se acumula hasta un máximo actual de 10. Cartas y pasivas pueden dar energía adicional. El coste de juego se paga al colocar o lanzar la carta.
5. **Robo:** completamente aleatorio e independiente (con duplicados); 1 carta por turno propio; 4 iniciales y 1 robo del turno de apertura en el prototipo. No garantizar robos favorables ni simular mazo finito salvo decisión futura.
6. **Victoria:** balanza estilo *Inscryption*, por diferencia de **5 puntos** mediante ataques a carriles sin defensor.
7. **Dos categorías:** criaturas con ATQ/vida/coste/efectos y hechizos que se juegan y producen acciones inmediatas o diferidas.
8. **Contraataque:** solo para poderes explícitos como la venganza con las **paletas** de Pereira.
9. Estos valores son **reglas de la versión actual**; futuros parches pueden balancearse, pero deben actualizar tests + documentación + UI + arte coherentemente.

## 2. Serie I — especificaciones CANÓNICAS de las 16 cartas

**ÚNICA FUENTE DE VERDAD EN EJECUCIÓN: `cards.js` y el comportamiento en `game.js`.**
Las fichas de Canva antiguas muestran costes y habilidades incorrectos que **no se implementaron**. No copiarlas al juego. Las imágenes PNG locales están **recortadas al arte central** para impedir que los textos inventados de Canva aparezcan en la UI. Las etiquetas, costes, valores, estado, tipo y descripción deben renderizarse **desde los datos del juego**, no desde el bitmap.

| ID | Nombre exacto | Tipo | Coste | ATQ/vida | Efecto real |
|---|---|---|---:|---:|---|
| `duck` | Pato metralleta | Campo | 4 | 3/2 | Tres disparos separados de 1 daño. |
| `grandma` | Abuela con chancla | Campo | 3 | 2/4 | Primer chanclazo contra criatura +2 daño. |
| `sahur` | Tung Tung Tung Sahur | Campo | 5 | 4/3 | Aturde al enemigo enfrentado al entrar: pierde su próximo ataque. |
| `trancas` | Trancas y Barrancas | Campo | 4 | 2/3 | Tras atacar, 1 daño a criaturas enemigas de los carriles vecinos. |
| `pereira` | Pereira Castor | Campo | 2 | 2/2 | Al morir inflige 2 de daño a la unidad rival enfrente **CON SUS PALETAS**. |
| `cancer` | Cáncer | Efecto | 4 | — | Infecta una criatura enemiga, muere tras 3 finales de turno **de su dueño**, salvo Quimio. |
| `chemo` | Quimio | Efecto | 2 | — | Elimina Cáncer de criatura aliada y le provoca 1 daño. |
| `taxoffice` | Agencia Tributaria | Efecto | 4 | — | Confisca hasta 2 energía rival; te concede 1 energía (respeta límite 10). |
| `inspector` | Inspector Hacienda | Campo | 3 | 1/5 | Mientras viva, las cartas enemigas de coste base ≥4 cuestan +1. |
| `raul` | **Raúl Becas y Ayudas** | Campo | **2** | **1/3** | **«Beca MEC» ES EL NOMBRE DE LA HABILIDAD**, NO EL NOMBRE DE LA CARTA. Al comienzo de CADA turno propio, +1 energía mientras viva (máximo 10). |
| `sixseven` | Sixseven | Efecto | 6 | — | Efecto aleatorio: 6 daño a una criatura enemiga aleatoria o +7 energía. |
| `piratetoken` | Token pirata de Fortnite | Efecto | 3 | — | **Todas** las cartas restantes del jugador activo cuestan **0** durante ESE turno; no solo la próxima carta. |
| `perry` | Perry el ornitorrinco | Campo | 4 | 2/3 ↔ 4/2 | **Con gorro**: 2/3, escudo que bloquea un efecto perjudicial. **Sin gorro**: 4/2 sin escudo. Cambia al comenzar cada turno **de su dueño**, no cada turno global. |
| `hyper` | Hipergamia | Efecto | 3 | — | Selecciona UNA criatura rival: las cartas aliadas concentrarán en ella su **próxima fase de ataque** (sin anotar daño directo de otros carriles en esa fase). |
| `steve` | Steve (Minecraft) | Campo | 4 | 3/5 | Al entrar coloca un Bloque de tierra 0/3 en un carril aliado libre, si existe. |
| `cow` | La vaca que ríe | Campo | 3 | 1/5 | Después de atacar, **da quesos** curativos a los dos aliados adyacentes: +1 vida a cada uno, sin superar vida máxima. |

**Ojo con contradicciones de Canva antiguas:** sus textos daban a Cáncer coste 7, Quimio coste 4 y curación de 3, Agencia Tributaria coste 8, Raúl coste 3 y una habilidad de buscar cartas, Token coste 5 y efecto solo una carta, etc. Esas cifras son **inventadas en el diseño, no autorizadas**. Nunca intentar implementarlas para «sincronizar» la mecánica: se corrige el texto del diseño cuando sea posible. En el juego prevalecen los valores de arriba.

## 3. Referencias visuales y memes: hallazgos y decisiones

- **Pato metralleta:** pato de goma amarillo claramente reconocible sosteniendo una metralleta desproporcionada.
- **Abuela con chancla:** abuela con ropa de casa española y la chancla como arma, no reina hechicera genérica.
- **Tung Tung Tung Sahur:** criatura surrealista de madera, palo/garrote y contexto del meme *brainrot* asociado a despertarse para sahur; no confundir con simple tronco con ojos sin identidad.
- **Trancas y Barrancas:** dos hormigas/mascotas de programa de televisión, distinguibles y juntas; NO dos humanos ni soldados aleatorios. Derechos de terceros: revisar antes de lanzamiento público/comercial.
- **Pereira Castor:** referencia del usuario a creador/meme castor; rasgo clave son las **paletas (incisivos)** y el contraataque. Si la identificación exacta de un meme es ambigua, no inventar identidad.
- **Cáncer / Quimio:** humor negro autorizado por dirección creativa; ilustración no gráfica, infección/cuenta atrás y antídoto con coste narrativo. Evitar hacer afirmaciones médicas falsas como si fueran consejos.
- **Agencia Tributaria / Inspector Hacienda:** burocracia española intimidante, cartas separadas con habilidades separadas; no cambiar el nombre de la Agencia por una criatura.
- **Raúl Becas y Ayudas:** usuario aportó una **fotografía de referencia** en conversación el 8/11/2026. El personaje de la foto tiene pelo oscuro corto, barba corta y gafas rectangulares oscuras; aparece con traje negro, camisa blanca, corbata negra y banda azul celeste de graduación. **El arte anterior generado de joven genérico sin gafas es incorrecto.** El original está en el chat, no se debe asumir que una imagen de muestra/montaje de IA es captura del juego. La foto se subió como referencia privada a Canva: asset `MAHaV6itm48`. Verificar derechos/consentimiento antes de publicar la fotografía íntegra en repositorio abierto; preferir ilustración original basada en rasgos visibles con permiso correspondiente. Su efecto se llama **Beca MEC**, no renombrar la carta.
- **Sixseven:** «6–7» con gesto de manos/palmas balanceadas, referencia de meme; no es simplemente una pareja de cifras aleatorias.
- **Token pirata de Fortnite:** botín/token pirata y gratuidad de **todo el turno**; no mostrarlo como mero robo de mano. Los logotipos y arte de Fortnite no son de este proyecto.
- **Perry el ornitorrinco:** protagonista reconocible por ser ornitorrinco turquesa; dos formas con gorro de agente/sin gorro. No inventar que es una nutria.
- **Hipergamia:** ataque dirigido a un único objetivo enemigo, no aumento de estadísticas ni hechizo que crea monedas.
- **Steve (Minecraft):** silueta voxel/pixelada, pico y bloque construido; no utilizar marca oficial ni screenshots como recursos finales sin licencia.
- **La vaca que ríe:** vaca feliz con porciones de queso; el queso CURA a vecinos, no genera economía.
- En general **memes y marcas de terceros**: distinguir fan-art para pruebas de activos con derechos para publicar/comercializar. Si algún meme es nuevo/ambiguo, buscar fuentes externas fiables y documentarlas antes de inventar.

## 4. Arquitectura y estructura real

| Ruta | Función |
|---|---|
| `index.html` | Marco de UI; arena, barra de mano, escala, modales. |
| `styles.css` | Diseño responsivo, cartas negro/dorado/pergamino y capa de imágenes de arte. |
| `cards.js` | Reglas básicas, catálogo de 16, IDs de página Canva y rutas PNG; **datos canónicos**. |
| `game.js` | Estado, turnos, robos, habilidades, ataques, log, render, modos CPU/local/P2P. |
| `remote.js` | Protocolo WebRTC DataChannel y códigos SDP manuales, secuencias de acciones. |
| `assets/cards/<id>.png` | **Arte central recortado**, imagen utilizada en cada carta; no contiene las reglas. |
| `assets/cards/<id>-256.png` | Variante ligera del arte. |
| `assets/cards/<id>-full.png` | Página de Canva de referencia, **contiene texto desactualizado**: NO usar como carta en juego. |
| `tests/engine.test.mjs` | Tests de turnos y habilidades, incluyendo seguridad básica de mano oculta. |
| `tests/remote.test.mjs` | Pruebas de codificación SDP y formato de acciones remotas. |
| `.github/workflows/pages.yml` | Despliegue GitHub Pages al actualizar main. |
| `.github/workflows/tests.yml` | Sintaxis, tests de juego y comprobación de presencia de las 16 ilustraciones (3 variantes). |
| `.github/workflows/import-canva.yml` | Importador histórico de previews: **no confundir con exportación nativa HD**. |
| `scripts/import_canva_previews.py` y `scripts/canva_preview_sources.json` | Importación de una sola vez desde URLs firmadas temporales. Caducan; no son dependencia runtime. |
| `README.md` | Instrucciones de uso para jugadores/desarrolladores. |
| `AGENTS.md` | Este contrato operativo y registro de conocimiento para siguientes agentes. |

No modificar solamente la imagen de Canva si el juego no usa ese recurso. Para visualizar cambios en el juego hay que actualizar el PNG correspondiente y verificar que se carga por la ruta real desde Pages. **No vincular miniaturas remotas de Canva como recursos de producción**: tienen URL firmada que expira.

## 5. P2P y seguridad — qué existe, qué NO

- **Estado actual:** modo experimental WebRTC DataChannel con **intercambio manual de oferta/respuesta SDP** (texto largo). No hay lobby por código corto. Funciona sobre hosting estático si los dos navegadores consiguen establecer conexión.
- **Autoridad:** anfitrión jugador 1 mantiene el estado completo, decide RNG, valida comandos `play/end` de jugador 2. No es anti-cheat; el anfitrión conoce todo el estado. **Nunca afirmar que los dos jugadores tienen protección idéntica contra trampas**.
- **Privacidad de cartas:** el estado enviado al invitado oculta la mano del anfitrión (IDs y nombres). La del invitado sí se envía al invitado. No revertir esta restricción al refactorizar.
- **Red:** STUN, **sin TURN ni servidor de señalización**: algunas combinaciones NAT/red móvil/VPN no conectarán. Los códigos pueden contener datos de red; compartir solo entre amigos. No afirmar «P2P completamente probado» sin test real entre dos dispositivos físicos.
- **Manejo de desconexiones:** reconexión automática y recuperación de partida NO implementadas. Actualmente la partida se detiene en desconexiones.
- **Cambios requeridos en futuras iteraciones:** sincronizar secuencias, comprobar integridad de estado, manejo robusto de ACK/reintentos, reconexión opcional/TURN, mejores mensajes de error, tests con dos navegadores separados. Priorizar fiabilidad antes de estética de un lobby.

## 6. Cómo desarrollar y validar

1. **Leer** `AGENTS.md`, `README.md`, `cards.js`, `game.js` y los tests; revisar estado de `main`, issues/PR y Actions antes de tocar ramas.
2. Antes de cambiar una carta, apuntar **nombre exacto, tipo, coste, ATQ/vida, selector, duración, momento del disparo, contracarta**, y qué pasa en condiciones límite.
3. Cambiar **`cards.js` y/o `game.js`**, añadir/regresar un test, actualizar copy HTML y arte solo si es necesario; mantener el nombre de habilidad **Beca MEC** y el de carta **Raúl Becas y Ayudas**.
4. Ejecutar **`npm run check`**, **`npm test`** y verificar workflow `Verify Barbaridades engine and art`. Revisar que hay **16 ilustraciones PNG reales** en `assets/cards` en la rama objetivo.
5. Probar en navegador con servidor estático (`python3 -m http.server 8000`). Revisar móvil, textos largos, botones, render de cartas y contraste. Especialmente P2P, que requiere dos navegadores/dispositivos.
6. Actualizar **`README.md`**, este **`AGENTS.md`** y el registro de investigación (sección 7) con cualquier cambio aprobado.
7. PR → checks verdes → merge seguro en `main` → confirmar Actions `Deploy Barbaridades to GitHub Pages`. No confundir merge con despliegue real; comprobar URL al terminar.
8. Si falta una herramienta o falla una exportación, **declararlo**; no afirmar que una vista generada por IA es el juego funcionando.
9. No publicar archivos con información personal/sensible de usuarios o referencias fotográficas de terceros sin permisos claros. Nunca subir fotos de referencia originales sin necesidad.

## 7. Registro vivo de investigación y decisiones

Formato obligatorio para nuevas entradas: **fecha — tema — fuentes verificables — hallazgo — cambio efectuado (archivo/commit) — pendiente**. No dejar investigación en memoria implícita del chat.

- **2026-11-04 aprox.:** surgió el concepto estratégico/absurdo con inspiración *Munchkin* (humor), *Clash Royale* (energía) e *Inscryption* (carriles/balanza), pero **por turnos, no energía continua**.
- **2026-11-08 — identidad y motor:** se abandona el tower defense previo y se formula **Barbaridades**, 16 cartas; `main` tenía v0.2 y el desarrollo v0.3 se concentró en `feature/serie-i-real-art-p2p`.
- **2026-11-08 — cartas corregidas por propietario:** «Raúl Becas y Ayudas» es carta; «Beca MEC» es habilidad. Pereira/«paletas»; Hipergamia focaliza todos los ataques; Token pirata hace gratis TODAS las cartas el resto del turno; Perry alterna gorro; La vaca reparte quesos. **Estos nombres y efectos tienen prioridad sobre texto generado por Canva.**
- **2026-11-08 — Canva:** álbum editable de 16 ilustraciones https://www.canva.com/d/fEFpe7VMr09hhNH, carpeta https://www.canva.com/folder/FAHaVurOQPc. Se detectó que la generación de Canva **inventó muchas habilidades y costes distintos**. Se importaron sus imágenes mediante Canva→previsualizaciones→PNG permanentes en GitHub, se recortó la ilustración central y la UI del juego renderiza todo el texto desde `cards.js`. **El material de Canva como documento aún requiere sincronización textual**; no usar `-full.png` para mostrar costes/efectos.
- **2026-11-08 — referencias Raúl:** la foto de referencia de graduación aportada por el usuario no corresponde a la ilustración anterior de Canva; hay que sustituir **solo** el arte de esta carta, conservando un aspecto fiel a la foto y los derechos correspondientes. Canva asset de referencia `MAHaV6itm48`. No afirmar corregido en el juego sin actualizar `assets/cards/raul.png` de forma verificable.
- **2026-11-08 — pruebas P2P:** tests automáticos de protocolo y motor pasaron, y la importación de PNG tuvo éxito en Actions de la rama. **Falta prueba real con dos dispositivos y revisar resultados de despliegue main.**
- **Hito posterior:** cuando se corrijan los textos del álbum editado en Canva, comprobar individualmente las 16 fichas contra `cards.js` con lectura de texto y revisión visual; registrar enlace y fecha. Mantener ilustraciones existentes que gusten, salvo la de Raúl.

## 8. Lista de tareas siguientes (sin confundir con tareas completadas)

- [ ] Sustituir arte **Raúl Becas y Ayudas** mediante ilustración fiel a la foto aportada, con permiso de uso; actualizar `assets/cards/raul.png` y versión móvil (no retocar las otras 15 sin necesidad).
- [ ] Revisar/actualizar **los textos de Canva** en sus dos ediciones (presentación y vertical) para que costes/efectos coincidan con `cards.js`, sin regenerar las 16 ilustraciones.
- [ ] Prueba visual en navegador de móvil y escritorio tras deploy y test real P2P de dos dispositivos.
- [ ] Equilibrio y mejora de UX; a futuro signaling/TURN si el P2P manual da problemas.
- [ ] En cada parche, añadir nuevas fuentes/resultados a la sección 7 de este archivo.

## 9. Reglas para el agente

- No pedir al propietario repetir las **reglas ya documentadas aquí**.
- No rebautizar cartas ni inventar mecánicas sin indicación; no cambiar el estilo general por mockup conceptual.
- Ser prudente con referencias virales difíciles de verificar: anotar incertidumbre en lugar de inventar hechos, y diferenciar humor de afirmaciones factuales.
- Nunca atribuir a una prueba automatizada la validación de diseño visual o conexiones reales; indicar qué se probó realmente.
- Entregar cambios **en el repositorio**, no solo en la conversación; comprobar estado de `main` y Pages.
- Tras cualquier investigación, **añadir lo aprendido a esta sección** con fuentes, fecha e implicación sobre el juego.


## 10. Parche 0.4 — pantalla única y reparto de cartas (08/11/2026)

**Requisito confirmado por el propietario:** la partida (tablero de cuatro carriles, mano, energía, balanza y botón «Acabar turno») debe ser jugable **dentro del alto de una sola pantalla**, sin scroll vertical de página. Se prefiere **móvil vertical / escritorio horizontal**, pero también hay un modo compacto para móviles horizontales; la interfaz debe responder al tamaño del viewport y no depender de mockups.

- Estilos nuevos en `screen.css`, cargados **después** de `styles.css`: `height:100dvh`, estructura con CSS grid y filas `minmax(0,1fr)`, ocultación de paneles secundarios, balanza compacta visible en móvil y mano de cartas distribuida tipo abanico con posiciones porcentuales. Todas las interacciones críticas siguen visibles.
- La **mano inicial es exactamente 3 cartas por jugador**, no 5: `RULES.startingHand=3`; el primer turno propio de cada jugador no añade una cuarta carta. **Desde su segundo turno propio** se roba una carta aleatoria; +3 energía se mantiene al inicio de cada turno. No confundir mano inicial de 3 con mano de 3 más robo de apertura.
- Al mostrarse por primera vez una carta en mano, `game.js` añade la clase `is-dealt` para una animación `card-deal` con retardo escalonado, incluida la mano inicial. Las UID ya vistas se registran por jugador y partida para impedir reanimaciones al seleccionar un objetivo o volver a pintar la UI.
- **1v1 local:** la pantalla «Pasa el dispositivo» debe aparecer antes de mostrar/animar la mano del siguiente jugador; animar cuando este confirme que está listo. **P2P:** nunca dejar escapar cartas ocultas del adversario para hacer animaciones.
- Accesibilidad: respetar `prefers-reduced-motion` y conservar `aria-label` con el efecto completo. Si la mano alcanza 9 cartas puede mostrarse solapada; sigue siendo obligatorio que cada carta tenga una región táctil y se pueda seleccionar.
- Los modales de reglas, colección y conexión P2P pueden desplazarse **dentro del modal**, pero el campo principal no debe requerir scroll de página. Verificar en varios tamaños de pantalla y con zoom/ajustes de texto cuando sea viable.
- Validación requerida: `npm run check`, `npm test`, `CI` y, de ser posible, pruebas de navegador con viewports representativos (320×568, 390×844, 844×390, 1366×768). **Los tests de Node no demuestran por sí solos que una interfaz quepa visualmente**.
- Registrar en cada parche si el nuevo CSS se ha incluido correctamente en `.github/workflows/pages.yml`; si no se publica `screen.css`, el resultado no se verá en Pages.
- No restaurar un HUD antiguo con columnas extra que fuerce scroll. Futuros gráficos y animaciones deben respetar presupuesto de viewport.


## 11. Parche 0.5 — el tablero debe ser jugable tras colocar cartas (08/11/2026)

- **Incidencia reproducida visualmente por el usuario:** screenshot Android 345 px aprox.: tras jugar una criatura, el retrato de la carta se mostraba como una tira horizontal, con el resto del cuerpo vacío; la mano quedaba cortada y el botón «Acabar turno» se superponía a las cartas. El pie de página aparecía aun estando oculto por una regla `.footer` porque el HTML empleaba una etiqueta `<footer>` sin esa clase.
- **Solución de código, NO mockup:** `arena.css` cargado al final, corrige específicamente la maquetación con `display:grid` real para las cartas de campo y mano, y distribuye *cabecera / ilustración / estadísticas* en filas que reservan el espacio disponible. Se usa `object-fit: contain` para mostrar las 16 imágenes recortadas de Canva sin cortarlas.
- Se crea **un activo real de tablero**, `assets/board/arena.svg`, fondo decorativo azul oscuro con madera y marcos dorados; se asigna mediante CSS a `.board` y queda debajo de los carriles interactivos. **No es una captura estática con botones falsos.** El tablero y todos sus carriles, botones y cartas siguen siendo DOM y permiten interacción.
- `.shell > footer{display:none}` evita el pie de página que ocupaba espacio en el móvil; la mano conserva altura y el botón de finalizar tiene su propia fila invariable, sin quedar tapado por cartas.
- `.github/workflows/pages.yml` debe publicar **`arena.css` y `assets/board/arena.svg`** además de cartas y JS; de lo contrario el parche no estará desplegado aunque main tenga los cambios.
- **Regresión de navegador** `tests/play-field.browser.mjs`: abre 5 viewports, fuerza una mano con Abuela (coste 3), coloca una carta en el campo, comprueba PNG cargado y `object-fit: contain`, altura real del arte, visibilidad y clic del botón «Acabar turno», tres cartas iniciales, ausencia de scroll y que el SVG de fondo se sirva correctamente. `tests/layout.browser.mjs` sigue comprobando turnos y tamaños.
- **Pruebas críticas:** NO considerar «arreglado» si solo pasan pruebas de mano vacía. Ejecutar una partida real, jugar una criatura y comprobar su ilustración y el botón en un móvil estrecho. Guardar capturas de navegador de CI al depurar.
- **Limitación:** el fondo SVG es deliberadamente genérico para no reemplazar los memes ni introducir reglas ficticias; los PNG y estadísticas de las cartas siguen definidos exclusivamente por `cards.js` y `game.js`.


## 12. Parche 0.6 — P2P con códigos y turnos verificados (08/11/2026)

**Queja directa del propietario:** el flujo anterior exigía copiar y pegar ofertas/respuestas SDP enormes; no era apto para jugar con amigos. También había errores de autoridad y sincronización de turnos.

- **Decisión de producto:** habitaciones de **6 caracteres** sin ambiguos I/O/0/1. Host muestra código y enlace; invitado introduce código. URL con parámetro `?room=ABC234` precompleta la sala. Ya no se muestran textos SDP gigantes.
- **Tecnología elegida:** `room.js`, PeerJS 1.5.5 cargado de CDN con servicio gratuito `0.peerjs.com` para señalización automática; transporte de jugadas en DataChannel WebRTC cifrado. Referencias verificables: https://peerjs.com/client/api/peer , https://peerjs.com/server/cloud , https://www.jsdelivr.com/package/npm/peerjs . **NO** prometer disponibilidad profesional del servidor público, conexión universal sin TURN ni privacidad de IP frente a pares.
- **Inicio de sesión:** anfitrión espera conexión real, invitado envía `{type:'hello', protocol:1}`, el anfitrión entonces crea el estado de la partida y envía el primer snapshot. El juego no debe empezar solo por crear la sala.
- **Autoridad de turnos crítica:** `endTurn(fromRemote)` acepta solo el booleano literal `true` como comando autenticado del invitado. El evento de clic DOM no debe pasarse como argumento: un `MouseEvent` es truthy y permitía saltarse comprobaciones del jugador activo. Local host J1 solo termina J1; comando invitado J2 solo termina J2. Nunca completar un turno por un snapshot.
- **Reglas invariables:** 3 cartas iniciales exactas, +3 energía al iniciar turno propio, robo aleatorio desde el segundo turno propio; dos turnos globales de preparación sin ataques; después solo atacan criaturas del jugador que termina el turno; cuatro carriles y balanza con victoria a +5.
- **Mensajería:** invitado envía comandos ordenados `{type:'command',seq,action}`; host verifica UID de carta, energía, objetivo, carriles y turno antes de aplicarlos. Snapshots públicos con `version`, `ackSeq`, estado y mano de J1 redactada. Una jugada inválida recibe rechazo y snapshot; cliente solo habilita nuevos movimientos cuando llega ACK de su secuencia. Watchdog de 12 s si no hay respuesta.
- **Tests mínimos en futuros parches:** dos instancias de `RoomPeer` con red simulada, creación/unión por código, handshake y mensajes; host no puede terminar turno J2; J2 no termina turno J1; comandos duplicados no avanzan turnos; ataque turno3 solo de J1 y turno4 solo de J2; robos/energía/estados y mano oculta en la red. Mantener pruebas Playwright visuales y publicar `room.js` en Pages.
- **Limitaciones abiertas:** TURN inexistente, reconexión pendiente, servicio público compartido y posible indisponibilidad, reglas no resistentes a trampa del host, falta ensayo con dos teléfonos reales en redes distintas. Referencias no autorizan reclamar que la conexión es universal ni que pruebas unitarias sustituyen test de internet.
- **Fuente de verdad:** `room.js` para enlace P2P; `game.js` para orden/autoridad de turnos; `cards.js` para cartas y energía. `remote.js` es un legado que **no debe reintroducirse en el flujo activo**.
