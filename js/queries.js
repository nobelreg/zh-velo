import { drawChart } from './chart.js';

const url = 'https://data.stadt-zuerich.ch/api/3/action/datastore_search_sql';
const config = {
	resource_id: 'b9308f85-9066-4f5b-8eab-344c790a6982', // the resource id
};

const months = ['Jan', 'Feb', 'März', 'April', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const weekdays = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];

// displaying hours
export const fetchYesterday = async (stations = '') => {

	let where = gatherStations(stations);
	
	// all year, options: yesterday, this / last month
	let query = '?sql=SELECT SUBSTRING("DATUM", 12, 2) AS hour, SUM("VELO_IN"::INTEGER) as velo, SUM("FUSS_IN"::INTEGER) as fuss from "' 
						+ config.resource_id + '" ' + where + ' GROUP BY hour'; // all 2020

  // const response = await fetch(url + query);
  
  return await fetch(url + query)
			.then(resp => resp.json()) // Transform the data into json 
			.then((jsonResponse) => {
				let combination = combineHours(jsonResponse.result.records);
				drawChart(combination);
				console.log(jsonResponse.result.records.length, jsonResponse)
				
				// document.getElementById('canvas').classList.remove('h-element--invisible'); // .h-element--half-transparent		
				document.getElementById('canvas').classList.remove('h-element--half-transparent');	
				document.getElementById('loading').classList.add('h-element--hide');
				// only the first time ...
				document.getElementById('info').classList.remove('h-element--hide');
			}); 
}

// used by hours
const combineHours = (data) => {
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

const gatherStations = (stations) => {
	let where = '';
	if (stations.length > 0) {
		where = ' WHERE "FK_ZAEHLER" IN(' + stations.filter((el) => {
  			return el != null;
			}).toString() + ') ';
	}
	return where;
}

// displaying months
export const fetchYearByMonths = async (stations = []) => {
	const where = gatherStations(stations);
	const query = '?sql=SELECT SUBSTRING("DATUM", 6, 2) AS mon, SUM("VELO_IN"::INTEGER) as velo, SUM("FUSS_IN"::INTEGER) as fuss from "' 
							+ config.resource_id + '" ' + where + ' GROUP BY mon'; // all 2020
 	 	
  const response = await fetch(url + query);
	if (response.status >= 200 && response.status <= 299) {
  	const jsonResponse = await response.json();
		console.log(jsonResponse.result.records.length, jsonResponse);
		
		const combination = combineMonths(jsonResponse.result.records);
		drawChart(combination);
		
		// document.getElementById('canvas').classList.remove('h-element--invisible'); // .h-element--half-transparent		
		document.getElementById('canvas').classList.remove('h-element--half-transparent');	 
		document.getElementById('loading').classList.add('h-element--hide');
	} else {
  	// Handle errors
  	console.log(response.status, response.statusText);
	}
}

// used by months
const combineMonths = (data) => {
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
	
	return {'labels': months.slice(0, fuss_arr.length), // Array.from({length: fuss_arr.length}, (x, i) => (i > 9 ? i : '0' + i)),
					'velo': { 'arr': velo_arr, 'avg': parseInt(velo_total / velo_arr.length) }, 
					'fuss': { 'arr': fuss_arr, 'avg': parseInt(fuss_total / fuss_arr.length) }};
}

// displaying days
export const fetchLastWeek = async (stations = []) => {

	// const query = '?sql=SELECT SUBSTRING("DATUM", 1, 10) AS date, SUM("VELO_IN"::INTEGER) as velo, SUM("FUSS_IN"::INTEGER) as fuss from "' + config.resource_id + '" GROUP BY date ORDER BY date ASC';
	// const query = '?sql=SELECT SUBSTRING("DATUM", 1, 10) AS date, SUM("VELO_IN"::INTEGER) as velo, SUM("FUSS_IN"::INTEGER) as fuss from "' + config.resource_id + '" WHERE "DATUM" LIKE \'2020-10%\' GROUP BY date ORDER BY date ASC';
	const where = gatherStations(stations);
	const query = '?sql=SELECT SUBSTRING("DATUM", 1, 10) AS date, SUM("VELO_IN"::INTEGER) as velo, SUM("FUSS_IN"::INTEGER) as fuss from "' 
	// + config.resource_id + '" WHERE "DATUM" LIKE \'2020-10%\' OR "DATUM" LIKE \'2020-09%\' GROUP BY date ORDER BY date ASC';
							+ config.resource_id + '" ' + where + ' GROUP BY date ORDER BY date ASC';

  const response = await fetch(url + query);
	if (response.status >= 200 && response.status <= 299) {
  	const jsonResponse = await response.json();
		console.log(jsonResponse.result.records.length, jsonResponse);
		// const combination = combineDays(jsonResponse.result.records);
		const combination = combineWeekDays(jsonResponse.result.records);

		drawChart(combination);
		
		// document.getElementById('canvas').classList.remove('h-element--invisible'); // .h-element--half-transparent		
		document.getElementById('canvas').classList.remove('h-element--half-transparent');	
		document.getElementById('loading').classList.add('h-element--hide');
	} else { // Handle errors
  	console.log(response.status, response.statusText);
	}
}

const combineWeekDays = (data) => {
	let velo_arr = [0,0,0,0,0,0,0]; 
	let fuss_arr = [0,0,0,0,0,0,0];	
	// let date_arr = [];	
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

  return { 'labels': weekdays, 
					 'velo': { 'arr': velo_arr, 'avg': parseInt(velo_total / velo_arr.length) }, 
  				 'fuss': { 'arr': fuss_arr, 'avg': parseInt(fuss_total / fuss_arr.length) }};
}

const combineDays = (data) => {
	let velo_arr = []; let fuss_arr = [];	let date_arr = [];	
	let velo_total, fuss_total; velo_total = fuss_total = 0;

	data.forEach((elm, i) => {
		velo_arr[i] = elm.velo;
		velo_total += elm.velo;
		fuss_arr[i] = elm.fuss;
		fuss_total += elm.fuss;
		date_arr[i] = elm.date;
	});

  return { 'labels': date_arr, 
					 'velo': { 'arr': velo_arr, 'avg': parseInt(velo_total / velo_arr.length) }, 
  				 'fuss': { 'arr': fuss_arr, 'avg': parseInt(fuss_total / fuss_arr.length) }};
}
