/**
 * Modal Stuffs
 */

function bindModalOpen() {
  const openmodal = document.querySelectorAll('.modal-open');
  for (let i = 0; i < openmodal.length; i++) {
    openmodal[i].addEventListener('click', function (event) {
      event.preventDefault();
      toggleModal();
    });
  }
}

const overlay = document.querySelector('.modal-overlay');

function bindModalClose() {
  overlay.addEventListener('click', toggleModal);
  const closemodal = document.querySelectorAll('.modal-close');
  for (var i = 0; i < closemodal.length; i++) {
    closemodal[i].addEventListener('click', toggleModal);
  }

  document.onkeydown = function (evt) {
    evt = evt || window.event;
    var isEscape = false;
    if ('key' in evt) {
      isEscape = evt.key === 'Escape' || evt.key === 'Esc';
    } else {
      isEscape = evt.keyCode === 27;
    }
    if (isEscape && document.body.classList.contains('modal-active')) {
      toggleModal();
    }
  };
}

function toggleModal() {
  const body = document.querySelector('body');
  const modal = document.querySelector('.modal');
  modal.classList.toggle('opacity-0');
  modal.classList.toggle('pointer-events-none');
  body.classList.toggle('modal-active');
}

/**
 * Main application
 */

let map;
let allReviews = [];

document.addEventListener(
  'DOMContentLoaded',
  function () {
    // wake the instance
    fetch(`${process.env.BACKEND}`);
    bindModalClose();
    bindModalOpen();
    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 1.3521, lng: 103.8198 },
      zoom: 11,
    });
    document.getElementById('search').addEventListener('submit', handleSearch);
    document
      .querySelector('#review-form')
      .addEventListener('submit', handleSubmit);
  },
  false,
);

function createMarker(place) {
  const marker = new google.maps.Marker({
    map,
    position: place.geometry.location,
  });
  return marker;
}

function handleSearch(e) {
  e.preventDefault();
  document.querySelector('.header').classList.add('active');
  showLoading();
  const request = {
    query: `${e.target[0].value}, Singapore`,
    fields: ['name', 'geometry', 'formatted_address', 'plus_code', 'place_id'],
  };
  const service = new google.maps.places.PlacesService(map);
  promisifySearchQuery(service)(request)
    .then((results) => {
      const p = results[0];
      const lng = p.geometry.location.lng();
      const lat = p.geometry.location.lat();
      document.getElementById('address').textContent = p.formatted_address;
      document.querySelector('#review-form [name="formatted_address"]').value =
        p.formatted_address;
      document.querySelector('#review-form [name="lng"]').value = lng;
      document.querySelector('#review-form [name="lat"]').value = lat;
      createMarker(p);
      map.setCenter(p.geometry.location);
      map.setZoom(17);
      return searchReviews(lng, lat);
    })
    .then((reviews) => {
      updateReviewState(reviews);
      loadingDone('map');
    })
    .catch(() => {
      loadingDone('construction');
    });
}

function showLoading() {
  document.getElementById('construction-container').style.display = 'none';
  document.getElementById('map-container').style.display = 'none';
  document.getElementById('loading').style.display = 'block';
}
function loadingDone(whatToShow = 'map') {
  document.getElementById(`${whatToShow}-container`).style.display = 'block';
  document.getElementById('loading').style.display = 'none';
}

function searchReviews(lng, lat) {
  return new Promise((resolve) => {
    fetch(`${process.env.BACKEND}/api/reviews?lat=${lat}&lng=${lng}`)
      .then((res) => [res.status, res.json()])
      .then(([status, data]) => {
        if (status > 299 || status < 200) {
          return [];
        }
        return data;
      })
      .then((reviews) => {
        resolve(
          reviews.map((v) => {
            for (const k in v) {
              v[k] = escapeHTML(v[k]);
            }
            return v;
          }),
        );
      })
      .catch((e) => {
        console.error(e);
        resolve([]);
      });
  });
}

function promisifySearchQuery(service) {
  return function (request) {
    return new Promise((resolve, reject) => {
      service.findPlaceFromQuery(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          resolve(results);
        } else {
          reject(new Error(`Request failed with status ${status}`));
        }
      });
    });
  };
}

function updateReviewState(reviews) {
  allReviews = reviews;
  renderReviewsHTML();
}
function renderReviewsHTML() {
  if (allReviews.length === 0) {
    document.getElementById('review').innerHTML = `
    <hr />
    <div class="review-entry">
        <h4 class="text-md">No reviews nearby here yet.
            <button class="modal-open hover:underline text-blue-500">Submit one?</button>
        </h4>
    </div>`;
    bindModalOpen();
    return;
  }
  document.getElementById('review').innerHTML = allReviews
    .map(
      (r) => `
    <hr />
    <div class="review-entry">
        <h4 class="text-md font-bold">${r.formatted_address} #${r.floor} - ${
        r.unit_number
      }</h4>
        <p class="text-sm">${r.author ? r.author.name : 'Anonymous'}</p>
        <p class="mt-1">${r.review_text}</p>
    </div>
  `,
    )
    .join('');
}

function escapeHTML(str) {
  var p = document.createElement('p');
  p.appendChild(document.createTextNode(str));
  return p.innerHTML;
}

function handleSubmit(e) {
  e.preventDefault();
  const payload = {
    formatted_address: document.querySelector(
      '#review-form [name="formatted_address"]',
    ).value,
    lat: parseFloat(document.querySelector('#review-form [name="lat"]').value),
    lng: parseFloat(document.querySelector('#review-form [name="lng"]').value),
    floor: document.querySelector('#review-form [name="floor"]').value,
    unit_number: document.querySelector('#review-form [name="unit_number"]')
      .value,
    review_text: document.querySelector('#review-form [name="review_text"]')
      .value,
  };

  document
    .querySelector('#review-form button[type="submit"]')
    .setAttribute('disabled', true);
  document.querySelector('#review-form button[type="submit"]').textContent =
    'Submitting...';
  fetch(`${process.env.BACKEND}/api/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then((resp) => Promise.all([resp.status, resp.json()]))
    .then(([status, data]) => {
      if (status > 299 || status < 200) {
        throw new Error(data.message);
      }
      updateReviewState([data, ...allReviews]);
      toggleModal();
    })
    .catch((e) => showFormError(e.message))
    .finally(() => {
      document
        .querySelector('#review-form button[type="submit"]')
        .removeAttribute('disabled');
      document.querySelector('#review-form button[type="submit"]').textContent =
        'Submit';
    });
}

function showFormError(msg) {
  const errMsg = document.getElementById('error-message');
  errMsg.textContent = msg;
  errMsg.classList.remove('hidden');
  setTimeout(() => {
    errMsg.textContent = '';
    errMsg.classList.add('hidden');
  }, 5000);
}
