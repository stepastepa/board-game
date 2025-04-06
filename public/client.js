const body = document.querySelector("body");
const board = document.getElementById('game-board');
const pieces = new Map();
const playerOptionsForm = document.querySelector('.playerOptions');
const menu = document.querySelector(".menu");
const menuBG = document.querySelector(".menu-bg");
const menuButton = document.getElementById("menuButton");
const selectBoard = document.querySelector("#selectBoard");
const numberOfPlayers = document.querySelector("#numberOfPlayers");
const checkboxCollisions = document.getElementById("selectCollisions");
const dicesField = document.getElementById("dicesField");
const dices = document.querySelectorAll(".dice");
const dicesNumbers = document.querySelectorAll(".dice>span");
// const diceIcons = document.querySelectorAll(".dice svg");
const navButtons = document.getElementById("navButtons");
const plusButton = document.getElementById("plusButton");
const minusButton = document.getElementById("minusButton");
const moveButton = document.getElementById("moveButton");
const roomHeaderSpan = document.querySelector(".room-header span");

let ws;

// size of collider
let pieceSize = 0.0000001;

// current fishka
let selectedPiece = null;
const lastMove = new Map(); // Хранит последние отправленные позиции и их временные метки для каждой фишки **********

// dice is busy and spinning
let spinning = false;

// прямоуголная пропорция поля + какое именно поле
let isSquareBoard = '';
let whatBoard = '';
let originalAspectRatio = 1 / 1;

// for navigation buttons
let activatedMoving = false;
let boardIsMoving = false;

let points = [];
let players = [];

function getAllPlayersAndPoints() {
  points = [...document.querySelectorAll('.point')];
  players = [...document.querySelectorAll('.player')];
}

//////////////////////////////////////////

const roomId = window.location.pathname.slice(1);
if (roomId && roomId.startsWith('room-')) {
  connectToRoom(roomId);
} else {
  window.location.href = '/'; // ???????????????????????? - Если не в комнате, редирект на стартовую страницу
}

function connectToRoom(roomId) {
  ws = new WebSocket(`ws://${location.host}/${roomId}`); // -- auto IP -- //
  setupWebSocket();

  console.log(window); // --> info
  console.log(location); // --> info
  console.log(ws); // --> info
}


// HTML for Players:
function createPiece(id, x, y, colorIndex) {
  const piece = document.createElement('div');
  piece.className = 'player';
  piece.id = id;
  piece.style.left = `${x}%`;
  piece.style.top = `${y}%`;
  piece.innerHTML = `<div id="color-${colorIndex}"></div>`;
  board.appendChild(piece);
  pieces.set(id, piece);
}

function toPercentage(x, y) {
  // Получаем размеры и положение поля:
  const rect = board.getBoundingClientRect(); // width + Scale
  const boardSizeX = rect.width;
  const boardSizeY = rect.height;

  const pieceSize = 1; // 1px x 1px
  // Вычисляем координаты относительно верхнего левого угла поля:
  const relativeX = x - rect.left;
  const relativeY = y - rect.top;
  return {
    x: ((relativeX - pieceSize / 2) / boardSizeX) * 100,
    y: ((relativeY - pieceSize / 2) / boardSizeY) * 100
  };
}

//////////////////////////////////////////
////////////////////////////
//////////////

let panWasActiveBefore = false; // to detect currently active panning mode

function detectSelectedPiece(e) {
  e.preventDefault(); // android unselections
  if (e.target.className === 'player') {
    selectedPiece = e.target; // фиксируем нажатую фишку

    // freeze panning
    if (activatedMoving) {
      panWasActiveBefore = true;
      activatedMoving = false;
    }
  }
}

function eraseSelectedPiece(e) {
  e.preventDefault(); // android unselections
  if (selectedPiece) { // stick to the board
    tryMagnet(selectedPiece);
  }
  selectedPiece = null;

  // unfreeze panning
  if (panWasActiveBefore) {
    panWasActiveBefore = false;
    activatedMoving = true;
  }
}

