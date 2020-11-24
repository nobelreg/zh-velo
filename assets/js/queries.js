import { drawChart } from './chart.js';

const URL = 'https://data.stadt-zuerich.ch/api/3/action/datastore_search_sql';
const config = { resource_id: 'b9308f85-9066-4f5b-8eab-344c790a6982', }; 	// the resource id (2020 | 2019: '33b3e7d3-f662-43e8-b018-e4b1a254f1f4')

const MONTHS = ['Jan', 'Feb', 'März', 'April', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const WEEKDAYS = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];

const NOW = new Date();
const TODAY = NOW.toISOString().split("T")[0];
const YEAR = NOW.getFullYear();
const DATADATE = localStorage.getItem("zhVelo.dataDate") || null;
let savedQueryData = {};

if (DATADATE === null || DATADATE != TODAY) {
  localStorage.setItem("zhVelo.dataDate", TODAY);
  localStorage.setItem("zhVelo.savedQueryData", "{}");
} else {
  savedQueryData = JSON.parse(localStorage.getItem("zhVelo.savedQueryData"));
} 

let resources = { 
	// `${YEAR - 1}`: '33b3e7d3-f662-43e8-b018-e4b1a254f1f4', 
	// `${YEAR}`: 'b9308f85-9066-4f5b-8eab-344c790a6982', 
	// prev: '33b3e7d3-f662-43e8-b018-e4b1a254f1f4', 
	// curr: 'b9308f85-9066-4f5b-8eab-344c790a6982', 
};


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
      if (target === 'day') {  combination = combineDAY(jsonResponse.result.records);
      } else if (target === 'mon') { combination = combineMON(jsonResponse.result.records);
      } else { // target = 'std' / default
        combination = combineSTD(jsonResponse.result.records);
      }
      savedQueryData[querykey] = combination;
      localStorage.setItem("zhVelo.savedQueryData", JSON.stringify(savedQueryData));
      drawChart(combination);
      setToActive(target);
      
    } else { // handle errs
      console.log(response.status, response.statusText);
    }
  }
  // fetchZaehler(); // 45 fuss | 38 velo
  // fetchResourcesByYear(); // 
}

/* simple hash, for reference storage */
const toHash = (string) => {              
    let hash = 0;
    const len = string.length;
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
  let select = '';
  const fields = 'SUM(COALESCE("VELO_IN"::INTEGER, 0) + COALESCE("VELO_OUT"::INTEGER, 0)) AS velo, SUM(COALESCE("FUSS_IN"::INTEGER, 0) + COALESCE("FUSS_OUT"::INTEGER, 0)) AS fuss';

  let start_date = null;
  if (target == 'day' || target == 'std') {
  	// we select yesterday - 371 (% 7 = 0) days => today - 372 days // 24 * 60 * 60 * 1000 = 86'400'000
		const start_date = new Date(NOW.getTime() - (373 * 86400000)).toISOString().split('T')[0];
		where += (where !== '') ? ' AND "DATUM"::timestamp > \'' + start_date + '\'' : 'WHERE "DATUM"::timestamp > \'' + start_date + '\''; // TODO!
  }
  
  if (target == 'day') {  
		Object.keys(resources).forEach((key, i) => { // for (let key in resources) {
  		select += 'SELECT SUBSTRING("DATUM", 1, 10) AS date, ' + fields + 
            		' FROM "' + resources[key] + '" ' + where + 
            		' GROUP BY date' + 
            		(i === 0 ? ' UNION ' : '');
		});
  	select += ' ORDER BY date ASC;';
    return '?sql=' + encodeURIComponent(select);       
  } else if (target == 'mon') {
		Object.keys(resources).forEach((key, i) => { // for (let key in resources) {
  		select += 'SELECT SUBSTRING("DATUM", 6, 2) AS mon, DATE_PART(\'year\', "DATUM"::timestamp) AS year, ' + fields + 
            		' FROM "' + resources[key] + '" ' + where + 
            		' GROUP BY year, mon' + 
            		(i === 0 ? ' UNION ' : '');
		});
  	select += ' ORDER BY year, mon ASC;';
    return '?sql=' + encodeURIComponent(select);
  } // target = 'std' / default  
	Object.keys(resources).forEach((key, i) => { // for (let key in resources) {
  	select += 'SELECT SUBSTRING("DATUM", 12, 2) AS hour, ' + fields + 
            	' FROM "' + resources[key] + '" ' + where + 
            	' GROUP BY hour' + 
            	(i === 0 ? ' UNION ' : '');
	});
  select += ' ORDER BY hour ASC;';
	return '?sql=' + encodeURIComponent(select);
}

/* aggregation of data and chart labels
used by hours */
const combineSTD = (data) => {
  let velo_arr = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; 
  let fuss_arr = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; let date_arr = [];  
  let velo_total, fuss_total, velo, fuss, hour;
  velo_total = fuss_total = velo = fuss = hour = 0;
	const num_days = 371; // we selected 371 days, above
  
  data.forEach((elm) => { 
    hour = parseInt(elm.hour);
    velo = parseInt(elm.velo / num_days);
    velo_arr[hour] += velo;
    velo_total += velo;
    fuss = parseInt(elm.fuss / num_days);
    fuss_arr[hour] += fuss;
    fuss_total += fuss;
    date_arr[hour] = elm.hour;
  });
  
  return { 'labels': date_arr, 
           'velo': { 'arr': velo_arr, 'avg': parseInt(velo_total / velo_arr.length) }, 
           'fuss': { 'arr': fuss_arr, 'avg': parseInt(fuss_total / fuss_arr.length) }};
}

