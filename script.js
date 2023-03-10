const MAP_HEIGHT_PX = 296704; // Total height of the map in px at max zoom level
const RS_TILE_WIDTH_PX = 32,
  RS_TILE_HEIGHT_PX = 32; // Width and height in px of an rs tile at max zoom level
const RS_OFFSET_X = 1152; // Amount to offset x coordinate to get correct value
const RS_OFFSET_Y = 8328; // Amount to offset y coordinate to get correct value

var map = L.map("map").setView([-78.20207141002261, -135.7196044921875], 9);

L.tileLayer(
  "https://raw.githubusercontent.com/Explv/osrs_map_tiles/master/0/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    zoomDelta: 0.5,
    zoomSnap: 0.5,
    minZoom: 8,
    maxZoom: 11,
    attribution: "Map data",
    noWrap: true,
    tms: true,
  }
).addTo(map);

let marker = L.marker([-78.20207141002261, -135.7196044921875]).addTo(map);
let clickedCoordinates;
const socket = new WebSocket("ws://localhost:8765");

map.on("click", function (e) {
  // Gets the coordinates of the clicked point
  let latlng = e.latlng;

  // Assigns the coordinates to the variable
  clickedCoordinates = latlng;

  // Removes marker if already exists
  if (marker) {
    map.removeLayer(marker);
  }

  // Converts latlng to a point
  let point = map.project(latlng, map.getMaxZoom());
  let y = MAP_HEIGHT_PX - point.y + RS_TILE_HEIGHT_PX / 4;
  y = Math.round((y - RS_TILE_HEIGHT_PX) / RS_TILE_HEIGHT_PX) + RS_OFFSET_Y;
  let x =
    Math.round((point.x - RS_TILE_WIDTH_PX) / RS_TILE_WIDTH_PX) + RS_OFFSET_X;

  // Sends x and y to the python script through the websocket
  socket.send(x + "," + y);

  // Creates a new marker at the clicked location
  marker = L.marker(latlng).addTo(map);
  // Listens for a response from the python script
  socket.onmessage = function (e) {
    marker.bindPopup(e.data).openPopup();
  };
});

// Fetches json data for all locations converted to latlng
fetch("resources/locations_latlng.json")
  .then((response) => response.json())
  .then((data) => {
    var locations = [];
    data.locations.forEach(function (location) {
      locations.push(location.name);
      var marker = L.marker(location.coords, {
        icon: L.divIcon({
          className: "label-text",
          html: location.name,
        }),
      }).addTo(map);
    });
    var searchBar = document.getElementById("search-bar");
    var suggestions = document.getElementById("suggestions");
    searchBar.addEventListener("input", function () {
      // Gets the input value
      var inputValue = searchBar.value.toLowerCase();
      var matchingLocations = [];

      // filters locations
      locations.forEach(function (location) {
        if (location.toLowerCase().startsWith(inputValue)) {
          matchingLocations.push(location);
        }
      });

      // Clears previous suggestions
      suggestions.innerHTML = "";

      // Adds new suggestions
      matchingLocations.forEach(function (matchingLocation) {
        var option = document.createElement("option");
        option.value = matchingLocation;
        option.innerHTML = matchingLocation;
        suggestions.appendChild(option);
      });
    });

    searchBar.addEventListener("keyup", function (event) {
      if (event.key === "Enter") {
        var selectedLocation = searchBar.value; // Flys to location if exists
        data.locations.forEach(function (location) {
          if (location.name.toLowerCase() === selectedLocation.toLowerCase()) {
            map.flyTo(location.coords, 8, { maxZoom: 8 });
          }
        });
      }
    });

    suggestions.addEventListener("change", function () {
      var selectedLocation = suggestions.value;
      data.locations.forEach(function (location) {
        if (location.name === selectedLocation) {
          map.flyTo(location.coords, 8, { maxZoom: 8 });
        }
      });
    });

    document
      .getElementById("search-bar")
      .addEventListener("input", function () {
        var inputValue = this.value;
        var suggestions = document.getElementById("suggestions");
        if (inputValue !== "") {
          suggestions.style.display = "block";
        } else {
          suggestions.style.display = "none";
        }
      });
  });
