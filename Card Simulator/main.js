// Debugging
var debug = '';
function log(txt, breakLine=true, update=true) {
	console.log(txt);
	debug = debug + txt;
	if(breakLine) {debug = debug + '<br>';};
	if(update) {document.getElementById('debug').innerHTML = debug;};
};

// General functions
function range (start, end) {
    if(end <= 0) {
        return [];
    };
    return [...Array(end).keys()];
};

function len(array) {
    return array.length;
};

function tutorialPopup () {
    window.alert(`
    || Welcome to Card Sim. -- Bem-vindo ao Sim. de Carta ||
    Press H for Re-Open Help Menu -- Pressione H para Reabrir o Menu de Ajuda

    || Camera Control -- Controle da Câmera ||
    Mouse to Move -- Mouse para Mover
    Mousewheel to Zoom -- Rodinha do Mouse para dar Zoom
    WASD to Move -- WASD para Mover-se
    Q and E to Zoom -- Q e E para dar Zoom
    B to Reset Camera -- B para Resetar a Camera
    0 for Fullscreen -- 0 para Tela Cheia

    || Deck Control -- Controle de Baralho ||
    Mouse to Select and Drag -- Mouse para Selecionar e Arrastar
    Ctrl to Select Stack -- Ctrl para Selecionar o Baralho Inteiro
    Shift to Select Single Card -- Shift para Selecionar uma só Carta
    R to Shuffle -- R para Embaralhar
    F to Flip -- F para Virar
    Z to Sort -- Z para Organizar
    X to Delete -- X para Remover
    C to Spawn Deck -- C para Spawnar um Deque (52)
    V to Spawn a Specific Card -- V para Spawnar uma Carta Especifica
    T to Collect -- T para Coletar
    G to Drop -- G para Largar
    1-4 to Change Deck Appearence -- 1-4 para Mudar Aparência do Baralho
    `);
};

// Geometry and Math functions
function average (array) {
    let toReturn = 0;
    for(let i in array) {
        toReturn = toReturn + parseInt(array[i]);
    };
    return toReturn/len(array);
};
function pointTowards (p1, p2) {
    // P1 is self, P2 is target.
    return Math.atan2( (p2[0] - p1[0]), (p2[1] - p1[1]) );
};

function distance (p1, p2) {
    // P1 is self, P2 is target.
    return Math.sqrt((p1[0] - p2[0])**2 + (p1[1]-p2[1])**2);
};

// Console HTML DiV Element
var HTMLdivElement = `
		<div class="debug">
            eval(<input placeholder="insert code here..." id="cheatInput" onchange="eval(document.getElementById('cheatInput').value);document.getElementById('cheatInput').value='';"></input>);
			<pre id="debug"></pre>
		</div>
`;
HTMLconsoleVisible = false;
// Screen Vars
var screen = document.getElementById('screen');
//screen.width = document.body.clientWidth;
//screen.height = document.body.clientHeight;
var screenWidth = screen.width;
var screenHeight = screen.height;
var screenX = screen.getBoundingClientRect().left;
var screenY = screen.getBoundingClientRect().top;
var ctx = screen.getContext("2d");
// General Vars
var time = 0;
var lastTime = 0;
var frame = 0;
// Mouse vars
var oldMouseX = 0;
var oldMouseY = 0;
var mouseX = 0;
var mouseY = 0;
var mouseOffsetX = 0;
var mouseOffsetY = 0;
var mouseState = 0;
var mTransX = 0;
var mTransY = 0;
// Selection
var actionType = 'none';
var selected = -1;
var allowReselect = 1;
var hasSelectedStack = 0;
var stackGrabMode = 0; //0 is default, 1 is only one, 2 is always all
// Camera vars
var camX = 0;
var camY = 0;
var camZoom = 1;
var camVelX = 0;
var camVelY = 0;
var camVelZoom = 0;
// Card Interactions
var closestStackDistance = 0;
var closestStackIndex = -1;
var stacks = [];

// Drawing/screen functions
function resizeCanvas () {
    let WHICH = 2;
    if(WHICH == 1) {
        screen.width = HTMLconsoleVisible?800:document.body.clientWidth;
        screen.height = HTMLconsoleVisible?450:document.body.clientHeight;
    } else if(WHICH == 2) {
        screen.width = HTMLconsoleVisible?800:document.documentElement.clientWidth - 4;
        screen.height = HTMLconsoleVisible?450:document.documentElement.clientHeight - 4;
    } else if(WHICH == 3) {
        screen.width = HTMLconsoleVisible?800:window.innerWidth;
        screen.height = HTMLconsoleVisible?450:window.innerHeight;
    };
    document.getElementById('debugdiv').innerHTML = HTMLconsoleVisible?HTMLdivElement:'';
};

