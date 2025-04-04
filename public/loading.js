// Массив с URL изображений для загрузки
const imagesToLoad = [
  './images/world.jpg',
  './images/ludo.jpg',
  './images/ladders2.jpg',
  './images/ludo-6x.jpg',
  './images/wooden2.jpg',
  './images/player1.png',
  './images/player2.png',
  './images/player3.png',
  './images/player4.png',
  './images/player5.png',
  './images/player6.png',
];

let loadedImages = 0;
const totalImages = imagesToLoad.length;

// Функция для проверки завершения загрузки
function checkAllImagesLoaded() {
  loadedImages++;
  if (loadedImages === totalImages) {
    // Все изображения загружены, выполняем редирект:

    // req.body.autojoin === 'true'
    fetch('/create-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autojoin: true })
    })
    .then(response => {
      if (response.redirected) {
        window.location.href = response.url; // Редирект на /:roomId
      } else {
        return response.json().then(data => {
          window.location.href = `/${data.roomId}`;
        });
      }
    })
    .catch(error => {
      console.error('Error:', error);
      window.location.href = '/start'; // Редирект на стартовую страницу при ошибке
    });
    
  }
}

// Загружаем изображения
imagesToLoad.forEach(src => {
  const img = new Image();
  img.onload = checkAllImagesLoaded;
  img.onerror = checkAllImagesLoaded; // Обрабатываем случай ошибки загрузки
  img.src = src;
});

// Тайм-аут на случай, если что-то пошло не так
setTimeout(() => {
  window.location.href = '/start';
}, 60000); // 60 сек