function movePiece(e) {
  e.preventDefault(); // android unselections
  if (selectedPiece) {
    const pos = toPercentage(
      // for touch events -> ?? ...
      e.clientX ?? (e.touches && e.touches[0].clientX),
      e.clientY ?? (e.touches && e.touches[0].clientY)
    );
    pos.x = Math.max(0, Math.min(100, pos.x));
    pos.y = Math.max(0, Math.min(100, pos.y));

    // Обрабатываем столкновения и получаем обновленные позиции
    const updates = handleCollisions(selectedPiece, pos.x, pos.y);

    selectedPiece.style.left = `${pos.x}%`;
    selectedPiece.style.top = `${pos.y}%`;

    updates.forEach((newPos, id) => {
      ws.send(JSON.stringify({
        type: 'move',
        id,
        x: newPos.x,
        y: newPos.y,
        timestamp: newPos.timestamp // timestamp **********
      }));
      // Сохраняем последнее отправленное движение **********
      lastMove.set(id, { x: newPos.x, y: newPos.y, timestamp: newPos.timestamp });
    });
  }
  updateZIndex();
}

board.addEventListener('mousedown', detectSelectedPiece);
board.addEventListener('touchstart', detectSelectedPiece);

board.addEventListener('mousemove', movePiece);
board.addEventListener('touchmove', movePiece);

board.addEventListener('mouseup', eraseSelectedPiece);
board.addEventListener('touchend', eraseSelectedPiece);

//////////////
////////////////////////////
//////////////////////////////////////////