function circle (x, y, radius, color=null) {
    ctx.beginPath();
    if(color != null) {
        ctx.fillStyle = color;
    };
    ctx.arc(x, y, radius, 0, Math.PI*2);
    ctx.fill();
};

function xyToCam (x, y) {
    return [(x-camX)*camZoom, (y-camY)*camZoom];
};

function xToCam (x) {
    return ((x-camX)*camZoom) + screenWidth/2;
};

function yToCam (y) {
    return ((y-camY)*camZoom) + screenHeight/2;
};

function camToX (x) {
    return (((x - screenWidth/2)/camZoom)+camX);
};

function camToY (y) {
    return (((y - screenHeight/2)/camZoom)+camY);
};

function clearScreen () {
    ctx.clearRect(0, 0, screen.width, screen.height);
    ctx.beginPath();
};

var offSetValue = ((89+4)/4)*1.1;

// Card class
class card {
    // Defines a card and it's stats.
    constructor (number=1, suit=0, props=[], face=1) {
        this.number = number;
        this.suit = suit;
        this.props = props;
        // Facing up (1) or down (0).
        this.face = face;
    };
    input (stack, me) {
        if(me > len(stacks[stack])-1) {return;};
        let yOffset = me * stacks[stack].offset;

        // Card Selecting
        if(mouseState && (selected == -1 || allowReselect)) {
            // Mouse Translated Coordinates
            if(Math.abs(mouseX-xToCam(stacks[stack].x)) < 64*camZoom &&
            Math.abs(mouseY-yToCam(stacks[stack].y + yOffset)) < 89*camZoom
            ) {
                selected = me * (stackGrabMode != 2);
            };
        };
    };
    act (stack, me) {
        if(me > len(stacks[stack])-1) {return;};
        // Update closestCardDistance and closestCardIndex
        if(distance([mTransX, mTransY], [stacks[stack].x, stacks[stack].y]) < closestStackDistance ||
        closestStackIndex == -1
        ) {
            closestStackDistance = distance([mTransX, mTransY], [stacks[stack].x, stacks[stack].y]);
            closestStackIndex = stack;
        };
        // Card Acting/Behaviour
        for(let count in this.props) {
            if(this.props[count] == 'decay') {
                this.hp -= 1;
            };
        };
    };
    render (stack, me) {
        if(me > len(stacks[stack])-1) {return;};
        let yOffset = me * stacks[stack].offset;
        let borderWidth = 4;

        ctx.beginPath();
        // Draw Base Outline
        if(selected == stack) {
            ctx.fillStyle = 'black';
            borderWidth = 5;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 5*camZoom;
        } else {
            ctx.fillStyle = 'grey';
            borderWidth = 4;
            ctx.strokeStyle = 'grey';
            ctx.lineWidth = 4*camZoom;
        };
        ctx.fillRect(xToCam(stacks[stack].x - (64 + borderWidth)), yToCam(stacks[stack].y + yOffset - (89 + borderWidth)), (64 + borderWidth)*2*camZoom, (89 + borderWidth)*2*camZoom);
        // Draw Base
        ctx.fillStyle = 'lightgrey';
        ctx.fillRect(xToCam(stacks[stack].x - 64), yToCam(stacks[stack].y + yOffset - 89), 64*2*camZoom, 89*2*camZoom);
        // Text Config
        if(!stacks[stack].cards[me].face) {
            ctx.beginPath();
            ctx.arc(xToCam(stacks[stack].x), yToCam(stacks[stack].y + yOffset), 20*camZoom, 0, Math.PI*2);
            ctx.moveTo(xToCam(stacks[stack].x - 60), yToCam(stacks[stack].y + yOffset - 78))
            ctx.lineTo(xToCam(stacks[stack].x + 60), yToCam(stacks[stack].y + yOffset - 78))
            ctx.moveTo(xToCam(stacks[stack].x - 60), yToCam(stacks[stack].y + yOffset + 78))
            ctx.lineTo(xToCam(stacks[stack].x + 60), yToCam(stacks[stack].y + yOffset + 78))
            ctx.stroke();
            if(len(stacks[stack].cards) > 1) {
                ctx.fillStyle = 'black';
                ctx.textAlign = 'left';
                ctx.font = String(Math.ceil(24*camZoom))+'px "Lucida Console", "Courier New", monospace';
                ctx.fillText('x'+len(stacks[stack].cards), xToCam(stacks[stack].x + 52), yToCam(stacks[stack].y - 94));
            };
            return;
        };
        ctx.beginPath();
        ctx.textAlign = 'center';
        // Number Icons
        let n_icons = ['0', 'A', '2', '3', '4', '5', '6', '7', '8', '9', 'X', 'J', 'Q', 'K'];
        // Suit Icons
        let s_icons = ['♠', '♣', '♥', '♦'];
        // Font Color
        ctx.fillStyle = stacks[stack].cards[me].suit<2?'black':'red';
        // Card Top Small
        ctx.font = String(Math.ceil(16*camZoom))+'px "Lucida Console", "Courier New", monospace';
        ctx.fillText(n_icons[stacks[stack].cards[me].number]+s_icons[stacks[stack].cards[me].suit], xToCam(stacks[stack].x - 52), yToCam(stacks[stack].y + yOffset - 72));
        // Card Middle Big
        ctx.font = String(Math.ceil(48*camZoom))+'px "Lucida Console", "Courier New", monospace';
        ctx.fillText(n_icons[stacks[stack].cards[me].number]+s_icons[stacks[stack].cards[me].suit], xToCam(stacks[stack].x), yToCam(stacks[stack].y + yOffset + (48*0.354)));
        // Stack Size
        if(len(stacks[stack].cards) > 1 && me == 0) {
            ctx.fillStyle = selected == stack?'black':'grey';
            ctx.textAlign = 'left';
            ctx.font = String(Math.ceil(24*camZoom))+'px "Lucida Console", "Courier New", monospace';
            ctx.fillText('x'+len(stacks[stack].cards), xToCam(stacks[stack].x + 52), yToCam(stacks[stack].y - 94));
        };
    };
    copy () {
        return new card(this.number, this.suit, this.props, this.face);
    };
};
// Cards
c_basic = new card();

