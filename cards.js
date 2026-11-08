// Serie I · Archivo de diseño fuente: Canva (URL y páginas enlazadas abajo).
// No se incrustan URLs de miniaturas de Canva porque caducan; las cartas tienen arte local SVG/CSS.
// CANVA_SERIES_I_URL se actualizará al terminar el álbum.
export const CANVA_SERIES_I_URL = "";
export const RULES = {
  lanes:4,
  startingHand:4,
  drawPerTurn:1,
  energyPerTurn:3,
  maxEnergy:10,
  maxHand:9,
  victoryLead:5,
  openingTurnsWithoutAttack:2,
};
export const CARDS=[
  {id:"duck",name:"Pato metralleta",type:"unit",cost:4,attack:3,health:2,kind:"mutante",icon:"🦆",hue:40,effect:"triple",text:"Dispara tres veces con 1 de daño por disparo."},
  {id:"grandma",name:"Abuela con chancla",type:"unit",cost:3,attack:2,health:4,kind:"leyenda urbana",icon:"👵",hue:20,effect:"slipper",text:"Su primer chanclazo inflige +2 de daño a una criatura."},
  {id:"sahur",name:"Tung Tung Tung Sahur",type:"unit",cost:5,attack:4,health:3,kind:"brainrot",icon:"🪵",hue:24,effect:"stun",text:"Al entrar, aturde al rival de enfrente durante su próximo ataque."},
  {id:"trancas",name:"Trancas y Barrancas",type:"unit",cost:4,attack:2,health:3,kind:"dúo",icon:"🐜",hue:295,effect:"splash",text:"Al atacar, hace además 1 de daño a cada criatura enemiga vecina."},
  {id:"pereira",name:"Pereira Castor",type:"unit",cost:2,attack:2,health:2,kind:"streamer",icon:"🦫",hue:32,effect:"revenge",text:"Cuando muere, inflige 2 de daño a la criatura que tenga enfrente."},
  {id:"cancer",name:"Cáncer",type:"spell",cost:4,kind:"maleficio",icon:"🦠",hue:340,effect:"cancer",target:"enemy",text:"Marca una criatura enemiga. Muere tras 3 turnos propios si no recibe Quimio."},
  {id:"chemo",name:"Quimio",type:"spell",cost:2,kind:"remedio",icon:"💉",hue:182,effect:"chemo",target:"friendCancer",text:"Elimina Cáncer de una criatura aliada. Le causa 1 de daño."},
  {id:"taxoffice",name:"Agencia Tributaria",type:"spell",cost:4,kind:"pesadilla",icon:"🏦",hue:11,effect:"taxoffice",text:"Confisca hasta 2 de energía rival y te entrega 1 de energía."},
  {id:"inspector",name:"Inspector Hacienda",type:"unit",cost:3,attack:1,health:5,kind:"funcionario",icon:"🕵️",hue:10,effect:"inspector",text:"Mientras viva, jugar cartas de coste 4 o más cuesta +1 al rival."},
  {id:"raul",name:"Raúl Becas y Ayudas",type:"unit",cost:2,attack:1,health:3,kind:"orientador",icon:"📚",hue:197,effect:"grant",text:"Al comienzo de tus turnos, obtienes +1 de energía."},
  {id:"sixseven",name:"Sixseven",type:"spell",cost:6,kind:"brainrot",icon:"6️⃣",hue:270,effect:"sixseven",text:"Lanza el destino: 6 de daño a una criatura aleatoria enemiga o +7 de energía."},
  {id:"piratetoken",name:"Token pirata de Fortnite",type:"spell",cost:3,kind:"botín",icon:"🪙",hue:43,effect:"pirate",text:"Roba una carta aleatoria de la mano enemiga. La carta pasa a tu mano."},
  {id:"perry",name:"Perry el ornitorrinco",type:"unit",cost:4,attack:2,health:3,kind:"agente secreto",icon:"🦦",hue:172,effect:"agent",text:"Al entrar, bloquea el próximo efecto enemigo que perjudique a tu equipo."},
  {id:"hyper",name:"Hipergamia",type:"spell",cost:3,kind:"mejora",icon:"💍",hue:318,effect:"hyper",target:"friend",text:"Una criatura aliada gana +2 ataque y +2 vida si un rival tiene más ataque."},
  {id:"steve",name:"Steve (Minecraft)",type:"unit",cost:4,attack:3,health:5,kind:"constructor",icon:"⛏️",hue:145,effect:"block",text:"Al entrar, crea un Bloque de tierra 0/3 en un carril aliado libre."},
  {id:"cow",name:"La vaca que ríe",type:"unit",cost:3,attack:1,health:5,kind:"lácteo",icon:"🐄",hue:355,effect:"heal",text:"Después de atacar, cura 1 vida a cada criatura aliada vecina."}
].map((card,index)=>({...card,series:"I",canvaPage:index+1}));
export const CARDS_BY_ID=Object.fromEntries(CARDS.map(card=>[card.id,card]));
export const BLOCK={id:"block",name:"Bloque de tierra",type:"unit",cost:0,attack:0,health:3,kind:"construcción",icon:"🟫",hue:31,effect:"none",text:"Un bloque que ocupa espacio. Steve se cree arquitecto.",series:"I",canvaPage:16};