function setupWebSocket() {
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(event.data);

    if (data.type === 'init' || data.type === 'settings') {
      pieces.forEach((_, id) => {
        const piece = pieces.get(id);
        piece.remove(); // очищаем поле
        pieces.delete(id);
      });

      // меняем масштабирования игрового поля
      if (data.boardType == 1) {
        isSquareBoard = false;
        whatBoard = "world";
      } else {
        isSquareBoard = true;
        whatBoard = "other boards";
      }
      console.log("Board is square: " + isSquareBoard);
      adaptBoard(); // активируем адаптацию поля

      // Создаем фишки на основе данных с сервера
      for (const [id, pos] of Object.entries(data.pieces)) {
        if (!pieces.has(id)) {
          createPiece(id, pos.x, pos.y, data.randomOrder[parseInt(id.split('-')[1])]); // colorIndex from the randomOrder + name-id
        } else {
          const piece = pieces.get(id);
          piece.style.left = `${pos.x}%`;
          piece.style.top = `${pos.y}%`;
        }
      }

      getAllPlayersAndPoints(); // 1) выбираем все фишки и все точки для прилипания
      adaptScaleForPlayers(); // 2) настраиваем масштаб фишек
      rollDices("current dices"); // запрашиваем с сервера кубики

      // Обновляем фон и количество кубиков в зависимости от типа поля
      switch (data.boardType) {
        case 1:
          board.className = "world"; // Вокруг Света
          dices[1].classList.remove("hidden"); // 2 кубика
          break;
        case 2:
          board.className = "ludo"; // Ludo
          dices[1].classList.add("hidden"); // 1 кубик
          break;
        case 3:
          board.className = "ludo-6x"; // Ludo 6x
          dices[1].classList.add("hidden"); // 1 кубик
          break;
        case 4:
          board.className = "ladders"; // Ladders
          dices[1].classList.add("hidden"); // 1 кубик
          break;
      }

      // синхронизируем выбранные данные из меню с серверными данными
      modifyMenuOptions(data.numPlayers, data.boardType)

    } else if (data.type === 'update') {
      const piece = pieces.get(data.id);
      if (piece && piece !== selectedPiece) {
        // piece.style.left = `${data.x}%`;
        // piece.style.top = `${data.y}%`;
        ////////////////////////////////////////////////////////////////////////
        // Решение бага при резком броске на тачскрине с двойным прыжком
        const last = lastMove.get(data.id);
        // Применяем обновление только если оно новее последнего локального движения
        if (!last || data.timestamp > last.timestamp) {
          piece.style.left = `${data.x}%`;
          piece.style.top = `${data.y}%`;
          lastMove.set(data.id, { x: data.x, y: data.y, timestamp: data.timestamp });
        }
        ////////////////////////////////////////////////////////////////////////
      }
    } else if (data.type === 'dices') {
      console.log(data.number1);
      console.log(data.number2);
      console.log("order color: " + data.diceOrder);

      let diceColor = 'black';
      switch (data.diceOrder) {
        case 0:
          diceColor = "royalblue";
          break;
        case 1:
          diceColor = "crimson";
          break;
        case 2:
          diceColor = "limegreen";
          break;
        case 3:
          diceColor = "orange";
          break;
        case 4:
          diceColor = "mediumvioletred";
          break;
        case 5:
          diceColor = "#404040";
          break;
        default:
          diceColor = "black";
      }
      dices[0].style.color = diceColor;
      dices[1].style.color = diceColor;
      dices[0].classList.add("active");
      dices[1].classList.add("active");

      if (data.number1 === "" || +data.number1 === 0) { // empty data or reset
        dicesNumbers[0].innerText = "?";
        dicesNumbers[1].innerText = "?";
        dices[0].classList.remove("active");
        dices[1].classList.remove("active");
      } else if (data.justCurrentDices) { // after reloading the page
        dicesNumbers[0].innerText = data.number1;
        dicesNumbers[1].innerText = data.number2;
      } else if (data.number1 != 0 || data.number2 != 0) { // updating with spinning
        showingDices(data.number1, data.number2);
      }
    } else if (data.type === 'error') { // если перезагрузить страницу, то комната исчезает (потому что, если все вышли из комнаты, то сервер ее сразу удаляет) и затем сервер ошибку пишет --> переадресация на 404
      // alert(data.message);
      window.location.href = './page404.html'; // ---> 404 (при перезагрузке)
    } else if (data.type === "online players") {
      console.log(data.playersOnline);
      onlineNumber.innerText = data.playersOnline; // обновляем число онлайн игроков
    }
    updateZIndex();
  };

  ws.onopen = () => {
    console.log('Connected to server');
  };

  ws.onclose = () => {
    console.log('Connection to server is closed');
    window.location.href = `./${roomId}`; // попробовать снова зайти в комнату
  };
}

/////////////////////////////////////////////////////////////////////////////////
// additional screen checker (0% - 100%)
//////////////////////////////////////////////////////////////////////////////////
window.addEventListener('resize', () => {
  pieces.forEach(piece => {
    const currentLeft = parseFloat(piece.style.left);
    const currentTop = parseFloat(piece.style.top);
    piece.style.left = `${Math.min(100, Math.max(0, currentLeft))}%`;
    piece.style.top = `${Math.min(100, Math.max(0, currentTop))}%`;
  });
});

//////////////////////////////////////////////////////////////////////////////////
// z-index updater
//////////////////////////////////////////////////////////////////////////////////
function updateZIndex() {
  for (const i of board.children) {
    i.style.zIndex = Math.round(parseFloat(i.style.top)*100) + Math.round(parseFloat(i.style.left)*1) || 0;
  }
}

//////////////////////////////////////////////////////////////////////////////////
// menu and submit
//////////////////////////////////////////////////////////////////////////////////
playerOptionsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  toggleMenu();
  rollDices("reset dices");
  const numPlayers = numberOfPlayers.value;
  const boardType = selectBoard.value;
  ws.send(JSON.stringify({
    type: 'settings',
    numPlayers: parseInt(numPlayers),
    boardType: parseInt(boardType)
  }));
});

// show-hide menu
menuButton.addEventListener("click", toggleMenu);
menuBG.addEventListener("click", toggleMenu);
menuClose.addEventListener("click", toggleMenu);