// Stack class
class stack {
    // Defines a stack of cards. These can occupy space.
    // A stack can consist of a single card.
    constructor (cards=[], x=0, y=0, velX=0, velY=0, offset=((89+4)/4)*1.1, targetOffset='default') {
        this.cards = cards;
        this.x = x;
        this.y = y;
        this.velX = velX;
        this.velY = velY;
        this.index = len(stacks)-1;
        this.offset = offset;
        this.targetOffset = targetOffset=='default'?offset:targetOffset;
    };
    update () {
        if(Math.abs(this.targetOffset - this.offset)<0.1) {
            this.offset = this.targetOffset;
        } else {
            this.offset += (this.targetOffset - this.offset)/8;
        };
    };
    split (start, end=-1) {
        let limit = parseInt(end==-1?len(this.cards):end);
        let newStack = new stack([], this.x, this.y+start*this.offset, this.velX, this.velY, this.offset);
        let countCard = start;
        while(countCard < limit) {
            newStack.cards.push(this.cards[countCard]);
            this.cards.splice(countCard, 1);
            limit -= 1;
            if(stackGrabMode == 1) {
                break;
            };
        };
        return newStack.copy();
    };
    shuffle () {
        let originalLen = len(this.cards);
        let shuffled = [];
        let cardCount = 0;
        let rng = 0;
        while(cardCount < originalLen) {
            rng = Math.floor(Math.random() * len(this.cards));
            shuffled.push(this.cards[rng]);
            this.cards.splice(rng, 1);
            cardCount = parseInt(cardCount) + 1;
        };
        this.cards = shuffled;
    };
    sort () {
        let originalLen = len(this.cards);
        let sorted = this.copy().cards;
        let otherCount = 0;
        let cardCount = 0;
        let current = 0;
        while(cardCount < originalLen) {
            current = this.cards[cardCount];
            for(otherCount in this.cards) {
                if(sorted[otherCount].number + [0, 2, 1, 3][sorted[otherCount].suit]*14 >= current.number + [0, 2, 1, 3][current.suit]*14) {
                    break;
                };
            };
            sorted.splice(cardCount, 1);
            sorted.splice(otherCount, 0, current);
            cardCount = parseInt(cardCount) + 1;
        };
        this.cards = sorted;
    };
    flip () {
        for(let cardCount in this.cards) {
            this.cards[cardCount].face = 1 - this.cards[cardCount].face;
        };
    };
    merge (me, addTo='top') {
        let closestStackDistanceToMe = 0;
        let closestStackIndexToMe = -1;
        let d = 0;
        for(let countStack in stacks) {
            let yOffset1 = (len(stacks[countStack].cards)-1) * stacks[countStack].offset;
            let yOffset2 = (len(stacks[me].cards)-1) * this.offset;
            if(countStack != me &&
            Math.abs(stacks[countStack].x-stacks[me].x) < (64*2) &&
            Math.abs((stacks[countStack].y+yOffset1/2)-(stacks[me].y+yOffset2/2)) < (89*2)+yOffset1/2+yOffset2/2
            ) {
                // Distance Between the My Top and the Other's Bottom
                d = distance([stacks[countStack].x, stacks[countStack].y+yOffset1], [stacks[me].x, stacks[me].y]);
                // Find Closest Other Stack
                if(closestStackIndexToMe == -1 || d < closestStackDistanceToMe) {
                    closestStackDistanceToMe = d;
                    closestStackIndexToMe = countStack;
                };
            };
        };
        if(closestStackIndexToMe != -1) {
            for(let countCard in stacks[me].cards) {
                if(addTo == 'top') {
                    stacks[closestStackIndexToMe].cards.push(stacks[me].cards[countCard]);
                } else if(addTo == 'bottom') {
                    stacks[closestStackIndexToMe].cards.unshift(stacks[me].cards[(len(stacks[me].cards)-1)-countCard]);
                };
            };
            stacks.splice(me, 1);
            return true;
        };
        return false;
    };
    snap (xSnapMult=1.1, ySnapMult=1.1) {
        let xSnap = (64+4)*2*xSnapMult;
        let ySnap = (89+4)*2*ySnapMult;
        this.x = Math.round(this.x/xSnap)*xSnap;
        this.y = Math.round(this.y/ySnap)*ySnap;
    };
    render (me) {
        ctx.beginPath();
        if(selected == me) {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 17*camZoom;
        } else {
            ctx.strokeStyle = 'grey';
            ctx.lineWidth = 16*camZoom;
        };
        ctx.moveTo(xToCam(this.x), yToCam(this.y));
        ctx.lineTo(xToCam(this.x), yToCam(this.y+(len(this.cards)-1)*this.offset));
        ctx.stroke();
    };
    copy () {
        return new stack(this.cards, this.x, this.y, this.velX, this.velY, this.offset, this.targetOffset);
    };
};
// Card Sets
s_basic = [c_basic.copy()];

