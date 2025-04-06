const loaderContainer = document.querySelector(".loader-container");

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
    // Все изображения загружены, скрываем лоадер:
    loaderContainer.classList.add('hidden');
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
  if(!loaderContainer.contains('hidden')) {
    loaderContainer.classList.add('hidden');
  }
}, 60000); // 60 сек