function toggleMenu() {
  menu.classList.toggle("closed");
  menuButton.classList.toggle("closed");
}

// switch Menu Players to 4 max mode with Ludo
selectBoard.addEventListener("change", () => modifyMenuOptions(+numberOfPlayers.value, +selectBoard.value));

function modifyMenuOptions(numPlayers, board) {
  const selectedMap = board;

  let two = '', three = '', four = '', five = '', six = '';
  if (numPlayers === 6) six = "selected";
  else if (numPlayers === 5) five = "selected";
  else if (numPlayers === 4) four = "selected";
  else if (numPlayers === 3) three = "selected";
  else two = "selected";

  if (selectedMap === 2) {
    if (six != '' || five != '') four = "selected";
    numberOfPlayers.innerHTML = `
      <option value="2" ${two}>2</option>
      <option value="3" ${three}>3</option>
      <option value="4" ${four}>4</option>
    `;
  } else {
    numberOfPlayers.innerHTML = `
      <option value="2" ${two}>2</option>
      <option value="3" ${three}>3</option>
      <option value="4" ${four}>4</option>
      <option value="5" ${five}>5</option>
      <option value="6" ${six}>6</option>
    `;
  }

  for (let el of selectBoard.children) { // reset all selected options
    el.removeAttribute('selected');
  }
  selectBoard.children[board - 1].selected = true; // add selected
}

// показываем номер комнаты, как ссылку на комнату
roomHeaderSpan.innerHTML = `<a href="http://${location.host}/${roomId}">${roomId}</a>`;

////////////////////////////////////////////////
// toggle dice's HTML code for legacy browsers
selectLegacyBrowsers.addEventListener('change', modifyDiceHTML);
let savedSVG = dices[0].lastElementChild; // сохраняем SVG

function modifyDiceHTML() {
  if (selectLegacyBrowsers.checked) {
    dices.forEach((el) => {
      let divSvgDice = document.createElement('div');
      divSvgDice.classList.add('svg-wrapper');
      const clonedSVG = savedSVG.cloneNode(true); // копируем из памяти
      clonedSVG.classList.remove('svg-hexagon'); // удаляем class !!!
      divSvgDice.append(clonedSVG); // вставляем копию в div
      el.replaceChild(divSvgDice, el.querySelector('.svg-hexagon')); // заменяем
    });
  } else {
    dices.forEach((el) => {
      const clonedSVG = savedSVG.cloneNode(true); // копируем из памяти
      el.replaceChild(clonedSVG, el.querySelector('.svg-wrapper')); // заменяем
    });
  }
}

//////////////////////////////////////////////////////////////////////////////////
// rolling dices
//////////////////////////////////////////////////////////////////////////////////

// dicesField.addEventListener('mousedown', ()=>{}); // ???
// dicesField.addEventListener('touchstart', ()=>{}); // ???

dicesField.addEventListener("click", (e) => {
  // e.preventDefault(); // android blue overlay selections ???
  rollDices("start rolling")
});

function rollDices(xxx) {
  if (spinning != true) {
    ws.send(JSON.stringify({
      type: 'dices',
      rolling: xxx,
    }));
  }
}

function animationOfLoadingForDice(n1, n2) {
  return new Promise(resolve => {
    dicesNumbers[0].classList.add('showing');
    dicesNumbers[1].classList.add('showing');

    dicesNumbers[0].innerText = n1; // показывает сразу, но скрыто стилями
    dicesNumbers[1].innerText = n2; // показывает сразу, но скрыто стилями

    dices[0].classList.add('spinning');
    dices[1].classList.add('spinning');

    setTimeout(() => {
      dicesNumbers[0].classList.remove('showing');
      dicesNumbers[1].classList.remove('showing');
      dices[0].classList.remove('spinning');
      dices[1].classList.remove('spinning');
      resolve();
    }, 1500);
  });
}