// Misc Functions
function resetSelected () {
    // Reset Selection Vars
    actionType = 'none';
    selected = -1;
    hasSelectedStack = 0;
    allowReselect = 1;
    // Reset Mouse Offset
    mouseOffsetX = 0;
    mouseOffsetY = 0;
};

// Main Loop Function
var FPS_average = 0;
var FPS_sample = [];
function main () {
    debug = '';
    // If Selected Stack Doesn't Exist, Unselect
    if(selected > len(stacks)-1) {resetSelected();};
    // Mouse Position Translated into World Position
    mTransX = camToX(mouseX);
    mTransY = camToY(mouseY);
    // Panning
    if(actionType != 'pan') {
        oldMouseX = mTransX;
        oldMouseY = mTransY;
    };
    // Add Zoom Velocty
    camZoom += camVelZoom;
    // Cap camZoom
    camZoom = Math.max(Math.min(camZoom, 1.5), 0.25);
    // Camera Panning
    camX = oldMouseX - ((mouseX - screenWidth/2)/camZoom);
    camY = oldMouseY - ((mouseY - screenHeight/2)/camZoom);
    //  Add Camera Velocity
    camX += camVelX;
    camY += camVelY;
    // Apply Friction
    camVelZoom = camVelZoom/1.2;
    camVelX = camVelX/1.2;
    camVelY = camVelY/1.2;

    // Clear Screen
    clearScreen();

    // Dot at (0, 0)
    circle(xToCam(0), yToCam(0), 5*camZoom, 'white');

    // Move Selected Stack
    if(selected != -1) {
        stacks[selected].x = mTransX;
        stacks[selected].y = mTransY;
    };

    // Select Stack
    if(mouseState && allowReselect && actionType == 'none') {
        for(let countStack in stacks) {
            if(len(stacks[countStack].cards) > 0) {
                for(let countCard in stacks[countStack].cards) {
                    stacks[countStack].cards[countCard].input(countStack, countCard);
                };
                if(selected != -1 && allowReselect) {
                    actionType = 'stack';
                    hasSelectedStack = 1;
                    allowReselect = 0;
                    if(selected == 0) {
                        selected = countStack;
                        stacks.push(stacks[selected].copy());
                        stacks.splice(selected, 1);
                        selected = len(stacks)-1;
                    } else {
                        stacks.push(stacks[countStack].split(selected));
                        selected = len(stacks)-1;
                    };
                    mouseOffsetX = (mouseX - xToCam(stacks[selected].x));
                    mouseX -= mouseOffsetX;
                    mouseOffsetY = (mouseY - yToCam(stacks[selected].y));
                    mouseY -= mouseOffsetY;
                };
            };
        };
    };
    // Actions
    if(mouseState && actionType == 'none') {
        actionType = 'pan';
    } else if(!mouseState && actionType == 'pan') {
        actionType = 'none';
    };

    closestStackDistance = 0;
    closestStackIndex = -1;
    for(let countStack in stacks) {
        if(len(stacks[countStack].cards) > 0) {
            stacks[countStack].update(countStack);
            stacks[countStack].render(countStack);
            for(let countCard in stacks[countStack].cards) {
                stacks[countStack].cards[countCard].act(countStack, countCard);
                stacks[countStack].cards[0].render(countStack, countCard);
            };
        };
    };

    // Cursor
    if(selected == -1) {circle(mouseX, mouseY, 5, 'black');};
    // Text
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.font = '24px "Lucida Console", "Courier New", monospace';
    ctx.beginPath();
    if(stackGrabMode == 0) {
        ctx.fillText('Default', 5, 20);
    } else if(stackGrabMode == 1) {
        ctx.fillText('Draw', 5, 20);
    } else if(stackGrabMode == 2) {
        ctx.fillText('Stack', 5, 20);
    };

    time = parseInt(Date.now());
    FPS_sample.push( time - lastTime );
    if(len(FPS_sample)>29) {
        FPS_average = 1/(average(FPS_sample)/1000);
        FPS_sample = [];
    };
    lastTime = parseInt(Date.now());

    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.font = '24px "Lucida Console", "Courier New", monospace';
    ctx.fillText(String(Math.round(FPS_average)), 5, 40);
    ctx.beginPath();

    frame += 1;
    frame = frame * (frame < 9999);
};

