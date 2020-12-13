let map;
let allReviews;

document.addEventListener(
  'DOMContentLoaded',
  function () {
    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 1.3521, lng: 103.8198 },
      zoom: 11,
    });
    document.getElementById('search').addEventListener('submit', handleSearch);
    document.querySelector('#search input').value = '60 Marine Drive';
    document.querySelector('#search button').click();
    document
      .querySelector('#review-form')
      .addEventListener('submit', handleSubmit);
    setTimeout(() => {
      document.querySelector('.modal-open').click();
    }, 1100);
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
  Promise.all([promisifySearchQuery(service)(request), searchReviews()]).then(
    ([results, reviews]) => {
      const p = results[0];
      document.getElementById('address').textContent = p.formatted_address;
      document.querySelector('#review-form [name="formatted_address"]').value =
        p.formatted_address;
      document.querySelector(
        '#review-form [name="lng"]',
      ).value = p.geometry.location.lng();
      document.querySelector(
        '#review-form [name="lat"]',
      ).value = p.geometry.location.lat();
      createMarker(p);
      map.setCenter(p.geometry.location);
      map.setZoom(17);
      loadingDone();
      document.getElementById('review').innerHTML = getReviewsHTML(reviews);
    },
  );
}

function showLoading() {
  document.getElementById('map-container').style.display = 'none';
  document.getElementById('loading').style.display = 'block';
}
function loadingDone() {
  document.getElementById('map-container').style.display = 'block';
  document.getElementById('loading').style.display = 'none';
}

function searchReviews() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        [
          {
            formatted_address: '60 Marine Dr, Singapore 440060',
            review_text:
              'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
            floor: 1,
            unit_number: 234,
          },
          {
            formatted_address: '60 Marine Dr, Singapore 440060',
            review_text:
              'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
            floor: 1,
            unit_number: 234,
          },
          {
            formatted_address:
              '60 Marine Dr, Singapore 440060 <span> lolol </span>',
            review_text:
              'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
            floor: 1,
            unit_number: 234,
          },
        ].map((v) => {
          for (const k in v) {
            v[k] = escapeHTML(v[k]);
          }
          return v;
        }),
      );
    }, 1000);
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

function getReviewsHTML(reviews) {
  if (reviews.length === 0) {
    return `
    <hr />
    <div class="review-entry">
        <h4 class="text-md font-bold">No reviews nearby here yet.
            <button class="modal-open no-underline hover:underline text-blue-500">Submit one?</button>
        </h4>
    </div>`;
  }
  return reviews
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
  };
  console.log(payload);
}