async function showingDices(num1, num2) {
  spinning = true;
  await animationOfLoadingForDice(num1, num2);
  dicesNumbers[0].innerText = num1; // повторяет еще раз (на всякий случай)
  dicesNumbers[1].innerText = num2; // повторяет еще раз (на всякий случай)
  spinning = false;
}

//////////////////////////////////////////////////////////////////////////////////
// collisions
//////////////////////////////////////////////////////////////////////////////////

// новый коллайдер с разной шириной и высотой:
function handleCollisions(movingPiece, newX, newY) {
  const updates = new Map(); // Хранит новые позиции для отправки на сервер
  const timestamp = Date.now(); // timestamp **********

  // проверяет - ON / OFF и подбирает под поле
  // Фиксированные размеры коллайдера в абсолютных единицах
  let colliderWidth, colliderHeight;
  if (checkboxCollisions.checked) {
    whatBoard === "world" ? (colliderWidth = 7.5, colliderHeight = 8) : (colliderWidth = 11, colliderHeight = 8);
  } else {
     // очень маленький размер (эффект отключения столкновений)
    colliderWidth = 0.0000001;
    colliderHeight = 0.0000001;
  }

  pieces.forEach((piece, id) => {
    if (piece === movingPiece) return; // отсев фишки клиента, которую двигают

    let piecePosX = parseFloat(piece.style.left); // позиции каждой из фишек
    let piecePosY = parseFloat(piece.style.top);
    // определяем расстояние от движущейся фишки до остальных:
    const dx = newX - piecePosX;
    const dy = newY - piecePosY;
    // Нормализуем расстояние с учетом размеров коллайдера
    const normalizedDx = dx / (colliderWidth / 2);
    const normalizedDy = dy / (colliderHeight / 2);
    const distance = Math.sqrt(normalizedDx * normalizedDx + normalizedDy * normalizedDy); // формула Пифагора

     // отсев до момента столкновения
    if (distance >= 1) return; // 1 - нормализованное расстояние столкновения
    
    // Вычисляем направление сдвига
    const angle = Math.atan2(dy, dx);
    const pushDistance = (1 - distance) * Math.min(colliderWidth, colliderHeight) / 2;

    // Новая позиция для столкнувшейся фишки
    let newPieceX = piecePosX - Math.cos(angle) * pushDistance;
    let newPieceY = piecePosY - Math.sin(angle) * pushDistance;
    // проверка на 0-100%
    newPieceX = Math.max(0, Math.min(100, newPieceX));
    newPieceY = Math.max(0, Math.min(100, newPieceY));

    piece.style.left = `${newPieceX}%`;
    piece.style.top = `${newPieceY}%`;
    
    updates.set(id, { x: newPieceX, y: newPieceY, timestamp }); // **********
  });

  updates.set(movingPiece.id, { x: newX, y: newY, timestamp }); // **********
  return updates;
}

//////////////////////////////////////////////////////////////////////////////////
// sticky positioning
//////////////////////////////////////////////////////////////////////////////////