// User Input
window.addEventListener('click', (event) => {
});

window.addEventListener('contextmenu', (event) => {
});

window.addEventListener('keypress', (event) => {
    if(event.key == 'r' && actionType == 'stack') {
        stacks[selected].shuffle();
    };
    if(event.key == 'f' && actionType == 'stack') {
        if(stacks[selected].offset == 0) {stacks[selected].cards.reverse();};
        stacks[selected].flip();
    };
    if(event.key == 'z' && actionType == 'stack') {
        stacks[selected].sort();
    };
    if(event.key == 'x' && actionType == 'stack') {
        stacks.splice(selected, 1);
        resetSelected();
    };
    if(event.key == '1' && actionType == 'stack') {
        stacks[selected].targetOffset = ((89+4)/0.5)*1.1;
    };
    if(event.key == '2' && actionType == 'stack') {
        stacks[selected].targetOffset = ((89+4)/4)*1.1 ;
    };
    if(event.key == '3' && actionType == 'stack') {
        stacks[selected].targetOffset = ((89+4)/16)*1.1 ;
    };
    if(event.key == '4' && actionType == 'stack') {
        stacks[selected].targetOffset = 0 ;
    };
    if(event.key == 'c' && actionType == 'none') {
        stacks.push(new stack([], mTransX, mTransY));
        stacks[len(stacks)-1].offset = 0;
        stacks[len(stacks)-1].targetOffset = 0;
        for(let s = 0; s < 4; s++) {
            for(let n = 1; n < 14; n++) {
                stacks[len(stacks)-1].cards.push(new card(n, [0,2,1,3][s]));
            };
        };
        if(!event.shiftKey) {stacks[len(stacks)-1].snap();};
        stacks[len(stacks)-1].merge(len(stacks)-1);
    };
    if(event.key == 'v' && actionType == 'none') {
        let numbers = {'0':0, 'A':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, 'X':10, 'J':11, 'Q':12, 'K':13};
        let suits = {'S': 0, 'C':1, 'H':2, 'D':3};

        let spawnPrompt = window.prompt('0A123456789XJQK -- 0123456789(10)(11)(12)(13)\n♠♥♣♦ -- SHCD', 'AS');
        if(!(spawnPrompt[0] in numbers) || !(spawnPrompt[1] in suits)) {
            window.alert('Invalid card -- Carta inválida');
            return;
        };
        let spawnNumber = numbers[spawnPrompt[0]];
        let spawnSuit = suits[spawnPrompt[1]];

        stacks.push(new stack([new card(spawnNumber, spawnSuit)], mTransX, mTransY));
        stacks[len(stacks)-1].offset = 0;
        if(!event.shiftKey) {stacks[len(stacks)-1].snap();};
        stacks[len(stacks)-1].merge(len(stacks)-1);
    };
    if(event.key == 't' && actionType == 'stack') {
        for(let countStack in stacks) {
            if(countStack != selected) {
                stacks[countStack].merge(countStack, 'bottom');
            };
        };
        selected = len(stacks)-1;
    };
    if(event.key == 'g' && actionType == 'stack') {
        if(len(stacks[selected].cards) == 1) {
            stackGrabMode = 0;
            mouseState = 0;
            if(selected != -1 && hasSelectedStack) {
                if(!stacks[selected].merge(selected)) {
                    if(!event.shiftKey) {stacks[selected].snap();};
                };
            };
            resetSelected();
            return;
        };
        // Split off selected stack
        stacks.push(stacks[selected].split(0, 1));
        // Save selected
        let selectedStack = stacks[selected];
        // Remove selected stack from world
        stacks.splice(selected, 1);
        // Merge splitted stack with others and snap
        if(!event.shiftKey) {stacks[len(stacks)-1].snap();};
        stacks[len(stacks)-1].merge(len(stacks)-1);
        // Re-add selected stack to world
        stacks.push(selectedStack);
        // Set selected to top element (most recently added)
        selected = len(stacks)-1;
    };
    if(event.key == 'b') {
        camX = 0; camY = 0; camZoom = 1;
    };
    if(event.key == '0') {
        HTMLconsoleVisible = !HTMLconsoleVisible;
        resizeCanvas();
    };
    if(event.key == 'h') {
        tutorialPopup();
    };
});

