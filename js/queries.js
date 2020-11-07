import { drawChart } from './chart.js';

const URL = 'https://data.stadt-zuerich.ch/api/3/action/datastore_search_sql';
const config = {
	resource_id: 'b9308f85-9066-4f5b-8eab-344c790a6982', // the resource id
};

const MONTHS = ['Jan', 'Feb', 'März', 'April', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const WEEKDAYS = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];

const NOW = new Date();
const TODAY    = NOW.toISOString().split("T")[0];
const DATADATE = localStorage.getItem("dataDate");
let savedQueryData = {};

if (DATADATE === null || DATADATE != TODAY) {
	localStorage.setItem("dataDate", TODAY);
	localStorage.setItem("savedQueryData", "{}");
} else {
	savedQueryData = JSON.parse(localStorage.getItem("savedQueryData"));
} 

// generic fetch
export const fetchData = async (target = 'std', stations = []) => {
	const where = gatherStations(stations);
	const query = getQuery(target, where);
	
	// let querykey = md5(query);
	let querykey = toHash(query);

	if (typeof savedQueryData[querykey] !== "undefined") {
		drawChart(savedQueryData[querykey]);
		document.getElementById('canvas').classList.remove('h-element--half-transparent');	 
		document.getElementById('loading').classList.add('h-element--hide');
		if (target === 'std') { // actually only on first load ...
			document.getElementById('info').classList.remove('h-element--hide');
		}
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
		
			document.getElementById('canvas').classList.remove('h-element--half-transparent');	 
			document.getElementById('loading').classList.add('h-element--hide');
		
			if (target === 'std') { // actually only on first load ...
				document.getElementById('info').classList.remove('h-element--hide');
			}
		} else { // handle errs
			console.log(response.status, response.statusText);
		}
	}
}

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
						+ config.resource_id + '" ' + where + ' GROUP BY mon ORDER BY mon ASC'; // all 2020
	} // target = 'std' / default
		return '?sql=SELECT SUBSTRING("DATUM", 12, 2) AS hour, SUM("VELO_IN"::INTEGER) as velo, SUM("FUSS_IN"::INTEGER) as fuss from "' 
						+ config.resource_id + '" ' + where + ' GROUP BY hour ORDER BY hour ASC'; // all 2020
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

// used by days
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

// used by months
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
			
	return {'labels': MONTHS.slice(0, fuss_arr.length), // Array.from({length: fuss_arr.length}, (x, i) => (i > 9 ? i : '0' + i)),
					'velo': { 'arr': velo_arr, 'avg': parseInt(velo_total / ((this_mon !== mon || this_year !== 2020) ? velo_arr.length : velo_arr.length - 1)) }, 
					'fuss': { 'arr': fuss_arr, 'avg': parseInt(fuss_total / ((this_mon !== mon || this_year !== 2020) ? fuss_arr.length : fuss_arr.length - 1)) }};
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

	} else { // Handle errors
  	console.log(response.status, response.statusText);
	}
}
