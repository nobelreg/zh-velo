import { drawChart } from './chart.js';

const URL = 'https://data.stadt-zuerich.ch/api/3/action/datastore_search_sql';
const config = {
	resource_id: 'b9308f85-9066-4f5b-8eab-344c790a6982', // the resource id
};

const MONTHS = ['Jan', 'Feb', 'März', 'April', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const WEEKDAYS = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];

// generic
export const fetchData = async (target = 'std', stations = []) => {
	const where = gatherStations(stations);
	const query = getQuery(target, where);
	
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
		drawChart(combination);
		
		document.getElementById('canvas').classList.remove('h-element--half-transparent');	 
		document.getElementById('loading').classList.add('h-element--hide');
		
		if (target === 'std') { // actually only on first load ...
			document.getElementById('info').classList.remove('h-element--hide');
		}
	} else { // handle errs
  	console.log(response.status, response.statusText);
	}
}

const gatherStations = (stations) => {
	let where = '';
	if (stations.length > 0) {
		where = ' WHERE "FK_ZAEHLER" IN(' + stations.filter((el) => {
  			return el != null;
			}).toString() + ') ';
	}
	return where;
}

const getQuery = (target, where) => {
	if (target == 'day') {	
		return '?sql=SELECT SUBSTRING("DATUM", 1, 10) AS date, SUM("VELO_IN"::INTEGER) as velo, SUM("FUSS_IN"::INTEGER) as fuss from "' 
						+ config.resource_id + '" ' + where + ' GROUP BY date ORDER BY date ASC';					
	} else if (target == 'mon') {
		return '?sql=SELECT SUBSTRING("DATUM", 6, 2) AS mon, SUM("VELO_IN"::INTEGER) as velo, SUM("FUSS_IN"::INTEGER) as fuss from "' 
						+ config.resource_id + '" ' + where + ' GROUP BY mon'; // all 2020
	} // target = 'std' / default
		return '?sql=SELECT SUBSTRING("DATUM", 12, 2) AS hour, SUM("VELO_IN"::INTEGER) as velo, SUM("FUSS_IN"::INTEGER) as fuss from "' 
						+ config.resource_id + '" ' + where + ' GROUP BY hour'; // all 2020
}

// used by hours
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

const combineDAY = (data) => {
	let velo_arr = [0,0,0,0,0,0,0]; 
	let fuss_arr = [0,0,0,0,0,0,0];	
	let velo_total, fuss_total, velo, fuss; velo_total = fuss_total, velo, fuss = 0;
		
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

// used by months
const combineMON = (data) => {
	let velo_arr = []; let fuss_arr = [];	
	let velo_total, fuss_total, mon;
	velo_total = fuss_total = mon = 0;

	data.forEach((elm) => {
		mon = parseInt(elm.mon) - 1; // array starts at 0
		velo_arr[mon] = elm.velo;
		velo_total += parseInt(elm.velo);
		fuss_arr[mon] = elm.fuss;
		fuss_total += parseInt(elm.fuss);
	});
	
	return {'labels': MONTHS.slice(0, fuss_arr.length), // Array.from({length: fuss_arr.length}, (x, i) => (i > 9 ? i : '0' + i)),
					'velo': { 'arr': velo_arr, 'avg': parseInt(velo_total / velo_arr.length) }, 
					'fuss': { 'arr': fuss_arr, 'avg': parseInt(fuss_total / fuss_arr.length) }};
}

/* convenience */
const fetchZaehler = async (date) => {
	
	let query = '?sql=SELECT SUM("VELO_IN"::INTEGER) as velo, SUM("FUSS_IN"::INTEGER) as fuss, "FK_ZAEHLER" as zaehler FROM "b9308f85-9066-4f5b-8eab-344c790a6982" WHERE "DATUM" LIKE \'2020%\' GROUP BY zaehler';
 	 	
  const response = await fetch(url + query);
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
		// drawChart(combination);
	} else { // Handle errors
  	console.log(response.status, response.statusText);
	}
}