// Функция для вычисления расстояния между двумя точками:
function distance2D(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function randomFloat(min, max) {
  return min + Math.random() * (max + 1 - min);
}

// Функция "магнитного" притяжения:
function tryMagnet(player) {
  if (!points.length) return; // если нет точек, то все прерываем сразу

  const sortedPlaces = points.map(el => ({
    stickyEl: el,
    distance: distance2D(el.offsetLeft, el.offsetTop, player.offsetLeft, player.offsetTop)
  })).sort((a, b) => a.distance - b.distance); // сортируем по длине все отрезки

  const nearest = sortedPlaces[0]; // выбираем самую близкую точку

  // дистанция для прилипания - 4%:
  let distanceToStick = (board.clientWidth * 4) / 100;

  if (nearest.distance < distanceToStick) {
    console.log('magnet activated');

    let posInPercentLeft = nearest.stickyEl.offsetLeft / board.clientWidth * 100;
    let posInPercentTop = nearest.stickyEl.offsetTop / board.clientHeight * 100;

    // когда несколько на одной клетке липучей, то сдвигается хаотично на чуть-чуть
    if (nearest.stickyEl.classList.contains("notEmpty")) {
      posInPercentLeft += randomFloat(-1, 1);
      posInPercentTop += randomFloat(-1, 1);
    }
    player.style.left = posInPercentLeft + '%';
    player.style.top = posInPercentTop + '%';

    let id = player.id;
    ws.send(JSON.stringify({
      type: 'move',
      id,
      x: posInPercentLeft,
      y: posInPercentTop
    }));

    // проверяем на совпадение фишки и клетки
    isEmptyPoint();
  }
};

//////////////////////////////////////////////////////////////////////////////////
// Empty Points or Not Empty Points
//////////////////////////////////////////////////////////////////////////////////
function isEmptyPoint() {
  if (!points.length) return; // если нет точек, то все прерываем сразу

  // Проходим по каждому элементу .place
  points.forEach(point => {
    // Получаем координаты точек
    const pointRect = point.getBoundingClientRect();
    const pointX = pointRect.left;
    const pointY = pointRect.top;

    // Флаг для отслеживания совпадений
    let hasMatch = false;

    // Сравниваем с каждым player
    players.forEach(player => {
      // Получаем координаты фишек
      const playerRect = player.getBoundingClientRect();
      const playerX = playerRect.left;
      const playerY = playerRect.top;

      // Проверяем, совпадают ли координаты
      if (Math.abs(playerX - pointX) < 1 && Math.abs(playerY - pointY) < 1) {
        hasMatch = true;
      }
    });
    // Добавляем или убираем класс в зависимости от результата
    if (hasMatch) {
      point.classList.add('notEmpty');
    } else {
      point.classList.remove('notEmpty');
    }
  });
}

// включаем проверку сразу, как только сдвинули мышку, чтоб сразу убрать флаг, если точка уже не занята
document.addEventListener('mousemove', isEmptyPoint);
document.addEventListener('touchmove', isEmptyPoint);

//////////////////////////////////////////////////////////////////////////////////
// zoom + pan
//////////////////////////////////////////////////////////////////////////////////
let initialDistance = 0;
let initialZoom = 100;
let initialX = 0;
let initialY = 0;

function getDistance(touch1, touch2) {
  const dx = touch2.pageX - touch1.pageX;
  const dy = touch2.pageY - touch1.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Вычисление средней точки между двумя касаниями
function getMidpoint(touch1, touch2) {
  return {
    x: (touch1.pageX + touch2.pageX) / 2,
    y: (touch1.pageY + touch2.pageY) / 2
  };
}

board.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (e.touches.length === 2) {
    // Два пальца - инициализация масштабирования и перемещения
    initialDistance = getDistance(e.touches[0], e.touches[1]);
    initialZoom = parseFloat(getComputedStyle(board).getPropertyValue('--zoom'));
    const midpoint = getMidpoint(e.touches[0], e.touches[1]);
    initialX = midpoint.x - parseFloat(getComputedStyle(board).getPropertyValue('--x'));
    initialY = midpoint.y - parseFloat(getComputedStyle(board).getPropertyValue('--y'));
  }
});

board.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (e.touches.length === 2) {
    // Масштабирование
    const currentDistance = getDistance(e.touches[0], e.touches[1]);
    const scaleFactor = currentDistance / initialDistance;
    let newZoom = initialZoom * scaleFactor;
    // ограничение для zoom: 100% - 300%
    newZoom = Math.max(100, Math.min(300, newZoom));
    board.style.setProperty('--zoom', newZoom);

    // Перемещение двумя пальцами (по средней точке)
    const midpoint = getMidpoint(e.touches[0], e.touches[1]);
    const newX = midpoint.x - initialX;
    const newY = midpoint.y - initialY;
    board.style.setProperty('--x', `${newX}px`);
    board.style.setProperty('--y', `${newY}px`);
  }
});

