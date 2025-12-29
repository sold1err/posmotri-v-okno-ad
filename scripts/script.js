/* КОНФИГ */
const preloaderWaitindTime = 1200;
const cardsOnPage = 5;
const BASE_URL = 'https://v-content.practicum-team.ru';
const BASE_ENDPOINT = `${BASE_URL}/api/videos?pagination[pageSize]=${cardsOnPage}&`;

/* ЭЛЕМЕНТЫ СТРАНИЦЫ */
const cardsList = document.querySelector('.content__list');
const cardsContainer = document.querySelector('.content__list-container') || cardsList;
const videoContainer = document.querySelector('.result__video-container');
const videoElement = document.querySelector('.result__video');
const form = document.querySelector('form');

/* ТЕМПЛЕЙТЫ */
const cardTmp = document.querySelector('.cards-list-item-template');
const preloaderTmp = document.querySelector('.preloader-template');
const videoNotFoundTmp = document.querySelector('.error-template');
const moreButtonTmp = document.querySelector('.more-button-template');

/* СОСТОЯНИЕ */
let cardsOnPageState = [];

/* ПЕРВАЯ ЗАГРУЗКА */
showPreloader(preloaderTmp, videoContainer);
showPreloader(preloaderTmp, cardsList);
mainMechanics(BASE_ENDPOINT);

/* ПОИСК */
form.onsubmit = (e) => {
  e.preventDefault();

  cardsList.textContent = '';

  const buttonInDOM = document.querySelector('.more-button');
  if (buttonInDOM) buttonInDOM.remove();

  [...videoContainer.children].forEach((el) => {
    if (el.classList.contains('error')) el.remove();
  });

  showPreloader(preloaderTmp, videoContainer);
  showPreloader(preloaderTmp, cardsList);

  const formData = serializeFormData(form);
  const requestUrl = generateFilterRequest(
    BASE_ENDPOINT,
    formData.city,
    formData.timeArray
  );

  mainMechanics(requestUrl);
};

/* ОСНОВНАЯ ЛОГИКА */
async function mainMechanics(endpoint) {
  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    cardsOnPageState = data.results;

    if (!data?.results?.length) {
      throw new Error('not-found');
    }

    appendCards({
      baseUrl: BASE_URL,
      dataArray: data.results,
      cardTmp,
      container: cardsList,
    });

    setVideo({
      baseUrl: BASE_URL,
      video: videoElement,
      videoUrl: data.results[0].video.url,
      posterUrl: data.results[0].poster.url,
    });

    document
      .querySelector('.content__card-link')
      .classList.add('content__card-link_current');

    await waitForReadyVideo(videoElement);
    await delay(preloaderWaitindTime);

    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsList, '.preloader');

    chooseCurrentVideo({
      baseUrl: BASE_URL,
      videoData: cardsOnPageState,
      cardLinksSelector: '.content__card-link',
      currentLinkClassName: 'content__card-link_current',
      mainVideo: videoElement,
    });

    showMoreCards({
      dataArray: data,
      buttonTemplate: moreButtonTmp,
      cardsList,
      buttonSelector: '.more-button',
      initialEndpoint: endpoint,
      baseUrl: BASE_URL,
      cardTmp,
    });
  } catch (err) {
    showError(
      videoContainer,
      videoNotFoundTmp,
      err.message === 'not-found'
        ? 'Нет подходящих видео =('
        : 'Ошибка получения данных :('
    );

    removePreloader(videoContainer, '.preloader');
    removePreloader(cardsList, '.preloader');
    console.error(err);
  }
}

/* УТИЛИТЫ */

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ✅ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ */
function waitForReadyVideo(video) {
  return new Promise((resolve) => {
    if (video.readyState >= 4) {
      resolve();
    } else {
      video.addEventListener('canplaythrough', resolve, { once: true });
    }
  });
}

function showPreloader(tmp, parent) {
  const node = tmp.content.cloneNode(true);
  parent.append(node);
}