window.onresize = () => {
    resizeCanvas();
};

window.addEventListener('keydown', (event) => {
    if(event.key == 'd' || event.key == 'a') {
        camVelX += (5/camZoom) * ((event.key=='d') - (event.key=='a'));
    };
    if(event.key == 'w' || event.key == 's') {
        camVelY -= (5/camZoom) * ((event.key=='w') - (event.key=='s'));
    };
    if(event.key == 'q' || event.key == 'e') {
        camVelZoom += (camZoom/25) * ((event.key=='q') - (event.key=='e'));
    };
});

window.addEventListener('keyup', (event) => {
});

window.addEventListener('wheel', (event) => {
    camVelZoom += event.deltaY * -0.0002;
});

onmousemove = function (e) {
    screenX = screen.getBoundingClientRect().left;
    screenY = screen.getBoundingClientRect().top;
    mouseX = e.clientX - screenX - mouseOffsetX;
    mouseY = e.clientY - screenY - mouseOffsetY;
};

onmousedown = function (e) {
    stackGrabMode = 1 * e.shiftKey;
    stackGrabMode = (2 * e.ctrlKey) + (stackGrabMode * !e.ctrlKey);
    mouseState = 1;
};

onmouseup = function (e) {
    stackGrabMode = 0;
    mouseState = 0;
    if(selected != -1 && hasSelectedStack) {
        if(!stacks[selected].merge(selected)) {
            if(!e.shiftKey) {stacks[selected].snap();};
        };
    };
    resetSelected();
    screenX = screen.getBoundingClientRect().left;
    screenY = screen.getBoundingClientRect().top;
    mouseX = e.clientX - screenX - mouseOffsetX;
    mouseY = e.clientY - screenY - mouseOffsetY;
};

// Pre-Loop
resizeCanvas();
stacks.push(new stack())
stacks[len(stacks)-1].offset = 0;
stacks[len(stacks)-1].targetOffset = 0;
for(let s = 0; s < 4; s++) {
    for(let n = 1; n < 14; n++) {
        stacks[len(stacks)-1].cards.push(new card(n, [0,2,1,3][s]));
    };
};
stacks[len(stacks)-1].snap();

// Tutorial
tutorialPopup();

// Loop
setInterval(main, 5);