board.addEventListener('touchend', (e) => {
  e.preventDefault();
  initialDistance = 0;
});

/////////////////////////////////////////////
/////////////////////////////////////////////
// double tap/click - zoom and pan reset

let lastTap = 0;

function resetBoardZoomPan() {
  board.style.setProperty('--x', "0px");
  board.style.setProperty('--y', "0px");
  board.style.setProperty('--zoom', "100");
}

board.addEventListener('touchstart', () => {
  const currentTime = new Date().getTime();
  const tapInterval = currentTime - lastTap;
  if (tapInterval < 300 && tapInterval > 100) {
    resetBoardZoomPan();
  }
  lastTap = currentTime;
});

board.addEventListener('dblclick', () => {
  resetBoardZoomPan();
});

/////////////////////////////////////////////
/////////////////////////////////////////////
// prevent default zooming for <body>
body.addEventListener('touchstart', preventZooming);
body.addEventListener('touchmove', preventZooming);
body.addEventListener('touchend', preventZooming);

function preventZooming(e) {
  // Проверяем, если больше одного касания:
  if (e.touches && e.touches.length > 1) e.preventDefault();
}
/////////////////////////////////////////////
/////////////////////////////////////////////
// zooming + panning with navigation buttons
plusButton.addEventListener('mousedown', zoomInBoard);
plusButton.addEventListener('touchstart', zoomInBoard);

minusButton.addEventListener('mousedown', zoomOutBoard);
minusButton.addEventListener('touchstart', zoomOutBoard);

// moveButton.addEventListener('mousedown', toggleMoving);
// moveButton.addEventListener('touchstart', toggleMoving);
moveButton.addEventListener('click', toggleMoving);

body.addEventListener('mousemove', moveBoard);
body.addEventListener('touchmove', moveBoard);

function zoomInBoard(e) {
  e.preventDefault();
  let currentZoom = parseFloat(getComputedStyle(board).getPropertyValue('--zoom'));
  let newZoom = currentZoom * 1.3; // exponential zoom +
  // ограничение для zoom: 100% - 300%
  newZoom = Math.max(100, Math.min(371, newZoom)); // 5 нажатий !
  board.style.setProperty('--zoom', newZoom);
}

function zoomOutBoard(e) {
  e.preventDefault();
  let currentZoom = parseFloat(getComputedStyle(board).getPropertyValue('--zoom'));
  let newZoom = currentZoom / 1.3; // exponential zoom -
  // ограничение для zoom: 100% - 300%
  newZoom = Math.max(100, Math.min(371, newZoom)); // 5 нажатий !
  board.style.setProperty('--zoom', newZoom);
}

function toggleMoving(e) {
  e.preventDefault();
  // Грок усовершенствовал это:
  activatedMoving = !activatedMoving; // инверсирование
  moveButton.classList.toggle("active", activatedMoving);
  board.classList.toggle("panning-mode", activatedMoving);

  console.log("panning mode: " + activatedMoving);
}

board.addEventListener('mousedown', (e) => {
  e.preventDefault();
  if (activatedMoving) {
    boardIsMoving = true;
    initialX = e.clientX - parseFloat(getComputedStyle(board).getPropertyValue('--x'));
    initialY = e.clientY - parseFloat(getComputedStyle(board).getPropertyValue('--y'));
    board.classList.add("panning-active");
  }
});

board.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (e.touches.length === 1 && activatedMoving) {
    boardIsMoving = true;
    initialX = e.touches[0].pageX - parseFloat(getComputedStyle(board).getPropertyValue('--x'));
    initialY = e.touches[0].pageY - parseFloat(getComputedStyle(board).getPropertyValue('--y'));
  }
});

body.addEventListener('mouseup', (e) => {
  e.preventDefault();
  if (boardIsMoving) {
    boardIsMoving = false;
    board.classList.remove("panning-active");
  }
});

