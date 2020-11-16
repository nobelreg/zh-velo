import { drawChart } from './chart.js';

const URL = 'https://data.stadt-zuerich.ch/api/3/action/datastore_search_sql';
const config = {
	resource_id: 'b9308f85-9066-4f5b-8eab-344c790a6982', // the resource id (2020 | 2019: '33b3e7d3-f662-43e8-b018-e4b1a254f1f4')
};

const MONTHS = ['Jan', 'Feb', 'März', 'April', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const WEEKDAYS = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];

const NOW = new Date();
const TODAY    = NOW.toISOString().split("T")[0];
const DATADATE = localStorage.getItem("dataDate") || null;
let savedQueryData = {};

if (DATADATE === null || DATADATE != TODAY) {
	localStorage.setItem("dataDate", TODAY);
	localStorage.setItem("savedQueryData", "{}");
} else {
	savedQueryData = JSON.parse(localStorage.getItem("savedQueryData"));
} 

/* generic fetch */
export const fetchData = async (target = 'std', stations = []) => {
	const where = gatherStations(stations);
	const query = getQuery(target, where);
	
	let querykey = toHash(query);

	if (typeof savedQueryData[querykey] !== "undefined") {
		drawChart(savedQueryData[querykey]);
		setToActive(target);
	} else {
		const response = await fetch(URL + query);
		if (response.status >= 200 && response.status <= 299) {
			const jsonResponse = await response.json();
			console.log(jsonResponse.result.records.length, jsonResponse);
			let combination;
			if (target === 'day') {	combination = combineDAY(jsonResponse.result.records);
			} else if (target === 'mon') { combination = combineMON(jsonResponse.result.records);
			} else { // target = 'std' / default
				combination = combineSTD(jsonResponse.result.records);
			}
			savedQueryData[querykey] = combination;
			localStorage.setItem("savedQueryData", JSON.stringify(savedQueryData));
			drawChart(combination);
			setToActive(target);
			
		} else { // handle errs
			console.log(response.status, response.statusText);
		}
	}
	// fetchZaehler(); // 45 fuss | 38 velo
}

/* simple hash, for reference storage */
const toHash = (string) => {              
		let hash = 0;
		let len = string.length;
		if (len === 0) return hash; 
			
		for (let i = 0; i < len; i++) { 
				hash = ((hash << 5) - hash) + string.charCodeAt(i); 
				hash |= 0; 
		}			
		return hash; 
} 

/* query qualifier with selected station, 
as well as previous ones at the same location */
const gatherStations = (stations) => {
	let where = '';
	if (stations.length > 0) {
		where = ' WHERE "FK_STANDORT" IN(' + stations.filter((el) => {
  			return el != null;
			}).toString() + ') ';
	}
	return where;
}

/* generic queries, according to navigation 
(and possibly selected station) */
const getQuery = (target, where) => { // encodeURIComponent().
	const fields = 'SUM("VELO_IN"::INTEGER + "VELO_OUT"::INTEGER) AS velo, SUM("FUSS_IN"::INTEGER + "FUSS_OUT"::INTEGER) AS fuss';
	if (target == 'day') {	
		return '?sql=' + encodeURIComponent(
						'SELECT SUBSTRING("DATUM", 1, 10) AS date, ' + fields + 
						' FROM "' + config.resource_id + '" ' + where + 
						' GROUP BY date ORDER BY date ASC');					
	} else if (target == 'mon') {
		return '?sql=' + encodeURIComponent(
						'SELECT SUBSTRING("DATUM", 6, 2) AS mon, ' + fields + 
						' FROM "' + config.resource_id + '" ' + where + 
						' GROUP BY mon ORDER BY mon ASC'); // all 2020
	} // target = 'std' / default
		return '?sql=' + encodeURIComponent(
						'SELECT SUBSTRING("DATUM", 12, 2) AS hour, ' + fields + 
						' FROM "' + config.resource_id + '" ' + where + 
						' GROUP BY hour ORDER BY hour ASC'); // all 2020
}

/* aggregation of data and chart labels
used by hours */
const combineSTD = (data) => {
	let velo_arr = []; let fuss_arr = [];	let date_arr = [];	
	let velo_total, fuss_total, hour;
	velo_total = fuss_total = hour = 0;

	data.forEach((elm) => { // 2020-10-13T21:30	
		hour = parseInt(elm.hour);
		velo_arr[hour] = elm.velo;
		velo_total += parseInt(elm.velo);
		fuss_arr[hour] = elm.fuss;
		fuss_total += parseInt(elm.fuss);
		date_arr[hour] = elm.hour;
	});

  return { 'labels': date_arr, 
					 'velo': { 'arr': velo_arr, 'avg': parseInt(velo_total / velo_arr.length) }, 
  				 'fuss': { 'arr': fuss_arr, 'avg': parseInt(fuss_total / fuss_arr.length) }};
}

