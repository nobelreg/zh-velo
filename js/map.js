import { fetchYesterday, fetchLastWeek, fetchYearByMonths } from './queries.js';
import { drawChart, cloneAndReplace } from './chart.js';
import { stations } from './geojson/taz.view_eco_standorte.js';

let currentLayer = null;
// let justClosed = null;
// let reset = false;

let map, stationLayers;

// window.addEventListener('DOMContentLoaded', init);

export const loadMap = () => {

	map = L.map('map', { /* dragging: !L.Browser.mobile, */ tap: !L.Browser.mobile }).setView([47.36667, 8.54], 13)
	.on('click', (e) => { // not on a marker!
		showLayers();
		reloadChart(null, []);
		currentLayer = null;
	});

	stationLayers = L.geoJSON(stations, {
		filter: (feature, layer) => {	
			// if no longer in use (bis = set), don't display
			return (feature.properties && feature.properties.bis) ? false : true;
		}, // markers:
		pointToLayer: (feature, latlng) => {
				return L.circleMarker(latlng, {
					radius: 8,
					// fillColor: feature.properties.abkuerzung.substr(0,3) == 'VZS' ? "#5DB755" : '#4072B4',
					fillColor: feature.properties.abkuerzung.substr(0,3) == 'VZS' ? "#4072B4" : '#b0bec5', // '#9e9e9e',
					color: "#ccc",
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
		},
		onEachFeature: popup
	}).addTo(map)
		.on('click', (e) => { // on a marker
		
			if (currentLayer !== e.layer) {
					// currentLayer = e.layer;
				const station_arr = [];
				stations.features.forEach((elm, i) => {
					if (elm.properties.abkuerzung == e.layer.feature.properties.abkuerzung) {
						// preparing for use with DB, with '
						station_arr[i] = '\'' + elm.properties.fk_zaehler + '\'';
					}
				});

				reloadChart(e.layer.feature.properties.bezeichnung, station_arr);
				e.layer.feature.properties.highlight = true;
				hideLayers();
			
				currentLayer = e.layer;
			}
		});
		
	const tileLayer = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
			'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
		id: 'mapbox/light-v9',
		tileSize: 512,
		zoomOffset: -1
	}).addTo(map);
}	

const popup = (feature, layer) => {
	let popupContent = '';
	if (feature.properties && feature.properties.fk_zaehler && feature.properties.bezeichnung) {
		// popupContent += feature.properties.popupContent;
		popupContent += '<b>' + feature.properties.fk_zaehler + '</b>';
		popupContent += '<p>' + feature.properties.bezeichnung + '</p>';	
	} else {
		popupContent += '<p>hier</p>';
	}

	layer.bindPopup(popupContent, {layer: layer, closeButton: false})     
}

const showLayers = () => {
  stationLayers.eachLayer((layer) => {
    layer.feature.properties.highlight = false;
    map.addLayer(layer);
  });
}

const hideLayers = () => {
  stationLayers.eachLayer((layer, i) => {
		if(!layer.feature.properties.highlight) {
			map.removeLayer(layer);
		}
	});
}

const reloadChart = (stationName = null, station_arr = []) => {
	document.getElementById('canvas').classList.add('h-element--half-transparent');			
	document.getElementById('loading').classList.remove('h-element--hide');			
	const classList = document.querySelectorAll('.navi .active')[0].classList;
			
		if (classList.contains('day')) {
			fetchLastWeek(station_arr); // days	
		} else if (classList.contains('mon')) {
			fetchYearByMonths(station_arr); // mon		
		} else { // we use "the first option" (std)
			fetchYesterday(station_arr);		
		}
		
		setChartDescription(stationName);
}

const setChartDescription = (stationName = null) => {
		document.querySelector('.content__item--canvas h2 span').innerText = stationName ? ' «' + stationName + '»' : '';	
}

// on navigation change "reset map"
export const mapViewReset = () => {
	// map.viewreset();
  // reset = true;
	showLayers();
  map.closePopup();
	setChartDescription('')
}
