// Serie I · Archivo de diseño fuente: Canva (URL y páginas enlazadas abajo).
// No se incrustan miniaturas de Canva porque sus URLs temporales caducan.
// El código referencia el diseño permanente y cada carta guarda su número de página.
export const CANVA_SERIES_I_URL = "https://www.canva.com/d/fEFpe7VMr09hhNH";
export const CANVA_SERIES_I_DESIGN_ID = "DAHaVy260BU";
export const RULES = {
  lanes:4,
  startingHand:3,
  drawPerTurn:1,
  energyPerTurn:3,
  maxEnergy:10,
  maxHand:9,
  victoryLead:5,
  openingTurnsWithoutAttack:2,
};
export const SERIES_I=[
  {id:"duck",name:"Pato metralleta",type:"unit",cost:4,attack:3,health:2,kind:"mutante",icon:"🦆",hue:40,effect:"triple",text:"Dispara tres veces con 1 de daño por disparo."},
  {id:"grandma",name:"Abuela con chancla",type:"unit",cost:3,attack:2,health:4,kind:"leyenda urbana",icon:"👵",hue:20,effect:"slipper",text:"Su primer chanclazo inflige +2 de daño a una criatura."},
  {id:"sahur",name:"Tung Tung Tung Sahur",type:"unit",cost:5,attack:4,health:3,kind:"brainrot",icon:"🪵",hue:24,effect:"stun",text:"Al entrar, aturde al rival de enfrente durante su próximo ataque."},
  {id:"trancas",name:"Trancas y Barrancas",type:"unit",cost:4,attack:2,health:3,kind:"dúo",icon:"🐜",hue:295,effect:"splash",text:"Al atacar, hace además 1 de daño a cada criatura enemiga vecina."},
  {id:"pereira",name:"Pereira Castor",type:"unit",cost:2,attack:2,health:2,kind:"streamer",icon:"🦫",hue:32,effect:"revenge",text:"Cuando muere, contraataca con sus paletas: hace 2 de daño a la carta enemiga de enfrente."},
  {id:"cancer",name:"Cáncer",type:"spell",cost:4,kind:"maleficio",icon:"🦠",hue:340,effect:"cancer",target:"enemy",text:"Marca una criatura enemiga. Muere tras 3 turnos propios si no recibe Quimio."},
  {id:"chemo",name:"Quimio",type:"spell",cost:2,kind:"remedio",icon:"💉",hue:182,effect:"chemo",target:"friendCancer",text:"Elimina Cáncer de una criatura aliada. Le causa 1 de daño."},
  {id:"taxoffice",name:"Agencia Tributaria",type:"spell",cost:4,kind:"pesadilla",icon:"🏦",hue:11,effect:"taxoffice",text:"Confisca hasta 2 de energía rival y te entrega 1 de energía."},
  {id:"inspector",name:"Inspector Hacienda",type:"unit",cost:3,attack:1,health:5,kind:"funcionario",icon:"🕵️",hue:10,effect:"inspector",text:"Mientras viva, jugar cartas de coste 4 o más cuesta +1 al rival."},
  {id:"raul",name:"Raúl Becas y Ayudas",abilityName:"Beca MEC",type:"unit",cost:2,attack:1,health:3,kind:"subvención",icon:"🎓",hue:197,effect:"grant",text:"Beca MEC — Al comienzo de tus turnos, obtienes +1 de energía."},
  {id:"sixseven",name:"Sixseven",type:"spell",cost:6,kind:"brainrot",icon:"6️⃣",hue:270,effect:"sixseven",text:"Lanza el destino: 6 de daño a una criatura aleatoria enemiga o +7 de energía."},
  {id:"piratetoken",name:"Token pirata de Fortnite",type:"spell",cost:3,kind:"botín",icon:"🪙",hue:43,effect:"pirate",text:"Durante el resto de tu turno, TODAS tus cartas cuestan 0 de energía."},
  {id:"perry",name:"Perry el ornitorrinco",type:"unit",cost:4,attack:2,health:3,kind:"agente secreto",icon:"🕵️",hue:172,effect:"agent",text:"Con gorro: 2/3 y bloquea un efecto enemigo. Sin gorro: 4/2. Cambia de forma cada turno propio."},
  {id:"hyper",name:"Hipergamia",type:"spell",cost:3,kind:"táctica",icon:"💍",hue:318,effect:"hyper",target:"enemy",text:"Elige una carta enemiga: todas tus criaturas concentrarán en ella su próximo ataque."},
  {id:"steve",name:"Steve (Minecraft)",type:"unit",cost:4,attack:3,health:5,kind:"constructor",icon:"⛏️",hue:145,effect:"block",text:"Al entrar, crea un Bloque de tierra 0/3 en un carril aliado libre."},
  {id:"cow",name:"La vaca que ríe",type:"unit",cost:3,attack:1,health:5,kind:"lácteo",icon:"🐄",hue:355,effect:"heal",text:"Tras atacar, reparte quesos 🧀: cada aliado vecino recupera 1 de vida."}
].map((card,index)=>({
 ...card,series:"I",canvaPage:index+1,
 // Illustrations imported from the Canva portrait edition; HTML stays authoritative for mechanics.
 image:"./assets/cards/"+card.id+".png",
 fullImage:"./assets/cards/"+card.id+"-full.png",
 alt:card.name+" — ilustración de Serie I"
}));
export const SERIES_II = [
  {
    "id": "curse",
    "name": "Maldición gitana",
    "type": "spell",
    "cost": 3,
    "kind": "mala suerte",
    "icon": "🔮",
    "hue": 283,
    "effect": "hex",
    "target": "enemy",
    "text": "Mala suerte: la criatura rival pierde 2 de ataque en sus próximos 2 ataques. Sin asociar la magia a ninguna etnia."
  },
  {
    "id": "alonso",
    "name": "Alonso Mazza",
    "type": "unit",
    "cost": 3,
    "attack": 2,
    "health": 4,
    "kind": "carisma",
    "icon": "🤝",
    "hue": 34,
    "effect": "cheer",
    "text": "Consejos de Alonso: al entrar, cura 1 vida a cada aliado vecino."
  },
  {
    "id": "cartel",
    "name": "Cartel Mexicano",
    "type": "spell",
    "cost": 3,
    "kind": "contrabando",
    "icon": "📦",
    "hue": 22,
    "effect": "contraband",
    "text": "Llegó el cargamento: roba 2 criaturas del mazo de combate, si tienes espacio."
  },
  {
    "id": "agustin51",
    "name": "Agustín51",
    "type": "unit",
    "cost": 4,
    "attack": 3,
    "health": 3,
    "kind": "streamer",
    "icon": "🌭",
    "hue": 13,
    "effect": "squad",
    "text": "Escuadrón Salchichón: +1 daño al atacar si tiene algún aliado vecino."
  },
  {
    "id": "renfe",
    "name": "Renfe",
    "type": "spell",
    "cost": 2,
    "kind": "transporte",
    "icon": "🚆",
    "hue": 189,
    "effect": "delay",
    "target": "enemy",
    "text": "Disculpen el retraso: la criatura rival pierde su próximo ataque."
  },
  {
    "id": "kirk",
    "name": "Charlie Kirk",
    "type": "unit",
    "cost": 3,
    "attack": 1,
    "health": 4,
    "kind": "debate",
    "icon": "🎙️",
    "hue": 225,
    "effect": "debate",
    "text": "Debate interminable: reduce en 1 el ataque de la criatura enemiga de enfrente mientras permanezca aquí."
  },
  {
    "id": "tralalero",
    "name": "Tralalero Tralala",
    "type": "unit",
    "cost": 4,
    "attack": 3,
    "health": 3,
    "kind": "brainrot",
    "icon": "🦈",
    "hue": 191,
    "effect": "sneakers",
    "text": "Zapatillas supersónicas: tras atacar, inflige 1 daño al enemigo del carril vecino de la derecha."
  },
  {
    "id": "chatgpt",
    "name": "ChatGPT",
    "type": "spell",
    "cost": 4,
    "kind": "inteligencia artificial",
    "icon": "🤖",
    "hue": 162,
    "effect": "ai",
    "text": "Respuesta larguísima: roba una criatura y un efecto. Puede inventarse una estrategia, pero no las cartas."
  },
  {
    "id": "hustle304",
    "name": "HustleHard304",
    "type": "unit",
    "cost": 4,
    "attack": 3,
    "health": 4,
    "kind": "influencer",
    "icon": "✊",
    "hue": 40,
    "effect": "hustle",
    "text": "Puños arriba: al entrar, obtienes +1 energía. ¡Sin descanso!"
  },
  {
    "id": "perrosanchez",
    "name": "Perro Sánchez",
    "type": "unit",
    "cost": 3,
    "attack": 2,
    "health": 3,
    "kind": "política meme",
    "icon": "🐕",
    "hue": 10,
    "effect": "coalition",
    "text": "Coalición: +1 de ataque mientras tenga un aliado en un carril vecino."
  },
  {
    "id": "broncano",
    "name": "David Broncano",
    "type": "spell",
    "cost": 3,
    "kind": "entrevista",
    "icon": "🎤",
    "hue": 291,
    "effect": "bank",
    "text": "¿Dinero en el banco?: copia hasta 3 de la energía rival, sin quitársela."
  },
  {
    "id": "capybara",
    "name": "Capibara",
    "type": "unit",
    "cost": 2,
    "attack": 1,
    "health": 5,
    "kind": "zen",
    "icon": "🦫",
    "hue": 82,
    "effect": "relax",
    "text": "Paz absoluta: después de atacar, recupera 1 punto de vida."
  }
].map((card,index)=>({
 ...card,series:"II",canvaPage:index+1,
 // Editable SVG starter art keeps Serie I's identical HTML card frame.
 image:"./assets/cards/series2/"+card.id+".svg",
 alt:card.name+" — ilustración provisional Serie II"
}));
export const CARDS=[...SERIES_I,...SERIES_II];
export const COMBAT_CARDS=CARDS.filter(c=>c.type==="unit");
export const EFFECT_CARDS=CARDS.filter(c=>c.type==="spell");
export const CARDS_BY_ID=Object.fromEntries(CARDS.map(card=>[card.id,card]));
export const BLOCK={id:"block",name:"Bloque de tierra",type:"unit",cost:0,attack:0,health:3,kind:"construcción",icon:"🟫",hue:31,effect:"none",text:"Un bloque que ocupa espacio. Steve se cree arquitecto.",series:"I",canvaPage:16};