body.addEventListener('touchend', (e) => {
  // e.preventDefault(); // ломает тачскрин нажатия в меню !!!
  if (boardIsMoving) boardIsMoving = false;
});

function moveBoard(e) {
  if (boardIsMoving) {
    // Перемещение одним пальцем
    const newX = (e.clientX ?? (e.touches && e.touches[0].pageX)) - initialX;
    const newY = (e.clientY ?? (e.touches && e.touches[0].pageY)) - initialY;
    board.style.setProperty('--x', `${newX}px`);
    board.style.setProperty('--y', `${newY}px`);
  }
}

/////////////////////////////////////////////
/////////////////////////////////////////////
// Game Boards with various aspect ratios:

function updateGameBoardSize(bbb) {
  if (bbb = "world") {
    originalAspectRatio = 3 / 2; // выставляем пропорции игрового поля
  }

  const windowWidth = window.innerWidth; // Размеры окна
  const windowHeight = window.innerHeight;
  const minSide = Math.min(windowWidth, windowHeight); // Минимальная сторона окна

  let boardWidth, boardHeight;

  if (windowWidth < windowHeight) {
    // Вертикальная ориентация: ширина равна минимальной стороне
    boardWidth = minSide;
    boardHeight = boardWidth / originalAspectRatio;

    // Если высота превышает окно, подстраиваем под высоту
    if (boardHeight > windowHeight) {
      boardHeight = windowHeight;
      boardWidth = boardHeight * originalAspectRatio;
    }
  } else {
    // Горизонтальная ориентация: высота равна минимальной стороне
    boardHeight = minSide;
    boardWidth = boardHeight * originalAspectRatio;

    // Если ширина превышает окно, подстраиваем под ширину
    if (boardWidth > windowWidth) {
      boardWidth = windowWidth;
      boardHeight = boardWidth / originalAspectRatio;
    }
  }

  board.style.width = `${boardWidth}px`;
  board.style.height = `${boardHeight}px`;
}

function adaptBoard() {
  resetBoardZoomPan(); // reset zoom + pan
  
  if (!isSquareBoard) {
    updateGameBoardSize(whatBoard);
  } else {
    board.style.width = ''; // убираем инлайн стили (переключаем на CSS)
    board.style.height = '';
    originalAspectRatio = 1 / 1; // reset aspect ratio
  }
}

window.addEventListener("resize", adaptBoard);

//////////////////////////////////////////////////////////////////////////////////
// adaptive scale for Players
//////////////////////////////////////////////////////////////////////////////////
function adaptScaleForPlayers() {
  // console.log(whatBoard + " - " + originalAspectRatio);

  // let boardWidth = board.getBoundingClientRect().width; // плохое, ломает масштаб фишек, если применен Zoom.

  // width из CSS без применения Scale !!! Иначе когда есть zoom у карты, то ломается автомасштаб фишек:
  let boardWidth = parseFloat(getComputedStyle(board).getPropertyValue('width'));
  // let boardWidth = parseFloat(board.style.width); // чистый inline CSS !!!
  
  // console.log(boardWidth);

  let www;
  // let hhh;
  let scaleFactor;

  if (originalAspectRatio !== 1) {
    if (originalAspectRatio > 1) { // horizontal map
      www = 800 * originalAspectRatio; // aspect ratio of the world map
      // hhh = 800;
    } else if (originalAspectRatio < 1) { // vertical map
      www = 800;
      // hhh = 800 / originalAspectRatio;
    }
  } else {
    www = 800; // 1:1 aspect ratio -- default
    // hhh = 800;
  }

  scaleFactor = boardWidth / www;

  // применяем масштаб ко всем фишкам
  players.forEach(player => {
    player.style.transform = `scale(${scaleFactor})`;
  });
  // console.log(scaleFactor);
}

window.addEventListener('resize', adaptScaleForPlayers);
