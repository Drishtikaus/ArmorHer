const firebaseConfig = {
    apiKey: "AIzaSyAodVVOsmp6fsvwy6iIIdxmM-HiJ5iQl-A",
    authDomain: "aromerher.firebaseapp.com",
    projectId: "aromerher",
    storageBucket: "aromerher.firebasestorage.app",
    messagingSenderId: "455023528537",
    appId: "1:455023528537:web:8cb4b59b16ba2568cc7f48"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let map = L.map('map').setView([28.6139, 77.2090], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let addRouteMode = false;
let currentSafeRoute = [];
let routingControl;

// Toggle safe route mode
function toggleAddRoute() {
addRouteMode = !addRouteMode;
alert(addRouteMode ? "Tap 2 points to add a Safe Route" : "Route adding off");
currentSafeRoute = [];
}

// Map click for adding safe route
map.on('click', function(e) {
if (!addRouteMode) return;

currentSafeRoute.push(e.latlng);
L.marker(e.latlng).addTo(map);

if (currentSafeRoute.length === 2) {
  const [start, end] = currentSafeRoute;
  const url = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      drawRoute(coords, 'green');
      saveRoute(coords);
    });

  currentSafeRoute = [];
  addRouteMode = false;
}
});

// Draw route
function drawRoute(latlngs, color = 'green') {
L.polyline(latlngs, {
  color: color,
  weight: 5,
  opacity: 0.8
}).addTo(map);
map.fitBounds(latlngs);
}

// Save to Firebase
function saveRoute(coords) {
const id = db.ref('routes').push().key;
db.ref('routes/' + id).set({ coords });
loadRoutes();
}

// Load all saved routes
function loadRoutes() {
const list = document.getElementById('route-list');
list.innerHTML = '';

db.ref('routes').once('value', snapshot => {
  const routes = snapshot.val();
  for (let id in routes) {
    const li = document.createElement('li');
    li.textContent = `Safe Route #${id.slice(-5)}`;
    li.onclick = () => drawRoute(routes[id].coords);
    list.appendChild(li);
  }
});
}

// Clear all from database
function clearAllRoutes() {
if (confirm("Delete all routes?")) {
  db.ref('routes').remove();
  location.reload();
}
}

// Geocode and route
function findRoute() {
const from = document.getElementById('from').value;
const to = document.getElementById('to').value;

if (!from || !to) return alert("Please fill both locations!");

Promise.all([geocode(from), geocode(to)]).then(points => {
  if (routingControl) map.removeControl(routingControl);
  routingControl = L.Routing.control({
    waypoints: points,
    router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
    createMarker: () => null,
    addWaypoints: false,
    show: false
  }).addTo(map);
});
}

function geocode(place) {
return fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${place}`)
  .then(res => res.json())
  .then(data => {
    if (!data[0]) throw "Location not found";
    return L.latLng(data[0].lat, data[0].lon);
  });
}

// Initial load
loadRoutes();

