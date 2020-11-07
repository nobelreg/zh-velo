import { fetchData } from './queries.js';
import { stations } from './geojson/taz.view_eco_standorte.js';

let currentLayer = null;

let map, stationLayers;

export const loadMap = () => {
	map = L.map('map', { /* dragging: !L.Browser.mobile, */ tap: !L.Browser.mobile }).setView([47.36667, 8.54], 13)
	.on('click', (e) => { // not on a marker!
		if (currentLayer) { // and only "once"
			showLayers();
			reloadChart(null, []);
			currentLayer = null;
		}
	});

	/* WFS: https://www.ogd.stadt-zuerich.ch/wfs/geoportal/Standorte_der_automatischen_Fuss__und_Velozaehlungen?SERVICE=WFS&REQUEST=GetCapabilities&VERSION=1.1.0 */

	stationLayers = L.geoJSON(stations, {
		filter: (feature, layer) => {	
			// if no longer in use (bis = set), don't display
			return (feature.properties && feature.properties.bis) ? false : true;
		}, // markers:
		pointToLayer: (feature, latlng) => {
				return L.circleMarker(latlng, {
					radius: 8,
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
			
		if (classList.contains('day')) { fetchData('day', station_arr);	
		} else if (classList.contains('mon')) { fetchData('mon', station_arr);
		} else { // we use "the first option" (std)
			fetchData('std', station_arr);	
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
  currentLayer = null;
	showLayers();
  map.closePopup();
	setChartDescription('');
}