/* aggregation of data and chart labels
used by days */
const combineDAY = (data) => {
	let velo_arr = [0,0,0,0,0,0,0]; 
	let fuss_arr = [0,0,0,0,0,0,0];	
	let velo_total, fuss_total, velo, fuss; velo_total = fuss_total = velo = fuss = 0;
		
	const maxIndex = data.length - (data.length % 7);
	let wDay = new Date(data[0].date).getDay(); 

	data.forEach((elm, i) => {
		if (i < maxIndex) {
			velo = parseInt(elm.velo)
			velo_arr[wDay] += velo;
			velo_total += velo;
			fuss = parseInt(elm.fuss);
			fuss_arr[wDay] += fuss;
			fuss_total += fuss;
			wDay = (wDay + 1) % 7;
		}
	});

  return { 'labels': WEEKDAYS, 
					 'velo': { 'arr': velo_arr, 'avg': parseInt(velo_total / velo_arr.length) }, 
  				 'fuss': { 'arr': fuss_arr, 'avg': parseInt(fuss_total / fuss_arr.length) }};
}

/* aggregation of data and chart labels
used by months */
const combineMON = (data) => {
	let velo_arr = []; let fuss_arr = [];	
	let velo_total, fuss_total, velo, fuss, mon;
	velo_total = fuss_total = velo = fuss = mon = 0;
	
	const this_mon = NOW.getMonth();
	const this_year = NOW.getFullYear();
	
	data.forEach((elm) => {
		mon = parseInt(elm.mon) - 1; // array starts at 0
		velo = parseInt(elm.velo);
		velo_arr[mon] = velo;
		fuss = parseInt(elm.fuss);
		fuss_arr[mon] = fuss;
		// don't "diffuse" avg with current months temporary data
		if (this_mon !== mon || this_year !== 2020) {
			velo_total += velo;
			fuss_total += fuss;
		}
	});
			
	return {'labels': MONTHS.slice(0, velo_arr.length), // Array.from({length: fuss_arr.length}, (x, i) => (i > 9 ? i : '0' + i)),
					'velo': { 'arr': velo_arr, 'avg': parseInt(velo_total / ((this_mon !== mon || this_year !== 2020) ? velo_arr.length : velo_arr.length - 1)) }, 
					'fuss': { 'arr': fuss_arr, 'avg': parseInt(fuss_total / ((this_mon !== mon || this_year !== 2020) ? fuss_arr.length : fuss_arr.length - 1)) }};
}

/* displays previously hidden (or half-transparent) elements */
const setToActive = (target) => {
	document.getElementById('canvas').classList.remove('h-element--half-transparent');	 
	document.getElementById('loading').classList.add('h-element--hide');

	if (target === 'std') { // actually only on first load ...
		document.getElementById('info').classList.remove('h-element--hide');
	}
}

/* convenience */
const fetchZaehler = async () => {
	const fields = 'SUM("VELO_IN"::INTEGER + "VELO_OUT"::INTEGER) as velo, SUM("FUSS_IN"::INTEGER + "FUSS_OUT"::INTEGER) as fuss';	
	const query = '?sql=' + encodeURIComponent(
							'SELECT ' + fields + ', "FK_ZAEHLER" as zaehler ' + 
							'FROM "' + config.resource_id + '" WHERE "DATUM" LIKE \'2020%\' GROUP BY zaehler');
 	 	
  const response = await fetch(URL + query);
	if (response.status >= 200 && response.status <= 299) {
  	const jsonResponse = await response.json();
		console.log(jsonResponse.result.records.length, jsonResponse);
		let velo_arr = []; let fuss_arr = [];	
		
		jsonResponse.result.records.forEach((elm, i) => {
			if (elm.velo > 0) {
				console.log('velo', i)
				velo_arr[i] = elm.zaehler
			} 
			if (elm.fuss > 0) {
				console.log('fuss', i)
				fuss_arr[i] = elm.zaehler
			}
		});		
		console.log(velo_arr, fuss_arr)

	} else { // Handle errors
  	console.log(response.status, response.statusText);
	}
}