/* aggregation of data and chart labels
used by days */
const combineDAY = (data) => {
  let velo_arr = [0,0,0,0,0,0,0]; let fuss_arr = [0,0,0,0,0,0,0];  
  let velo_total, fuss_total, velo, fuss; velo_total = fuss_total = velo = fuss = 0;
    
	const num_weeks = 53; // we selected 371 days = 53 weeks
  const maxIndex = data.length - (data.length % 7);
  let wDay = new Date(data[0].date).getDay(); 

  data.forEach((elm, i) => {
    if (i < maxIndex) {
      velo = parseInt(elm.velo / num_weeks); 
      velo_arr[wDay] += velo;
      velo_total += velo;
      fuss = parseInt(elm.fuss / num_weeks); 
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
  let velo_count, fuss_count, velo_total, fuss_total, velo, fuss, mon;
  velo_count =  {2019: 0, 2020: 0};
  fuss_count = {2019: 0, 2020: 0};
  velo_total = fuss_total = velo = fuss = mon = 0;

  const this_day = NOW.getDate(); // day of the month
  const this_mon = NOW.getMonth(); // 0-indexed
  // const this_year = NOW.getFullYear();
 
  data.forEach((elm) => {
    mon = (elm.year !== YEAR) 
    		? parseInt(elm.mon) - 1 // array starts at 0
    		: (parseInt(elm.mon) + 11);

    velo = parseInt(elm.velo);
    velo_arr[mon] = velo;
    fuss = parseInt(elm.fuss);
    fuss_arr[mon] = fuss;
    
    // don't "diffuse" avg with current months temporary data
    if (elm.year === YEAR && elm.mon <= this_mon || 
    		elm.year < YEAR && elm.mon > this_mon) {
    	velo_total += velo;
    	fuss_total += fuss; 
    }
    // avgs / year (for all completed months)
    if (elm.year !== YEAR || elm.mon != this_mon + 1) {
    	velo_count[elm.year] += velo; // avg / year
      fuss_count[elm.year] += fuss; // avg / year
		}	
  });

	return {'labels': [...MONTHS.slice(-12 + this_mon), ...MONTHS.slice(0, velo_arr.length - 12)], // Array.from({length: fuss_arr.length}, (x, i) => (i > 9 ? i : '0' + i)),
          'velo': { 'arr': velo_arr.slice(this_day !== 1 ? -13 : -12), 'avg': parseInt(velo_total / (velo_arr.length - (this_day !== 1 ? 13 : 12))) }, 
          'fuss': { 'arr': fuss_arr.slice(this_day !== 1 ? -13 : -12), 'avg': parseInt(fuss_total / (fuss_arr.length - (this_day !== 1 ? 13 : 12))) }};
}

/* displays previously hidden (or half-transparent) elements */
const setToActive = (target) => {
  document.getElementById('canvas').classList.remove('h-element--half-transparent');   
  document.getElementById('loading').classList.add('h-element--hide');

  if (target === 'std') { // actually only on first load ...
    document.getElementById('info').classList.remove('h-element--hide');
  }
}

export const setResourcesAndFetch = async (target = 'std') => {
  const packageURL = 'https://data.stadt-zuerich.ch/api/3/action/package_search?q=verkehrszaehlungen_werte_fussgaenger_velo';
  // const this_year = NOW.getFullYear();
  let elm_year = 0;
   
  const response = await fetch(packageURL);
  if (response.status >= 200 && response.status <= 299) {
    const jsonResponse = await response.json();
    // console.log(jsonResponse.result.results, jsonResponse);
    if (jsonResponse.result.results[0] && jsonResponse.result.results[0].name === 'ted_taz_verkehrszaehlungen_werte_fussgaenger_velo') {
      const list = jsonResponse.result.results[0].resources;
      list.forEach((elm, i) => {
        if (elm.format === 'CSV') { // there will be a new db each year ...
        	elm_year = elm.name.substr(0, 4);
        	if (elm_year == YEAR || elm_year == YEAR - 1) {
        		resources[elm_year] = elm.id;
        	} // console.log(elm.name.substr(0, 4), elm.id);
        }
      }); // when we're done...
      fetchData(target);
    }  
  } else { // Handle errors
    console.log(response.status, response.statusText);
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
    // console.log(jsonResponse.result.records.length, jsonResponse);
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

/* convenience */
const fetchResourcesByYear = async () => {
  // we want:
  // https://data.stadt-zuerich.ch/api/3/action/package_search?q=verkehrszaehlungen_werte_fussgaenger_velo
  const packageURL = 'https://data.stadt-zuerich.ch/api/3/action/package_search?q=verkehrszaehlungen_werte_fussgaenger_velo';
   
  const response = await fetch(packageURL);
  if (response.status >= 200 && response.status <= 299) {
    const jsonResponse = await response.json();
    // console.log(jsonResponse.result.results, jsonResponse);
    if (jsonResponse.result.results[0] && jsonResponse.result.results[0].name === 'ted_taz_verkehrszaehlungen_werte_fussgaenger_velo') {
      const resources = jsonResponse.result.results[0].resources;
      resources.forEach((elm, i) => {
        if (elm.format === 'CSV') { // there will be a new db each year ...
          console.log(elm.name.substr(0, 4), elm.id);
        }
      });
    }  
  } else { // Handle errors
    console.log(response.status, response.statusText);
  }
}