function removePreloader(parent, selector) {
  const preloader = parent.querySelector(selector);
  if (preloader) preloader.remove();
}

function appendCards({ baseUrl, dataArray, cardTmp, container }) {
  dataArray.forEach((el) => {
    const node = cardTmp.content.cloneNode(true);
    const link = node.querySelector('.content__card-link');

    link.id = el.id;
    node.querySelector('.content__video-card-title').textContent = el.city;
    node.querySelector('.content__video-card-description').textContent =
      el.description;

    const img = node.querySelector('.content__video-card-thumbnail');
    img.src = `${baseUrl}${el.thumbnail.url}`;
    img.alt = el.description;

    container.append(node);
  });
}

function setVideo({ baseUrl, video, videoUrl, posterUrl }) {
  video.src = `${baseUrl}${videoUrl}`;
  video.poster = `${baseUrl}${posterUrl}`;
}

function serializeFormData(form) {
  const city = form.querySelector('input[name="city"]').value;
  const checkboxes = form.querySelectorAll('input[name="time"]');

  const timeArray = [...checkboxes]
    .filter((el) => el.checked)
    .map((el) => el.value);

  return { city, timeArray };
}

/* ✅ БЕЗ МУТАЦИИ */
function generateFilterRequest(baseEndpoint, city, timeArray) {
  let endpoint = baseEndpoint;

  if (city) {
    endpoint += `filters[city][$containsi]=${city}&`;
  }

  if (timeArray?.length) {
    timeArray.forEach((time) => {
      endpoint += `filters[time_of_day][$eqi]=${time}&`;
    });
  }

  return endpoint;
}

function chooseCurrentVideo({
  baseUrl,
  videoData,
  cardLinksSelector,
  currentLinkClassName,
  mainVideo,
}) {
  const links = document.querySelectorAll(cardLinksSelector);

  links.forEach((link) => {
    link.onclick = async (e) => {
      e.preventDefault();

      links.forEach((l) =>
        l.classList.remove(currentLinkClassName)
      );
      link.classList.add(currentLinkClassName);

      showPreloader(preloaderTmp, videoContainer);

      const videoObj = videoData.find(
        (v) => String(v.id) === String(link.id)
      );

      setVideo({
        baseUrl,
        video: mainVideo,
        videoUrl: videoObj.video.url,
        posterUrl: videoObj.poster.url,
      });

      await waitForReadyVideo(mainVideo);
      await delay(preloaderWaitindTime);

      removePreloader(videoContainer, '.preloader');
    };
  });
}

function showError(container, template, message) {
  const node = template.content.cloneNode(true);
  node.querySelector('.error__title').textContent = message;
  container.append(node);
}

function showMoreCards({
  dataArray,
  buttonTemplate,
  cardsList,
  buttonSelector,
  initialEndpoint,
  baseUrl,
  cardTmp,
}) {
  if (dataArray.pagination.page === dataArray.pagination.pageCount) return;

  const button = buttonTemplate.content.cloneNode(true);
  cardsList.after(button);

  const buttonInDOM = document.querySelector(buttonSelector);

  buttonInDOM.onclick = async () => {
    const nextPage = dataArray.pagination.page + 1;
    const url = `${initialEndpoint}pagination[page]=${nextPage}&`;

    const response = await fetch(url);
    const data = await response.json();

    buttonInDOM.remove();

    cardsOnPageState = cardsOnPageState.concat(data.results);

    appendCards({
      baseUrl,
      dataArray: data.results,
      cardTmp,
      container: cardsList,
    });

    chooseCurrentVideo({
      baseUrl,
      videoData: cardsOnPageState,
      cardLinksSelector: '.content__card-link',
      currentLinkClassName: 'content__card-link_current',
      mainVideo: videoElement,
    });

    showMoreCards({
      dataArray: data,
      buttonTemplate,
      cardsList,
      buttonSelector,
      initialEndpoint,
      baseUrl,
      cardTmp,
    });
  };
}
